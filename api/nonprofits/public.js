import { neon } from "@neondatabase/serverless";

function fail(res, status, message) {
  res.status(status).json({
    ok: false,
    error: message
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    fail(res, 405, "Method not allowed.");
    return;
  }

  if (!process.env.DATABASE_URL) {
    fail(res, 503, "LINK database is not configured.");
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const organizations = await sql`
      SELECT
        o.id,
        o.display_name,
        o.slug,
        o.website_url,
        o.public_email,
        o.public_phone,
        o.mission,
        o.category,
        o.who_they_serve,
        o.address_line1,
        o.address_line2,
        o.city,
        o.state,
        o.postal_code,
        o.latitude,
        o.longitude,
        o.located_in_service_area,
        o.serves_service_area,
        o.service_area_verified,
        o.last_verified_at,
        o.renewal_due_at,
        o.renewal_status,

        (
          SELECT a.storage_url
          FROM organization_assets a
          WHERE
            a.organization_id = o.id
            AND a.asset_type = 'logo'
            AND a.approved = true
          ORDER BY a.created_at DESC
          LIMIT 1
        ) AS logo_url

      FROM organizations o

      WHERE
        o.active = true
        AND o.approval_status = 'approved'
        AND o.public_status = 'public'
        AND o.service_area_verified = true

      ORDER BY
        lower(o.display_name),
        o.display_name
    `;

    const ids = organizations.map(row => row.id);

    if (!ids.length) {
      res.status(200).json({
        ok: true,
        organizations: []
      });
      return;
    }

    const serviceAreas = await sql`
      SELECT
        osa.organization_id,
        sa.name
      FROM organization_service_areas osa
      JOIN service_areas sa
        ON sa.id = osa.service_area_id
      WHERE
        osa.organization_id = ANY(${ids}::uuid[])
        AND osa.verified = true
      ORDER BY sa.name
    `;

    const needs = await sql`
      SELECT
        organization_id,
        id,
        title,
        description,
        need_type,
        action_url
      FROM organization_needs
      WHERE
        organization_id = ANY(${ids}::uuid[])
        AND status = 'approved'
        AND (
          ends_at IS NULL
          OR ends_at >= now()
        )
      ORDER BY created_at DESC
    `;

    const opportunities = await sql`
      SELECT
        organization_id,
        id,
        title,
        description,
        opportunity_type,
        audience,
        location_name,
        action_url,
        starts_at,
        ends_at
      FROM organization_opportunities
      WHERE
        organization_id = ANY(${ids}::uuid[])
        AND status = 'approved'
        AND (
          ends_at IS NULL
          OR ends_at >= now()
        )
      ORDER BY created_at DESC
    `;

    const events = await sql`
      SELECT
        organization_id,
        id,
        title,
        description,
        event_url,
        location_name,
        address_line1,
        city,
        state,
        postal_code,
        latitude,
        longitude,
        starts_at,
        ends_at
      FROM organization_events
      WHERE
        organization_id = ANY(${ids}::uuid[])
        AND status = 'approved'
        AND starts_at >= now() - interval '1 day'
      ORDER BY starts_at
    `;

    function grouped(rows) {
      const map = new Map();

      rows.forEach(row => {
        const key = String(row.organization_id);

        if (!map.has(key)) {
          map.set(key, []);
        }

        map.get(key).push(row);
      });

      return map;
    }

    const areaMap = grouped(serviceAreas);
    const needsMap = grouped(needs);
    const opportunityMap = grouped(opportunities);
    const eventMap = grouped(events);

    const result = organizations.map(org => ({
      ...org,

      service_areas:
        areaMap.get(String(org.id)) || [],

      needs:
        needsMap.get(String(org.id)) || [],

      opportunities:
        opportunityMap.get(String(org.id)) || [],

      events:
        eventMap.get(String(org.id)) || []
    }));

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );

    res.status(200).json({
      ok: true,
      organizations: result
    });

  } catch (error) {
    console.error(
      "LINK public nonprofit API error:",
      error
    );

    fail(
      res,
      500,
      "Public nonprofit directory could not be loaded."
    );
  }
}
