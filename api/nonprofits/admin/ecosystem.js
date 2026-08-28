import { neon } from "@neondatabase/serverless";
import { requireLinkAdmin } from "./_auth.js";

export default async function handler(req, res) {
  if (!requireLinkAdmin(req, res)) {
    return;
  }

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );

  if (req.method !== "GET") {
    res.setHeader(
      "Allow",
      "GET"
    );

    return res.status(405).json({
      ok: false,
      error: "Method not allowed."
    });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({
      ok: false,
      error: "Database is not configured."
    });
  }

  try {
    const sql =
      neon(
        process.env.DATABASE_URL
      );

    const [
      nonprofits,
      businesses,
      community,
      resources,
      resourceRequests,
      events,
      media,
      submissions
    ] = await Promise.all([

      /* =====================================================
         NONPROFIT MASTER RECORDS
         ===================================================== */

      sql`
        SELECT
          o.*,

          COALESCE(
            (
              SELECT
                jsonb_agg(
                  to_jsonb(c)
                  ORDER BY
                    c.is_primary DESC,
                    c.created_at ASC
                )
              FROM
                organization_contacts c
              WHERE
                c.organization_id = o.id
            ),
            '[]'::jsonb
          ) AS contacts,

          COALESCE(
            (
              SELECT
                jsonb_agg(
                  to_jsonb(sa)
                )
              FROM
                organization_service_areas sa
              WHERE
                sa.organization_id = o.id
            ),
            '[]'::jsonb
          ) AS service_areas,

          COALESCE(
            (
              SELECT
                jsonb_agg(
                  to_jsonb(n)
                  ORDER BY
                    n.created_at DESC
                )
              FROM
                organization_needs n
              WHERE
                n.organization_id = o.id
            ),
            '[]'::jsonb
          ) AS needs,

          COALESCE(
            (
              SELECT
                jsonb_agg(
                  to_jsonb(op)
                  ORDER BY
                    op.created_at DESC
                )
              FROM
                organization_opportunities op
              WHERE
                op.organization_id = o.id
            ),
            '[]'::jsonb
          ) AS opportunities,

          COALESCE(
            (
              SELECT
                jsonb_agg(
                  to_jsonb(a)
                  ORDER BY
                    a.created_at DESC
                )
              FROM
                organization_assets a
              WHERE
                a.organization_id = o.id
            ),
            '[]'::jsonb
          ) AS assets,

          COALESCE(
            (
              SELECT
                jsonb_agg(
                  to_jsonb(ev)
                  ORDER BY
                    ev.starts_at DESC
                )
              FROM
                organization_events ev
              WHERE
                ev.organization_id = o.id
            ),
            '[]'::jsonb
          ) AS events,

          (
            SELECT
              to_jsonb(s)

            FROM
              nonprofit_submissions s

            WHERE
              s.organization_id = o.id

              OR
              lower(
                trim(
                  s.organization_name
                )
              ) =
              lower(
                trim(
                  o.display_name
                )
              )

            ORDER BY
              s.submitted_at DESC

            LIMIT 1
          ) AS latest_submission

        FROM
          organizations o

        ORDER BY
          o.display_name ASC
      `,


      /* =====================================================
         BUSINESS MASTER RECORDS
         ===================================================== */

      sql`
        SELECT
          b.*,

          (
            SELECT
              to_jsonb(m)

            FROM
              hub_business_impact_metrics m

            WHERE
              m.business_id = b.id

            LIMIT 1
          ) AS impact,

          COALESCE(
            (
              SELECT
                jsonb_agg(
                  to_jsonb(s)
                  ORDER BY
                    s.created_at DESC
                )

              FROM
                hub_business_services s

              WHERE
                s.business_id = b.id
            ),
            '[]'::jsonb
          ) AS services,

          COALESCE(
            (
              SELECT
                jsonb_agg(
                  to_jsonb(r)
                  ORDER BY
                    r.created_at DESC
                )

              FROM
                hub_resource_items r

              WHERE
                r.business_id = b.id
            ),
            '[]'::jsonb
          ) AS resources

        FROM
          hub_business_accounts b

        ORDER BY
          b.business_name ASC
      `,


      /* =====================================================
         COMMUNITY PARTICIPANTS
         ===================================================== */

      sql`
        SELECT
          *

        FROM
          hub_participant_profiles

        ORDER BY
          participant_type ASC,
          display_name ASC
      `,


      /* =====================================================
         RESOURCE ITEMS
         ===================================================== */

      sql`
        SELECT
          r.*,
          b.business_name,

          COALESCE(
            (
              SELECT
                jsonb_agg(
                  to_jsonb(i)
                  ORDER BY
                    i.sort_order ASC
                )

              FROM
                hub_resource_item_images i

              WHERE
                i.item_id = r.id
            ),
            '[]'::jsonb
          ) AS images

        FROM
          hub_resource_items r

        LEFT JOIN
          hub_business_accounts b
            ON b.id = r.business_id

        ORDER BY
          r.created_at DESC
      `,


      /* =====================================================
         RESOURCE REQUESTS
         ===================================================== */

      sql`
        SELECT
          rr.*,
          ri.title AS resource_title,
          b.business_name,
          o.display_name AS nonprofit_name

        FROM
          hub_resource_requests rr

        LEFT JOIN
          hub_resource_items ri
            ON ri.id = rr.item_id

        LEFT JOIN
          hub_business_accounts b
            ON b.id = rr.business_id

        LEFT JOIN
          organizations o
            ON o.id = rr.nonprofit_organization_id

        ORDER BY
          rr.requested_at DESC
      `,


      /* =====================================================
         EVENTS
         ===================================================== */

      sql`
        SELECT
          e.*,
          o.display_name AS organization_name

        FROM
          organization_events e

        LEFT JOIN
          organizations o
            ON o.id = e.organization_id

        ORDER BY
          e.starts_at DESC
      `,


      /* =====================================================
         MEDIA
         ===================================================== */

      sql`
        SELECT
          a.*,
          o.display_name AS organization_name

        FROM
          organization_assets a

        LEFT JOIN
          organizations o
            ON o.id = a.organization_id

        ORDER BY
          a.created_at DESC
      `,


      /* =====================================================
         ORIGINAL NONPROFIT SUBMISSIONS
         ===================================================== */

      sql`
        SELECT
          *

        FROM
          nonprofit_submissions

        ORDER BY
          submitted_at DESC
      `
    ]);


    return res.status(200).json({
      ok: true,

      generatedAt:
        new Date().toISOString(),

      stats: {
        nonprofits:
          nonprofits.length,

        businesses:
          businesses.length,

        community:
          community.length,

        resources:
          resources.length,

        resourceRequests:
          resourceRequests.length,

        events:
          events.length,

        media:
          media.length,

        submissions:
          submissions.length
      },

      nonprofits,
      businesses,
      community,
      resources,
      resourceRequests,
      events,
      media,
      submissions
    });

  } catch (error) {
    console.error(
      "LINK ecosystem records API:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        "Unable to load ecosystem records."
    });
  }
}
