import crypto from "node:crypto";
import fs from "node:fs";

import formidable from "formidable";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import { Resend } from "resend";

export const config = {
  api: {
    bodyParser: false
  }
};

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml"
]);

function first(value) {
  if (Array.isArray(value)) {
    return String(value[0] ?? "").trim();
  }

  return String(value ?? "").trim();
}

function values(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item ?? "").trim())
      .filter(Boolean);
  }

  const single = String(value ?? "").trim();

  return single ? [single] : [];
}

function checked(value) {
  const normalized = first(value).toLowerCase();

  return [
    "on",
    "true",
    "1",
    "yes"
  ].includes(normalized);
}

function safeFileName(name) {
  return String(name || "logo")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function makeReference() {
  const year = new Date().getFullYear();

  return (
    "LINK-NP-" +
    year +
    "-" +
    crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()
  );
}

function hashIp(req) {
  const raw =
    String(
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      ""
    )
      .split(",")[0]
      .trim();

  const salt =
    process.env.IP_HASH_SALT || "";

  if (!raw) {
    return null;
  }

  return crypto
    .createHash("sha256")
    .update(raw + "|" + salt)
    .digest("hex");
}

function parseForm(req) {
  const form = formidable({
    multiples: true,
    maxFileSize: MAX_LOGO_BYTES,
    allowEmptyFiles: false,
    filter(part) {
      if (
        part.name === "logoFile" &&
        part.mimetype
      ) {
        return ALLOWED_LOGO_TYPES.has(
          part.mimetype
        );
      }

      return true;
    }
  });

  return new Promise((resolve, reject) => {
    form.parse(
      req,
      (error, fields, files) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          fields,
          files
        });
      }
    );
  });
}

function getLogoFile(files) {
  const candidate =
    files?.logoFile;

  if (!candidate) {
    return null;
  }

  return Array.isArray(candidate)
    ? candidate[0]
    : candidate;
}

async function uploadLogo(file, reference) {
  if (!file) {
    return {
      fileName: null,
      storageUrl: null
    };
  }

  if (!ALLOWED_LOGO_TYPES.has(file.mimetype)) {
    throw new Error(
      "Logo file type is not allowed."
    );
  }

  if (file.size > MAX_LOGO_BYTES) {
    throw new Error(
      "Logo file must be 5 MB or smaller."
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "Secure logo storage is not configured."
    );
  }

  const original =
    safeFileName(
      file.originalFilename ||
      "logo"
    );

  const blob = await put(
    `nonprofit-logos/${reference}-${original}`,
    fs.createReadStream(file.filepath),
    {
      access: "public",
      contentType: file.mimetype,
      addRandomSuffix: true,
      token:
        process.env
          .BLOB_READ_WRITE_TOKEN
    }
  );

  return {
    fileName:
      file.originalFilename ||
      original,

    storageUrl:
      blob.url
  };
}

function validate(fields) {
  const required = [
    "submissionType",
    "organizationName",
    "website",
    "mission",
    "serviceAreaExplanation",
    "contactName",
    "contactTitle",
    "contactEmail"
  ];

  for (const key of required) {
    if (!first(fields[key])) {
      throw new Error(
        `Missing required field: ${key}`
      );
    }
  }

  const serviceAreas =
    values(fields.serviceAreas);

  if (!serviceAreas.length) {
    throw new Error(
      "At least one Lake Norman service area is required."
    );
  }

  const confirmations = [
    "authorizedRepresentative",
    "contentPermission",
    "accuracyConfirmation",
    "serviceAreaConfirmation",
    "policyAgreement"
  ];

  for (const key of confirmations) {
    if (!checked(fields[key])) {
      throw new Error(
        "Required authorization or policy confirmation is missing."
      );
    }
  }

  return serviceAreas;
}

async function sendEmails({
  reference,
  organizationName,
  submissionType,
  contactName,
  contactEmail,
  serviceAreas
}) {
  if (!process.env.RESEND_API_KEY) {
    return {
      configured: false
    };
  }

  const resend =
    new Resend(
      process.env.RESEND_API_KEY
    );

  const adminEmail =
    process.env.LINK_ADMIN_EMAIL ||
    "jaime@linklakenorman.com";

  const fromEmail =
    process.env.LINK_FROM_EMAIL;

  if (!fromEmail) {
    return {
      configured: false
    };
  }

  const safeOrg =
    escapeHtml(organizationName);

  const safeContact =
    escapeHtml(contactName);

  const safeEmail =
    escapeHtml(contactEmail);

  const safeType =
    escapeHtml(submissionType);

  const safeAreas =
    escapeHtml(
      serviceAreas.join(", ")
    );

  const adminResult =
    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      replyTo: contactEmail,
      subject:
        `New LINK Nonprofit Submission — ${organizationName}`,
      html: `
        <h2>New LINK Community Hub™ Submission</h2>

        <p>
          <strong>Reference:</strong>
          ${escapeHtml(reference)}
        </p>

        <p>
          <strong>Type:</strong>
          ${safeType}
        </p>

        <p>
          <strong>Organization:</strong>
          ${safeOrg}
        </p>

        <p>
          <strong>Contact:</strong>
          ${safeContact}
        </p>

        <p>
          <strong>Email:</strong>
          ${safeEmail}
        </p>

        <p>
          <strong>Lake Norman Service Areas:</strong>
          ${safeAreas}
        </p>

        <p>
          Status: Pending LINK Review
        </p>
      `
    });

  const nonprofitResult =
    await resend.emails.send({
      from: fromEmail,
      to: contactEmail,
      replyTo: adminEmail,
      subject:
        "We received your LINK Community Hub™ submission",
      html: `
        <h2>Thank you, ${safeContact}.</h2>

        <p>
          LINK Community Hub™ received the
          ${safeType} submission for
          <strong>${safeOrg}</strong>.
        </p>

        <p>
          <strong>Reference:</strong>
          ${escapeHtml(reference)}
        </p>

        <p>
          Your submission is pending review by
          LINK administration.
        </p>

        <p>
          Submission does not automatically
          publish an organization, event,
          opportunity or other content.
        </p>

        <p>
          There is no cost for qualifying
          nonprofits to participate in
          LINK Community Hub™.
        </p>
      `
    });

  return {
    configured: true,
    adminResult,
    nonprofitResult
  };
}

