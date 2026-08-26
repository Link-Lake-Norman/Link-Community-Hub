import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";


const ALLOWED_TYPES =
  new Set([
    "learn-more",
    "sponsor",
    "ecosystem-audit"
  ]);


function clean(value, max = 500) {
  return String(
    value ?? ""
  )
    .trim()
    .slice(0, max);
}


function validEmail(value) {
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  ).test(value);
}


function safeUrl(value) {
  var text =
    clean(value, 300);

  if (!text) {
    return null;
  }

  try {
    var parsed =
      new URL(text);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return null;
    }

    return parsed.toString();

  } catch {
    return null;
  }
}


function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


async function sendAdminEmail(lead) {

  var apiKey =
    process.env.RESEND_API_KEY;

  var admin =
    process.env.LINK_ADMIN_EMAIL;

  var from =
    process.env.LINK_FROM_EMAIL;


  if (
    !apiKey ||
    !admin ||
    !from
  ) {
    console.warn(
      "LINK lead email skipped: missing email environment."
    );

    return;
  }


  var labels = {
    "learn-more":
      "Learn More",

    "sponsor":
      "Sponsor Inquiry",

    "ecosystem-audit":
      "Custom Ecosystem Audit"
  };


  var subject =
    "LINK: " +
    (
      labels[lead.leadType] ||
      "New Inquiry"
    ) +
    " — " +
    lead.fullName;


  var html = `
    <div style="font-family:Arial,sans-serif;color:#0b2344;line-height:1.55">
      <h2 style="margin-bottom:4px">
        New LINK Community Hub Inquiry
      </h2>

      <p style="color:#687180;margin-top:0">
        ${escapeHtml(
          labels[lead.leadType] ||
          lead.leadType
        )}
      </p>

      <hr style="border:0;border-top:1px solid #ddd">

      <p>
        <strong>Name:</strong>
        ${escapeHtml(lead.fullName)}
      </p>

      <p>
        <strong>Organization:</strong>
        ${escapeHtml(
          lead.organizationName ||
          "—"
        )}
      </p>

      <p>
        <strong>Title:</strong>
        ${escapeHtml(
          lead.title ||
          "—"
        )}
      </p>

      <p>
        <strong>Email:</strong>
        ${escapeHtml(lead.email)}
      </p>

      <p>
        <strong>Phone:</strong>
        ${escapeHtml(
          lead.phone ||
          "—"
        )}
      </p>

      <p>
        <strong>Location:</strong>
        ${escapeHtml(
          [
            lead.city,
            lead.state
          ]
            .filter(Boolean)
            .join(", ") ||
          "—"
        )}
      </p>

      <p>
        <strong>Interest:</strong>
        ${escapeHtml(
          lead.interestArea ||
          "—"
        )}
      </p>

      <p>
        <strong>Sponsorship:</strong>
        ${escapeHtml(
          lead.sponsorshipInterest ||
          "—"
        )}
      </p>

      <p>
        <strong>Message:</strong><br>
        ${escapeHtml(lead.message)}
      </p>

      <p style="font-size:12px;color:#687180">
        Source:
        ${escapeHtml(
          lead.sourcePath ||
          "/"
        )}
      </p>
    </div>
  `;


  var response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            "Bearer " +
            apiKey,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            from,
            to: [admin],
            subject,
            html
          })
      }
    );


  if (!response.ok) {

    var errorText =
      await response.text();

    console.error(
      "LINK Resend error:",
      response.status,
      errorText
    );

  }

}


