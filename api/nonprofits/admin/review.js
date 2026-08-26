import { neon } from "@neondatabase/serverless";
import { requireLinkAdmin } from "./_auth.js";

const LOCAL_CITIES = new Set([
  "huntersville",
  "cornelius",
  "davidson",
  "mooresville",
  "troutman",
  "denver",
  "sherrills ford"
]);

function clean(value) {
  return String(value ?? "").trim();
}

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function boolean(value) {
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );
}

export default async function handler(req, res) {
  if (!requireLinkAdmin(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    res.status(405).json({
      ok: false,
      error: "Method not allowed."
    });

    return;
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const submissionId =
      clean(body.submissionId);

    const status =
      clean(body.status);

    const allowedStatuses =
      new Set([
        "pending-review",
        "needs-information",
        "approved",
        "rejected",
        "archived"
      ]);

    if (
      !submissionId ||
      !allowedStatuses.has(status)
    ) {
      res.status(400).json({
        ok: false,
        error:
          "Submission ID and valid review status are required."
      });

      return;
    }

    const sql =
      neon(
        process.env.DATABASE_URL
      );

    const found = await sql`
      SELECT *
      FROM nonprofit_submissions
      WHERE id = ${submissionId}::uuid
      LIMIT 1
    `;

    if (!found.length) {
      res.status(404).json({
        ok: false,
        error: "Submission not found."
      });

      return;
    }

    const submission =
      found[0];

    const adminName =
      clean(body.reviewedBy) ||
      process.env.LINK_ADMIN_EMAIL ||
      "LINK Admin";

    const notes =
      clean(body.adminNotes);

    await sql`
      UPDATE nonprofit_submissions
      SET
        status = ${status},
        admin_notes = ${notes || null},
        reviewed_at = now(),
        reviewed_by = ${adminName},
        updated_at = now()
      WHERE id = ${submissionId}::uuid
    `;

    let organizationId =
      submission.organization_id;

    if (status === "approved") {
      const locatedInServiceArea =
        typeof body.locatedInServiceArea !== "undefined"
          ? boolean(body.locatedInServiceArea)
          : LOCAL_CITIES.has(
              clean(submission.city).toLowerCase()
            );

      const servesServiceArea =
        boolean(body.servesServiceArea);

      const serviceAreaVerified =
        boolean(body.serviceAreaVerified);

      if (
        !servesServiceArea ||
        !serviceAreaVerified
      ) {
        res.status(400).json({
          ok: false,
          error:
            "Approval requires verified Lake Norman service."
        });

        return;
      }

      let slug =
        slugify(
          submission.organization_name
        );

      if (!slug) {
        slug =
          "organization-" +
          submission.id.slice(0, 8);
      }

      const existing = await sql`
        SELECT id
        FROM organizations
        WHERE
          id = ${organizationId}::uuid
          OR slug = ${slug}
        LIMIT 1
      `;

      if (existing.length) {
        organizationId =
          existing[0].id;

        await sql`
          UPDATE organizations
          SET
            legal_name =
              ${submission.organization_name},

            display_name =
              ${submission.organization_name},

            website_url =
              ${submission.website_url || null},

            public_email =
              ${submission.public_email || null},

            public_phone =
              ${submission.public_phone || null},

            mission =
              ${submission.mission || null},

            category =
              ${submission.category || null},

            address_line1 =
              ${submission.physical_address || null},

            city =
              ${submission.city || null},

            state =
              ${submission.state || null},

            postal_code =
              ${submission.postal_code || null},

            located_in_service_area =
              ${locatedInServiceArea},

            serves_service_area =
              true,

            service_area_verified =
              true,

            verification_status =
              'service-area-verified',

            approval_status =
              'approved',

            renewal_status =
              'current',

            last_verified_at =
              now(),

            renewal_due_at =
              now() + interval '1 year',

            approved_at =
              now(),

            approved_by =
              ${adminName},

            active =
              true,

            public_status =
              'public',

            updated_at =
              now()

          WHERE id =
            ${organizationId}::uuid
        `;

      } else {
        const created = await sql`
          INSERT INTO organizations (
            legal_name,
            display_name,
            slug,
            website_url,
            public_email,
            public_phone,
            mission,
            category,
            address_line1,
            city,
            state,
            postal_code,

            located_in_service_area,
            serves_service_area,
            service_area_verified,

            verification_status,
            approval_status,
            renewal_status,

            last_verified_at,
            renewal_due_at,
            approved_at,
            approved_by,

            active,
            public_status
          )
          VALUES (
            ${submission.organization_name},
            ${submission.organization_name},
            ${slug},
            ${submission.website_url || null},
            ${submission.public_email || null},
            ${submission.public_phone || null},
            ${submission.mission || null},
            ${submission.category || null},
            ${submission.physical_address || null},
            ${submission.city || null},
            ${submission.state || null},
            ${submission.postal_code || null},

            ${locatedInServiceArea},
            true,
            true,

            'service-area-verified',
            'approved',
            'current',

            now(),
            now() + interval '1 year',
            now(),
            ${adminName},

            true,
            'public'
          )
          RETURNING id
        `;

        organizationId =
          created[0].id;
      }

      await sql`
        UPDATE nonprofit_submissions
        SET
          organization_id =
            ${organizationId}::uuid
        WHERE id =
          ${submissionId}::uuid
      `;

      await sql`
        DELETE FROM organization_contacts
        WHERE
          organization_id =
            ${organizationId}::uuid
          AND is_primary = true
      `;

      await sql`
        INSERT INTO organization_contacts (
          organization_id,
          full_name,
          title,
          email,
          phone,
          is_primary,
          is_public
        )
        VALUES (
          ${organizationId}::uuid,
          ${submission.contact_name},
          ${submission.contact_title || null},
          ${submission.contact_email},
          ${submission.contact_phone || null},
          true,
          false
        )
      `;

      const serviceAreas =
        Array.isArray(
          submission.service_areas
        )
          ? submission.service_areas
          : [];

      for (const serviceAreaName of serviceAreas) {
        const area = await sql`
          SELECT id
          FROM service_areas
          WHERE lower(name) =
            lower(${serviceAreaName})
          LIMIT 1
        `;

        if (!area.length) {
          continue;
        }

        await sql`
          INSERT INTO organization_service_areas (
            organization_id,
            service_area_id,
            evidence,
            verified,
            verified_at,
            verified_by
          )
          VALUES (
            ${organizationId}::uuid,
            ${area[0].id}::uuid,
            ${submission.service_area_explanation || null},
            true,
            now(),
            ${adminName}
          )
          ON CONFLICT (
            organization_id,
            service_area_id
          )
          DO UPDATE SET
            evidence =
              EXCLUDED.evidence,
            verified =
              true,
            verified_at =
              now(),
            verified_by =
              ${adminName}
        `;
      }

      if (
        submission.logo_storage_url &&
        submission.logo_file_name
      ) {
        const existingLogo = await sql`
          SELECT id
          FROM organization_assets
          WHERE
            organization_id =
              ${organizationId}::uuid
            AND asset_type = 'logo'
            AND storage_url =
              ${submission.logo_storage_url}
          LIMIT 1
        `;

        if (!existingLogo.length) {
          await sql`
            INSERT INTO organization_assets (
              organization_id,
              asset_type,
              file_name,
              storage_url,
              authorization_confirmed,
              approved,
              approved_at,
              approved_by
            )
            VALUES (
              ${organizationId}::uuid,
              'logo',
              ${submission.logo_file_name},
              ${submission.logo_storage_url},
              true,
              true,
              now(),
              ${adminName}
            )
          `;
        }
      }
    }

    await sql`
      INSERT INTO governance_audit_log (
        actor_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        new_state,
        reason
      )
      VALUES (
        ${adminName},
        'link-admin',
        ${"submission-" + status},
        'nonprofit_submission',
        ${submissionId},
        ${JSON.stringify({
          status,
          organizationId:
            organizationId || null,
          public:
            status === "approved"
        })}::jsonb,
        ${notes || null}
      )
    `;

    res.status(200).json({
      ok: true,
      status,
      organizationId:
        organizationId || null
    });

  } catch (error) {
    console.error(
      "LINK admin review error:",
      error
    );

    res.status(500).json({
      ok: false,
      error:
        "Review could not be completed."
    });
  }
}