export default async function handler(
  req,
  res
) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
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

  if (!process.env.DATABASE_URL) {
    res.status(503).json({
      ok: false,
      error:
        "LINK database is not configured."
    });
    return;
  }

  try {
    const {
      fields,
      files
    } = await parseForm(req);

    const serviceAreas =
      validate(fields);

    const reference =
      makeReference();

    const logo =
      await uploadLogo(
        getLogoFile(files),
        reference
      );

    const sql =
      neon(
        process.env.DATABASE_URL
      );

    const rows =
      await sql`
        INSERT INTO nonprofit_submissions (
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

          facebook_url,
          instagram_url,
          linkedin_url,
          other_url,

          logo_file_name,
          logo_storage_url,

          authorized_representative,
          content_permission,
          accuracy_confirmation,
          service_area_confirmation,
          policy_agreement
        )
        VALUES (
          ${reference},
          ${first(fields.submissionType)},
          'pending-review',

          ${first(fields.organizationName)},
          ${first(fields.website)},
          ${first(fields.publicEmail) || null},
          ${first(fields.publicPhone) || null},

          ${first(fields.physicalAddress) || null},
          ${first(fields.city) || null},
          ${first(fields.state) || null},
          ${first(fields.zip) || null},

          ${first(fields.category) || null},
          ${first(fields.mission)},

          ${JSON.stringify(serviceAreas)}::jsonb,
          ${first(fields.serviceAreaExplanation)},

          ${first(fields.contactName)},
          ${first(fields.contactTitle) || null},
          ${first(fields.contactEmail)},
          ${first(fields.contactPhone) || null},

          ${first(fields.needs) || null},
          ${first(fields.volunteerOpportunities) || null},
          ${first(fields.donationOpportunities) || null},
          ${first(fields.studentOpportunities) || null},
          ${first(fields.businessOpportunities) || null},
          ${first(fields.events) || null},

          ${first(fields.facebook) || null},
          ${first(fields.instagram) || null},
          ${first(fields.linkedin) || null},
          ${first(fields.otherLink) || null},

          ${logo.fileName},
          ${logo.storageUrl},

          ${checked(fields.authorizedRepresentative)},
          ${checked(fields.contentPermission)},
          ${checked(fields.accuracyConfirmation)},
          ${checked(fields.serviceAreaConfirmation)},
          ${checked(fields.policyAgreement)}
        )
        RETURNING
          id,
          reference_code,
          submitted_at
      `;

    const submission =
      rows[0];

    const policyVersion =
      process.env
        .LINK_POLICY_VERSION ||
      "2026-08";

    const policyNames = [
      "Terms of Use",
      "Privacy Policy",
      "Community Guidelines",
      "Logo & Content Authorization",
      "Nonprofit Participation Standards"
    ];

    const ipHash =
      hashIp(req);

    const userAgent =
      String(
        req.headers["user-agent"] ||
        ""
      );

    for (
      const policyName
      of policyNames
    ) {
      await sql`
        INSERT INTO policy_acceptances (
          submission_id,
          contact_email,
          policy_name,
          policy_version,
          ip_hash,
          user_agent
        )
        VALUES (
          ${submission.id},
          ${first(fields.contactEmail)},
          ${policyName},
          ${policyVersion},
          ${ipHash},
          ${userAgent}
        )
      `;
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
        ${first(fields.contactEmail)},
        'nonprofit-submitter',
        'submission-created',
        'nonprofit_submission',
        ${String(submission.id)},
        ${JSON.stringify({
          reference,
          status:
            "pending-review",
          organization:
            first(
              fields.organizationName
            )
        })}::jsonb,
        'Public nonprofit registration, renewal or update submission'
      )
    `;

    let emailStatus = {
      configured: false
    };

    try {
      emailStatus =
        await sendEmails({
          reference,

          organizationName:
            first(
              fields.organizationName
            ),

          submissionType:
            first(
              fields.submissionType
            ),

          contactName:
            first(
              fields.contactName
            ),

          contactEmail:
            first(
              fields.contactEmail
            ),

          serviceAreas
        });
    } catch (emailError) {
      console.error(
        "LINK email notification failed:",
        emailError
      );
    }

    res.status(201).json({
      ok: true,
      reference,
      status: "pending-review",
      submittedAt:
        submission.submitted_at,
      emailNotificationConfigured:
        Boolean(
          emailStatus.configured
        )
    });

  } catch (error) {
    console.error(
      "LINK nonprofit submission error:",
      error
    );

    res.status(400).json({
      ok: false,
      error:
        error?.message ||
        "Submission could not be processed."
    });
  }
}