export default async function handler(
  req,
  res
) {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );


  if (req.method !== "POST") {

    res.setHeader(
      "Allow",
      "POST"
    );

    res.status(405).json({
      ok: false,
      error:
        "Method not allowed."
    });

    return;
  }


  if (!process.env.DATABASE_URL) {

    res.status(503).json({
      ok: false,
      error:
        "LINK inquiry service is temporarily unavailable."
    });

    return;
  }


  try {

    var body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};


    /*
      Honeypot:
      bots commonly populate every field.
    */

    if (
      clean(
        body.companyFax,
        100
      )
    ) {

      res.status(200).json({
        ok: true
      });

      return;
    }


    /*
      Minimum human interaction time.
      Prevents instant automated submissions.
    */

    var openedAt =
      Number(body.openedAt);

    if (
      !Number.isFinite(openedAt) ||
      Date.now() - openedAt < 1500
    ) {

      res.status(400).json({
        ok: false,
        error:
          "Please review the form and try again."
      });

      return;
    }


    var leadType =
      clean(
        body.leadType,
        50
      );


    if (
      !ALLOWED_TYPES.has(
        leadType
      )
    ) {

      res.status(400).json({
        ok: false,
        error:
          "Invalid inquiry type."
      });

      return;
    }


    var lead = {

      leadType,

      fullName:
        clean(
          body.fullName,
          120
        ),

      organizationName:
        clean(
          body.organizationName,
          180
        ),

      title:
        clean(
          body.title,
          120
        ),

      email:
        clean(
          body.email,
          180
        ).toLowerCase(),

      phone:
        clean(
          body.phone,
          50
        ),

      website:
        safeUrl(
          body.website
        ),

      city:
        clean(
          body.city,
          100
        ),

      state:
        clean(
          body.state,
          50
        ),

      interestArea:
        clean(
          body.interestArea,
          120
        ),

      sponsorshipInterest:
        clean(
          body.sponsorshipInterest,
          180
        ),

      message:
        clean(
          body.message,
          3000
        ),

      sourcePath:
        clean(
          body.sourcePath,
          300
        ),

      consent:
        body.consent === true

    };


    if (
      !lead.fullName ||
      !lead.email ||
      !validEmail(
        lead.email
      ) ||
      !lead.interestArea ||
      !lead.message ||
      !lead.consent
    ) {

      res.status(400).json({
        ok: false,
        error:
          "Please complete all required fields."
      });

      return;
    }


    if (
      leadType === "sponsor" &&
      (
        !lead.organizationName ||
        !lead.sponsorshipInterest
      )
    ) {

      res.status(400).json({
        ok: false,
        error:
          "Please provide your organization and sponsorship interest."
      });

      return;
    }


    if (
      leadType ===
        "ecosystem-audit" &&
      !lead.organizationName
    ) {

      res.status(400).json({
        ok: false,
        error:
          "Please provide the organization requesting the audit."
      });

      return;
    }


    const sql =
      neon(
        process.env.DATABASE_URL
      );


    var rows =
      await sql`
        INSERT INTO hub_leads (
          lead_type,
          status,
          full_name,
          organization_name,
          title,
          email,
          phone,
          website_url,
          city,
          state,
          interest_area,
          sponsorship_interest,
          message,
          source_path,
          consent_to_contact
        )
        VALUES (
          ${lead.leadType},
          'new',
          ${lead.fullName},
          ${lead.organizationName || null},
          ${lead.title || null},
          ${lead.email},
          ${lead.phone || null},
          ${lead.website || null},
          ${lead.city || null},
          ${lead.state || null},
          ${lead.interestArea || null},
          ${lead.sponsorshipInterest || null},
          ${lead.message},
          ${lead.sourcePath || '/'},
          true
        )
        RETURNING id
      `;


    /*
      Email failure should not destroy
      an otherwise successful database lead.
    */

    try {

      await sendAdminEmail(
        lead
      );

    } catch (emailError) {

      console.error(
        "LINK lead notification error:",
        emailError
      );

    }


    console.log(
      "LINK lead created:",
      rows[0].id,
      lead.leadType
    );


    res.status(201).json({
      ok: true,
      reference:
        "LINK-" +
        rows[0].id
          .slice(0, 8)
          .toUpperCase()
    });


  } catch (error) {

    console.error(
      "LINK lead submission error:",
      error
    );


    res.status(500).json({
      ok: false,
      error:
        "Your request could not be submitted. Please try again."
    });

  }

}
