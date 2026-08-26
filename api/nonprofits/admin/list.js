import { neon } from "@neondatabase/serverless";
import { requireLinkAdmin } from "./_auth.js";

export default async function handler(req, res) {
  if (!requireLinkAdmin(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    res.status(405).json({
      ok: false,
      error: "Method not allowed."
    });

    return;
  }

  try {
    const sql =
      neon(
        process.env.DATABASE_URL
      );

    const rows = await sql`
      SELECT
        id,
        reference_code,
        submission_type,
        status,

        organization_name,
        website_url,
        public_email,
        public_phone,
        physical_address,
        city,
        state,
        postal_code,
        category,
        mission,

        service_areas,
        service_area_explanation,

        contact_name,
        contact_title,
        contact_email,
        contact_phone,

        needs_text,
        volunteer_opportunities_text,
        donation_opportunities_text,
        student_opportunities_text,
        business_opportunities_text,
        events_text,

        logo_file_name,
        logo_storage_url,

        authorized_representative,
        content_permission,
        accuracy_confirmation,
        service_area_confirmation,
        policy_agreement,

        admin_notes,
        submitted_at,
        reviewed_at,
        reviewed_by

      FROM nonprofit_submissions

      ORDER BY
        CASE status
          WHEN 'pending-review' THEN 1
          WHEN 'needs-information' THEN 2
          WHEN 'approved' THEN 3
          WHEN 'rejected' THEN 4
          ELSE 5
        END,
        submitted_at DESC
    `;

    res.status(200).json({
      ok: true,
      submissions: rows
    });

  } catch (error) {
    console.error(
      "LINK admin list error:",
      error
    );

    res.status(500).json({
      ok: false,
      error:
        "Admin submissions could not be loaded."
    });
  }
}
