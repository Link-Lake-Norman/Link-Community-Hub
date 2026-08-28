import {
  neon
} from "@neondatabase/serverless";

import {
  requireLinkAdmin
} from "./_auth.js";

const clean = (value, max = 1000) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(
  res,
  status,
  error
) {
  res.status(status).json({
    ok: false,
    error
  });
}

function parse(req) {
  return typeof req.body ===
    "string"
    ? JSON.parse(
        req.body || "{}"
      )
    : req.body || {};
}

export default async function handler(
  req,
  res
) {
  res.setHeader(
    "Cache-Control",
    "no-store, max-age=0"
  );

  if (
    req.method !== "GET" &&
    req.method !== "PATCH"
  ) {
    res.setHeader(
      "Allow",
      "GET, PATCH"
    );

    fail(
      res,
      405,
      "Method not allowed."
    );

    return;
  }

  if (
    !requireLinkAdmin(
      req,
      res
    )
  ) {
    return;
  }

  if (
    !process.env.DATABASE_URL
  ) {
    fail(
      res,
      503,
      "LINK database is not configured."
    );

    return;
  }

  const db =
    neon(
      process.env.DATABASE_URL
    );

  try {
    if (req.method === "GET") {
      const rows =
        await db`
          SELECT
            e.id,
            e.organization_id,
            e.title,
            e.description,
            e.category,
            e.event_url,
            e.location_name,
            e.address_line1,
            e.city,
            e.state,
            e.postal_code,
            e.latitude,
            e.longitude,
            e.starts_at,
            e.ends_at,
            e.status,
            e.featured,
            e.source_type,
            e.source_url,
            e.source_checked_at,
            e.created_at,
            e.updated_at,
            o.display_name,
            o.slug,

            (
              SELECT a.storage_url
              FROM organization_assets a
              WHERE
                a.event_id = e.id
                AND a.asset_type =
                  'event-flyer'
              ORDER BY
                a.created_at DESC
              LIMIT 1
            ) AS flyer_url,

            (
              SELECT a.approved
              FROM organization_assets a
              WHERE
                a.event_id = e.id
                AND a.asset_type =
                  'event-flyer'
              ORDER BY
                a.created_at DESC
              LIMIT 1
            ) AS flyer_approved

          FROM organization_events e

          JOIN organizations o
            ON o.id =
              e.organization_id

          ORDER BY
            CASE
              WHEN e.status =
                'pending-review'
              THEN 0
              ELSE 1
            END,
            e.starts_at DESC,
            e.created_at DESC

          LIMIT 300
        `;

      res.status(200).json({
        ok: true,
        events: rows
      });

      return;
    }

    const body = parse(req);

    const eventId =
      clean(
        body.eventId,
        80
      );

    if (!UUID.test(eventId)) {
      fail(
        res,
        400,
        "Choose a valid event."
      );

      return;
    }

    const action =
      clean(
        body.action,
        40
      );

    const found =
      await db`
        SELECT
          id,
          status
        FROM organization_events
        WHERE id = ${eventId}
        LIMIT 1
      `;

    if (!found.length) {
      fail(
        res,
        404,
        "Event not found."
      );

      return;
    }

    if (action === "approve") {
      await db`
        UPDATE organization_events
        SET
          status = 'approved',
          approved_at = now(),
          approved_by =
            'LINK Admin',
          updated_at = now()
        WHERE id = ${eventId}
      `;

      await db`
        UPDATE organization_assets
        SET
          approved = true,
          approved_at = now(),
          approved_by =
            'LINK Admin',
          updated_at = now()
        WHERE
          event_id = ${eventId}
          AND asset_type =
            'event-flyer'
          AND authorization_confirmed =
            true
          AND (
            minors_present = false
            OR
            minors_consent_confirmed =
              true
          )
      `;

      res.status(200).json({
        ok: true,
        message:
          "Event approved and published."
      });

      return;
    }

    if (action === "reject") {
      await db`
        UPDATE organization_events
        SET
          status = 'rejected',
          featured = false,
          approved_at = NULL,
          approved_by = NULL,
          updated_at = now()
        WHERE id = ${eventId}
      `;

      await db`
        UPDATE organization_assets
        SET
          approved = false,
          approved_at = NULL,
          approved_by = NULL,
          updated_at = now()
        WHERE
          event_id = ${eventId}
          AND asset_type =
            'event-flyer'
      `;

      res.status(200).json({
        ok: true,
        message:
          "Event rejected."
      });

      return;
    }

    if (action === "feature") {
      const enabled =
        body.featured === true;

      const approved =
        await db`
          SELECT id
          FROM organization_events
          WHERE
            id = ${eventId}
            AND status =
              'approved'
          LIMIT 1
        `;

      if (
        enabled &&
        !approved.length
      ) {
        fail(
          res,
          400,
          "Approve the event before featuring it."
        );

        return;
      }

      await db`
        UPDATE organization_events
        SET
          featured = ${enabled},
          updated_at = now()
        WHERE id = ${eventId}
      `;

      res.status(200).json({
        ok: true,
        message:
          enabled
            ? "Event featured."
            : "Event removed from featured events."
      });

      return;
    }

    if (action === "archive") {
      await db`
        UPDATE organization_events
        SET
          status = 'archived',
          featured = false,
          updated_at = now()
        WHERE id = ${eventId}
      `;

      res.status(200).json({
        ok: true,
        message:
          "Event archived."
      });

      return;
    }

    fail(
      res,
      400,
      "Choose a valid event action."
    );
  } catch (error) {
    console.error(
      "LINK admin events error:",
      error
    );

    fail(
      res,
      500,
      "Event review could not be completed."
    );
  }
}
