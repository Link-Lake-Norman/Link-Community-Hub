import {
  neon
} from "@neondatabase/serverless";

export default async function handler(
  req,
  res
) {
  if (req.method !== "GET") {
    res.setHeader(
      "Allow",
      "GET"
    );

    res.status(405).json({
      ok: false,
      error:
        "Method not allowed."
    });

    return;
  }

  if (
    !process.env.DATABASE_URL
  ) {
    res.status(503).json({
      ok: false,
      error:
        "Community events are temporarily unavailable."
    });

    return;
  }

  try {
    const db =
      neon(
        process.env.DATABASE_URL
      );

    const events =
      await db`
        SELECT
          e.id,
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
          e.featured,
          e.source_type,

          o.display_name
            AS organization_name,

          o.slug
            AS organization_slug,

          (
            SELECT a.storage_url
            FROM organization_assets a
            WHERE
              a.organization_id =
                o.id
              AND a.asset_type =
                'logo'
              AND a.approved =
                true
            ORDER BY
              a.created_at DESC
            LIMIT 1
          ) AS organization_logo_url,

          (
            SELECT a.storage_url
            FROM organization_assets a
            WHERE
              a.event_id =
                e.id
              AND a.asset_type =
                'event-flyer'
              AND a.approved =
                true
              AND
                a.authorization_confirmed =
                  true
              AND
                a.public_site_allowed =
                  true
              AND (
                a.minors_present =
                  false
                OR
                a.minors_consent_confirmed =
                  true
              )
            ORDER BY
              a.created_at DESC
            LIMIT 1
          ) AS flyer_url,

          (
            SELECT a.alt_text
            FROM organization_assets a
            WHERE
              a.event_id =
                e.id
              AND a.asset_type =
                'event-flyer'
              AND a.approved =
                true
              AND
                a.public_site_allowed =
                  true
            ORDER BY
              a.created_at DESC
            LIMIT 1
          ) AS flyer_alt_text

        FROM organization_events e

        JOIN organizations o
          ON o.id =
            e.organization_id

        WHERE
          e.status =
            'approved'

          AND o.active =
            true

          AND o.approval_status =
            'approved'

          AND o.public_status =
            'public'

          AND o.service_area_verified =
            true

          AND (
            (
              e.ends_at
                IS NOT NULL
              AND
              e.ends_at >= now()
            )

            OR

            (
              e.ends_at
                IS NULL
              AND
              (
                e.starts_at
                  AT TIME ZONE
                    'America/New_York'
              )::date
              >=
              (
                now()
                  AT TIME ZONE
                    'America/New_York'
              )::date
            )
          )

        ORDER BY
          e.featured DESC,
          e.starts_at ASC,
          lower(o.display_name)
      `;

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );

    res.status(200).json({
      ok: true,
      events
    });
  } catch (error) {
    console.error(
      "LINK public events error:",
      error
    );

    res.status(500).json({
      ok: false,
      error:
        "Community events could not be loaded."
    });
  }
}
