import {
  fail,
  noStore,
  parse,
  session
} from "./_auth.js";

const clean = (value, max = 1000) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validUuid(value) {
  return UUID.test(clean(value, 80));
}

function dateValue(value, required = false) {
  const text = clean(value, 80);

  if (!text) {
    if (required) {
      throw new Error(
        "Event start date and time are required."
      );
    }

    return null;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "Use a valid event date and time."
    );
  }

  return date.toISOString();
}

function urlValue(value) {
  const text = clean(value, 600);

  if (!text) {
    return null;
  }

  let url;

  try {
    url = new URL(text);
  } catch {
    throw new Error(
      "Use a complete event link beginning with https:// or http://."
    );
  }

  if (
    url.protocol !== "https:" &&
    url.protocol !== "http:"
  ) {
    throw new Error(
      "Use a valid public event link."
    );
  }

  return url.toString();
}

async function eventList(db, organizationId) {
  const events = await db`
    SELECT
      id,
      title,
      description,
      category,
      event_url,
      location_name,
      address_line1,
      city,
      state,
      postal_code,
      latitude,
      longitude,
      starts_at,
      ends_at,
      status,
      featured,
      source_type,
      source_url,
      created_at,
      updated_at
    FROM organization_events
    WHERE organization_id = ${organizationId}
    ORDER BY
      starts_at DESC,
      created_at DESC
    LIMIT 100
  `;

  const ids = events.map(
    row => row.id
  );

  let flyers = [];

  if (ids.length) {
    flyers = await db`
      SELECT
        id,
        event_id,
        file_name,
        storage_url,
        mime_type,
        approved,
        alt_text,
        caption,
        public_site_allowed,
        newsletter_allowed,
        created_at
      FROM organization_assets
      WHERE
        organization_id = ${organizationId}
        AND event_id = ANY(${ids}::uuid[])
        AND asset_type = 'event-flyer'
      ORDER BY created_at DESC
    `;
  }

  const flyerMap = new Map();

  flyers.forEach(flyer => {
    const key = String(
      flyer.event_id
    );

    if (!flyerMap.has(key)) {
      flyerMap.set(key, []);
    }

    flyerMap.get(key).push(
      flyer
    );
  });

  return events.map(event => ({
    ...event,

    flyers:
      flyerMap.get(
        String(event.id)
      ) || []
  }));
}

export default async function handler(
  req,
  res
) {
  noStore(res);

  const allowed =
    new Set([
      "GET",
      "POST",
      "PATCH",
      "DELETE"
    ]);

  if (!allowed.has(req.method)) {
    res.setHeader(
      "Allow",
      "GET, POST, PATCH, DELETE"
    );

    fail(
      res,
      405,
      "Method not allowed."
    );

    return;
  }

  const auth =
    await session(req, res);

  if (!auth) {
    return;
  }

  const {
    db,
    org
  } = auth;

  try {
    if (req.method === "GET") {
      const events =
        await eventList(
          db,
          org.organization_id
        );

      res.status(200).json({
        ok: true,
        events
      });

      return;
    }

    const body = parse(req);

    if (req.method === "POST") {
      const title =
        clean(body.title, 180);

      if (!title) {
        fail(
          res,
          400,
          "Event title is required."
        );

        return;
      }

      const startsAt =
        dateValue(
          body.startsAt,
          true
        );

      const endsAt =
        dateValue(
          body.endsAt,
          false
        );

      if (
        endsAt &&
        new Date(endsAt) <
          new Date(startsAt)
      ) {
        fail(
          res,
          400,
          "Event end time cannot be before the start time."
        );

        return;
      }

      const eventUrl =
        urlValue(body.eventUrl);

      const rows = await db`
        INSERT INTO organization_events (
          organization_id,
          title,
          description,
          category,
          event_url,
          location_name,
          address_line1,
          city,
          state,
          postal_code,
          starts_at,
          ends_at,
          status,
          featured,
          source_type,
          source_url,
          submitted_by_contact_id,
          updated_at
        )
        VALUES (
          ${org.organization_id},
          ${title},
          ${clean(body.description, 4000) || null},
          ${clean(body.category, 120) || null},
          ${eventUrl},
          ${clean(body.locationName, 240) || null},
          ${clean(body.addressLine1, 300) || null},
          ${clean(body.city, 160) || null},
          ${clean(body.state, 80) || null},
          ${clean(body.postalCode, 30) || null},
          ${startsAt},
          ${endsAt},
          'pending-review',
          false,
          'portal',
          ${eventUrl},
          ${org.contact_id},
          now()
        )
        RETURNING *
      `;

      res.status(201).json({
        ok: true,
        event: rows[0],
        message:
          "Event submitted for LINK approval."
      });

      return;
    }

    const eventId =
      clean(body.eventId, 80);

    if (!validUuid(eventId)) {
      fail(
        res,
        400,
        "Choose a valid event."
      );

      return;
    }

    const existing =
      await db`
        SELECT
          id,
          status
        FROM organization_events
        WHERE
          id = ${eventId}
          AND organization_id =
            ${org.organization_id}
        LIMIT 1
      `;

    if (!existing.length) {
      fail(
        res,
        404,
        "Event not found."
      );

      return;
    }

    if (req.method === "DELETE") {
      await db`
        UPDATE organization_events
        SET
          status = 'removed',
          featured = false,
          updated_at = now()
        WHERE
          id = ${eventId}
          AND organization_id =
            ${org.organization_id}
      `;

      res.status(200).json({
        ok: true,
        message:
          "Event removed from public consideration."
      });

      return;
    }

    const title =
      clean(body.title, 180);

    if (!title) {
      fail(
        res,
        400,
        "Event title is required."
      );

      return;
    }

    const startsAt =
      dateValue(
        body.startsAt,
        true
      );

    const endsAt =
      dateValue(
        body.endsAt,
        false
      );

    if (
      endsAt &&
      new Date(endsAt) <
        new Date(startsAt)
    ) {
      fail(
        res,
        400,
        "Event end time cannot be before the start time."
      );

      return;
    }

    const eventUrl =
      urlValue(body.eventUrl);

    const rows = await db`
      UPDATE organization_events
      SET
        title =
          ${title},
        description =
          ${clean(body.description, 4000) || null},
        category =
          ${clean(body.category, 120) || null},
        event_url =
          ${eventUrl},
        location_name =
          ${clean(body.locationName, 240) || null},
        address_line1 =
          ${clean(body.addressLine1, 300) || null},
        city =
          ${clean(body.city, 160) || null},
        state =
          ${clean(body.state, 80) || null},
        postal_code =
          ${clean(body.postalCode, 30) || null},
        starts_at =
          ${startsAt},
        ends_at =
          ${endsAt},
        status =
          'pending-review',
        featured =
          false,
        approved_at =
          NULL,
        approved_by =
          NULL,
        source_type =
          'portal',
        source_url =
          ${eventUrl},
        submitted_by_contact_id =
          ${org.contact_id},
        updated_at =
          now()
      WHERE
        id = ${eventId}
        AND organization_id =
          ${org.organization_id}
      RETURNING *
    `;

    res.status(200).json({
      ok: true,
      event: rows[0],
      message:
        "Event updated and returned to LINK for approval."
    });
  } catch (error) {
    console.error(
      "LINK nonprofit event error:",
      error
    );

    fail(
      res,
      500,
      error?.message ||
        "Event could not be saved."
    );
  }
}
