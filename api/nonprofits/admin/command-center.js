import {
  neon
} from "@neondatabase/serverless";

import {
  requireLinkAdmin
} from "./_auth.js";


function clean(
  value,
  max = 200
) {
  return String(
    value ?? ""
  )
    .trim()
    .slice(
      0,
      max
    );
}


function fail(
  res,
  status,
  error
) {
  res
    .status(status)
    .json({
      ok: false,
      error
    });
}


function parseBody(req) {
  if (
    typeof req.body ===
    "string"
  ) {
    try {
      return JSON.parse(
        req.body
      );
    } catch {
      return {};
    }
  }

  return (
    req.body || {}
  );
}


function noStore(res) {
  res.setHeader(
    "Cache-Control",
    "no-store, max-age=0"
  );
}


async function loadDashboard(
  sql
) {
  const [
    submissionStats,
    organizationStats,
    eventStats,
    mediaStats,
    resourceStats
  ] =
    await Promise.all([

      sql`
        SELECT
          COUNT(*)::int
            AS total,

          COUNT(*) FILTER (
            WHERE status =
              'pending-review'
          )::int
            AS pending,

          COUNT(*) FILTER (
            WHERE status =
              'approved'
          )::int
            AS approved,

          COUNT(*) FILTER (
            WHERE status =
              'needs-information'
          )::int
            AS needs_information

        FROM
          nonprofit_submissions
      `,


      sql`
        SELECT
          COUNT(*)::int
            AS total,

          COUNT(*) FILTER (
            WHERE
              active = true
              AND
              approval_status =
                'approved'
          )::int
            AS active,

          COUNT(*) FILTER (
            WHERE
              active = true
              AND
              approval_status =
                'approved'
              AND
              public_status =
                'public'
          )::int
            AS public

        FROM
          organizations
      `,


      sql`
        SELECT
          COUNT(*)::int
            AS total,

          COUNT(*) FILTER (
            WHERE status =
              'pending-review'
          )::int
            AS pending,

          COUNT(*) FILTER (
            WHERE status =
              'approved'
          )::int
            AS approved

        FROM
          organization_events
      `,


      sql`
        SELECT
          COUNT(*) FILTER (
            WHERE asset_type =
              'photo'
          )::int
            AS total,

          COUNT(*) FILTER (
            WHERE
              asset_type =
                'photo'
              AND
              approved = false
          )::int
            AS pending,

          COUNT(*) FILTER (
            WHERE
              asset_type =
                'photo'
              AND
              approved = true
          )::int
            AS approved

        FROM
          organization_assets
      `,


      sql`
        SELECT
          COUNT(*)::int
            AS total
        FROM
          hub_resource_items
      `
    ]);

  return {
    submissions:
      submissionStats[0] || {
        total: 0,
        pending: 0,
        approved: 0,
        needs_information: 0
      },

    organizations:
      organizationStats[0] || {
        total: 0,
        active: 0,
        public: 0
      },

    events:
      eventStats[0] || {
        total: 0,
        pending: 0,
        approved: 0
      },

    media:
      mediaStats[0] || {
        total: 0,
        pending: 0,
        approved: 0
      },

    resources:
      resourceStats[0] || {
        total: 0
      }
  };
}


async function loadOrganizations(
  sql
) {
  return sql`
    SELECT
      o.id,
      o.display_name,
      o.legal_name,
      o.slug,
      o.mission,
      o.category,
      o.website_url,
      o.public_email,
      o.city,
      o.state,
      o.postal_code,
      o.verification_status,
      o.approval_status,
      o.renewal_status,
      o.service_area_verified,
      o.active,
      o.public_status,
      o.approved_at,
      o.approved_by,
      o.last_verified_at,
      o.updated_at,

      (
        SELECT
          a.storage_url

        FROM
          organization_assets a

        WHERE
          a.organization_id =
            o.id
          AND
          a.asset_type =
            'logo'
          AND
          a.approved = true

        ORDER BY
          a.created_at DESC

        LIMIT 1
      )
        AS logo_url

    FROM
      organizations o

    ORDER BY
      lower(
        o.display_name
      )
  `;
}


async function loadMedia(
  sql
) {
  return sql`
    SELECT
      a.id,
      a.organization_id,
      a.file_name,
      a.storage_url,
      a.mime_type,
      a.file_size_bytes,
      a.authorization_confirmed,
      a.approved,
      a.approved_at,
      a.approved_by,
      a.alt_text,
      a.caption,
      a.story_title,
      a.story_text,
      a.photo_credit,
      a.public_site_allowed,
      a.newsletter_allowed,
      a.minors_present,
      a.minors_consent_confirmed,
      a.created_at,
      a.updated_at,

      o.display_name
        AS organization_name

    FROM
      organization_assets a

    JOIN
      organizations o
        ON
          o.id =
            a.organization_id

    WHERE
      a.asset_type =
        'photo'

    ORDER BY
      CASE
        WHEN a.approved = false
          THEN 0
        ELSE 1
      END,

      a.created_at DESC
  `;
}


