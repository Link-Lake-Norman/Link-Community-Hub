import {
  del,
  put
} from "@vercel/blob";

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

const TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
  ]);

function validUuid(value) {
  return UUID.test(
    clean(value, 80)
  );
}

function decode(dataUrl) {
  const match =
    String(dataUrl || "")
      .match(
        /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/
      );

  if (
    !match ||
    !TYPES.has(match[1])
  ) {
    throw new Error(
      "Use a PNG, JPG or WebP flyer."
    );
  }

  return {
    type: match[1],
    buffer:
      Buffer.from(
        match[2],
        "base64"
      )
  };
}

function extension(type) {
  if (type === "image/png") {
    return "png";
  }

  if (type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

async function bestEffortDelete(url) {
  if (!url) {
    return;
  }

  try {
    await del(url);
  } catch (error) {
    console.warn(
      "LINK event flyer cleanup:",
      error?.message || error
    );
  }
}

export default async function handler(
  req,
  res
) {
  noStore(res);

  if (req.method !== "POST") {
    res.setHeader(
      "Allow",
      "POST"
    );

    fail(
      res,
      405,
      "Method not allowed."
    );

    return;
  }

  if (
    !process.env
      .BLOB_READ_WRITE_TOKEN
  ) {
    fail(
      res,
      503,
      "Flyer storage is not configured."
    );

    return;
  }

  const auth =
    await session(req, res);

  if (!auth) {
    return;
  }

  try {
    const body = parse(req);

    const {
      db,
      org
    } = auth;

    const action =
      clean(
        body.action,
        30
      ) || "upload";

    if (action === "delete") {
      const assetId =
        clean(
          body.assetId,
          80
        );

      if (!validUuid(assetId)) {
        fail(
          res,
          400,
          "Choose a valid flyer."
        );

        return;
      }

      const rows =
        await db`
          SELECT
            id,
            storage_url
          FROM organization_assets
          WHERE
            id = ${assetId}
            AND organization_id =
              ${org.organization_id}
            AND asset_type =
              'event-flyer'
          LIMIT 1
        `;

      if (!rows.length) {
        fail(
          res,
          404,
          "Flyer not found."
        );

        return;
      }

      await bestEffortDelete(
        rows[0].storage_url
      );

      await db`
        DELETE FROM
          organization_assets
        WHERE
          id = ${assetId}
          AND organization_id =
            ${org.organization_id}
          AND asset_type =
            'event-flyer'
      `;

      res.status(200).json({
        ok: true,
        message:
          "Flyer removed."
      });

      return;
    }

    const eventId =
      clean(
        body.eventId,
        80
      );

    if (!validUuid(eventId)) {
      fail(
        res,
        400,
        "Choose an event before uploading a flyer."
      );

      return;
    }

    const eventRows =
      await db`
        SELECT id
        FROM organization_events
        WHERE
          id = ${eventId}
          AND organization_id =
            ${org.organization_id}
          AND status <> 'removed'
        LIMIT 1
      `;

    if (!eventRows.length) {
      fail(
        res,
        404,
        "Event not found."
      );

      return;
    }

    if (
      body.authorizationConfirmed !==
      true
    ) {
      fail(
        res,
        400,
        "Confirm your organization has permission to share this flyer."
      );

      return;
    }

    const minors =
      body.minorsPresent === true;

    const minorsConsent =
      body
        .minorsConsentConfirmed ===
      true;

    if (
      minors &&
      !minorsConsent
    ) {
      fail(
        res,
        400,
        "Confirm appropriate publication consent for identifiable minors shown on the flyer."
      );

      return;
    }

    const decoded =
      decode(body.dataUrl);

    if (
      decoded.buffer.length >
      4_000_000
    ) {
      fail(
        res,
        413,
        "Please use a flyer under 4 MB."
      );

      return;
    }

    const path =
      "nonprofit-event-flyers/" +
      org.organization_id +
      "/" +
      eventId +
      "/" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2, 9) +
      "." +
      extension(decoded.type);

    const blob =
      await put(
        path,
        decoded.buffer,
        {
          access: "public",
          contentType:
            decoded.type
        }
      );

    const rows =
      await db`
        INSERT INTO organization_assets (
          organization_id,
          event_id,
          asset_type,
          file_name,
          storage_url,
          blob_pathname,
          mime_type,
          file_size_bytes,
          authorization_confirmed,
          approved,
          alt_text,
          caption,
          public_site_allowed,
          newsletter_allowed,
          minors_present,
          minors_consent_confirmed,
          uploaded_by_contact_id,
          updated_at
        )
        VALUES (
          ${org.organization_id},
          ${eventId},
          'event-flyer',
          ${clean(body.fileName, 240) || 'event-flyer'},
          ${blob.url},
          ${blob.pathname || path},
          ${decoded.type},
          ${decoded.buffer.length},
          true,
          false,
          ${clean(body.altText, 200) || null},
          ${clean(body.caption, 500) || null},
          true,
          ${body.newsletterAllowed === true},
          ${minors},
          ${minorsConsent},
          ${org.contact_id},
          now()
        )
        RETURNING
          id,
          event_id,
          storage_url,
          approved
      `;

    res.status(201).json({
      ok: true,
      flyer: rows[0],
      message:
        "Flyer uploaded and submitted for LINK approval."
    });
  } catch (error) {
    console.error(
      "LINK event flyer error:",
      error
    );

    fail(
      res,
      500,
      error?.message ||
        "Flyer could not be uploaded."
    );
  }
}