async function updateOrganization(
  sql,
  body
) {
  const organizationId =
    clean(
      body.organizationId,
      80
    );

  const action =
    clean(
      body.action,
      40
    );

  if (
    !organizationId
  ) {
    throw new Error(
      "Choose an organization."
    );
  }


  const existing =
    await sql`
      SELECT
        id,
        display_name,
        active,
        approval_status,
        public_status,
        service_area_verified

      FROM
        organizations

      WHERE
        id =
          ${organizationId}::uuid

      LIMIT 1
    `;

  if (
    !existing.length
  ) {
    throw new Error(
      "Organization not found."
    );
  }


  if (
    action ===
    "activate"
  ) {
    const rows =
      await sql`
        UPDATE
          organizations

        SET
          active = true,
          updated_at = now()

        WHERE
          id =
            ${organizationId}::uuid

        RETURNING
          id,
          display_name,
          active,
          public_status
      `;

    return {
      message:
        "Organization activated.",
      organization:
        rows[0]
    };
  }


  if (
    action ===
    "deactivate"
  ) {
    const rows =
      await sql`
        UPDATE
          organizations

        SET
          active = false,
          updated_at = now()

        WHERE
          id =
            ${organizationId}::uuid

        RETURNING
          id,
          display_name,
          active,
          public_status
      `;

    return {
      message:
        "Organization hidden from active public listings.",
      organization:
        rows[0]
    };
  }


  throw new Error(
    "Choose a valid organization action."
  );
}


async function updateMedia(
  sql,
  body
) {
  const assetId =
    clean(
      body.assetId,
      80
    );

  const action =
    clean(
      body.action,
      40
    );

  if (
    !assetId
  ) {
    throw new Error(
      "Choose a media item."
    );
  }


  const rows =
    await sql`
      SELECT
        id,
        organization_id,
        asset_type,
        authorization_confirmed,
        approved,
        minors_present,
        minors_consent_confirmed,
        public_site_allowed,
        newsletter_allowed

      FROM
        organization_assets

      WHERE
        id =
          ${assetId}::uuid
        AND
        asset_type =
          'photo'

      LIMIT 1
    `;

  if (
    !rows.length
  ) {
    throw new Error(
      "Photo not found."
    );
  }


  const asset =
    rows[0];


  if (
    action ===
    "approve"
  ) {

    if (
      asset
        .authorization_confirmed !==
      true
    ) {
      throw new Error(
        "This photo cannot be approved until sharing authorization is confirmed."
      );
    }


    if (
      asset.minors_present ===
        true &&
      asset
        .minors_consent_confirmed !==
        true
    ) {
      throw new Error(
        "This photo cannot be approved until appropriate consent for identifiable minors is confirmed."
      );
    }


    const updated =
      await sql`
        UPDATE
          organization_assets

        SET
          approved = true,
          approved_at = now(),
          approved_by =
            'LINK Admin',
          updated_at = now()

        WHERE
          id =
            ${assetId}::uuid

        RETURNING
          id,
          approved,
          approved_at,
          approved_by
      `;

    return {
      message:
        "Photo approved.",
      asset:
        updated[0]
    };
  }


  if (
    action ===
    "unapprove"
  ) {
    const updated =
      await sql`
        UPDATE
          organization_assets

        SET
          approved = false,
          approved_at = NULL,
          approved_by = NULL,
          updated_at = now()

        WHERE
          id =
            ${assetId}::uuid

        RETURNING
          id,
          approved
      `;

    return {
      message:
        "Photo removed from LINK approval.",
      asset:
        updated[0]
    };
  }


  throw new Error(
    "Choose a valid media action."
  );
}


export default async function handler(
  req,
  res
) {
  noStore(res);


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
    !process.env
      .DATABASE_URL
  ) {
    fail(
      res,
      503,
      "Database is not configured."
    );

    return;
  }


  const sql =
    neon(
      process.env
        .DATABASE_URL
    );


  try {

    if (
      req.method === "GET"
    ) {
      const [
        stats,
        organizations,
        media
      ] =
        await Promise.all([
          loadDashboard(
            sql
          ),

          loadOrganizations(
            sql
          ),

          loadMedia(
            sql
          )
        ]);


      res
        .status(200)
        .json({
          ok: true,
          stats,
          organizations,
          media
        });

      return;
    }


    const body =
      parseBody(req);

    const section =
      clean(
        body.section,
        40
      );


    if (
      section ===
      "organization"
    ) {
      const result =
        await updateOrganization(
          sql,
          body
        );

      res
        .status(200)
        .json({
          ok: true,
          ...result
        });

      return;
    }


    if (
      section ===
      "media"
    ) {
      const result =
        await updateMedia(
          sql,
          body
        );

      res
        .status(200)
        .json({
          ok: true,
          ...result
        });

      return;
    }


    fail(
      res,
      400,
      "Choose a valid admin section."
    );

  } catch (error) {

    console.error(
      "LINK Admin Command Center error:",
      error
    );

    fail(
      res,
      500,
      error?.message ||
        "Admin action could not be completed."
    );
  }
}
