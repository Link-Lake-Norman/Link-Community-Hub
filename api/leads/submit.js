import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";


const ALLOWED_TYPES = new Set([
  "learn-more",
  "get-connected",
  "support-hub",
  "bring-community",
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


async function sendLeadEmails(
  lead,
  reference
) {

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
      "LINK EMAIL SKIPPED:",
      {
        RESEND_API_KEY:
          Boolean(apiKey),

        LINK_ADMIN_EMAIL:
          Boolean(admin),

        LINK_FROM_EMAIL:
          Boolean(from)
      }
    );

    return;
  }


  var labels = {

    "learn-more":
      "Learn More",

    "get-connected":
      "Get Connected",

    "support-hub":
      "Support the Hub",

    "bring-community":
      "Bring LINK Community Hub™ to Your Community",

    "ecosystem-audit":
      "Community Connection Snapshot™"

  };


  var label =
    labels[lead.leadType] ||
    "LINK Community Hub Inquiry";


  /*
    =====================================================
    ADMIN NOTIFICATION
    =====================================================
  */

  var adminSubject =
    "LINK: " +
    label +
    " — " +
    lead.fullName;


  var adminHtml = `
    <div
      style="
        font-family:Arial,sans-serif;
        color:#0b2344;
        line-height:1.55;
        max-width:680px;
      "
    >

      <h2 style="margin-bottom:4px">
        New LINK Community Hub™ Inquiry
      </h2>

      <p
        style="
          color:#687180;
          margin-top:0;
        "
      >
        ${escapeHtml(label)}
      </p>

      <hr
        style="
          border:0;
          border-top:1px solid #ddd;
        "
      >

      <p>
        <strong>Reference:</strong>
        ${escapeHtml(reference)}
      </p>

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
        ${escapeHtml(
          lead.message ||
          "—"
        )}
      </p>

      <p
        style="
          font-size:12px;
          color:#687180;
        "
      >
        Source:
        ${escapeHtml(
          lead.sourcePath ||
          "/"
        )}
      </p>

    </div>
  `;


  /*
    =====================================================
    SUBMITTER CONFIRMATION
    =====================================================
  */

  var firstName =
    (
      lead.fullName ||
      ""
    )
      .trim()
      .split(/\s+/)[0] ||
    "there";


  var confirmation = {

    subject:
      "We received your LINK Community Hub™ inquiry",

    heading:
      "Thanks for connecting with LINK.",

    message:
      `
        We received your inquiry and will review
        the information you shared.
      `,

    next:
      `
        We will follow up with the most appropriate
        next step or connection.
      `

  };


  if (
    lead.leadType ===
    "get-connected"
  ) {

    confirmation = {

      subject:
        "Thanks for connecting with LINK Community Hub™",

      heading:
        "Your connection request is in.",

      message:
        `
          Thanks for telling us how you would like
          to participate, connect or engage with
          LINK Community Hub™.
        `,

      next:
        `
          We will review your request and follow up
          with the most relevant pathway, resource
          or connection.
        `

    };

  }


  if (
    lead.leadType ===
    "support-hub"
  ) {

    confirmation = {

      subject:
        "Thank you for supporting LINK Community Hub™",

      heading:
        "Thank you for your interest in supporting the Hub.",

      message:
        `
          Community sponsorships, partnerships,
          expertise and resources help sustain the
          technology, outreach and connections behind
          LINK Community Hub™.
        `,

      next:
        `
          We will review the information you shared
          and follow up to discuss the best way for
          you or your organization to participate.
        `

    };

  }


  if (
    lead.leadType ===
    "bring-community"
  ) {

    confirmation = {

      subject:
        "Bring LINK Community Hub™ to Your Community",

      heading:
        "Thank you for your interest in LINK Community Hub™.",

      message:
        `
          LINK Community Hub™ is designed to create
          stronger connections between people,
          organizations, resources, needs and
          opportunities within a community.
        `,

      next:
        `
          We will review your community information
          and follow up to schedule a conversation
          about whether an authorized LINK Community
          Hub™ implementation may be a fit.
        `

    };

  }


  if (
    lead.leadType ===
    "ecosystem-audit"
  ) {

    confirmation = {

      subject:
        "Your Community Connection Snapshot™",

      heading:
        "Your Community Connection Snapshot™ is in.",

      message:
        `
          Thank you for sharing where your organization
          may benefit from stronger alignment across
          people, workforce, leadership, partnerships,
          resources and community relationships.
        `,

      next:
        `
          Your Snapshot is the starting point.
          We will review your responses and identify
          the most appropriate next step.

          If a deeper assessment would be valuable,
          LINK also offers a Custom Ecosystem Audit™.
          We can schedule a short Audit Planning Call
          to determine whether an audit makes sense
          and what the right scope should be.
        `

    };

  }


  var userHtml = `
    <div
      style="
        font-family:Arial,sans-serif;
        color:#17324d;
        line-height:1.65;
        max-width:620px;
        margin:0 auto;
      "
    >

      <p
        style="
          color:#d6a84b;
          font-size:12px;
          font-weight:700;
          letter-spacing:.08em;
          margin-bottom:8px;
        "
      >
        LINK COMMUNITY HUB™
      </p>

      <h2
        style="
          margin-top:0;
          margin-bottom:18px;
          color:#17324d;
        "
      >
        ${escapeHtml(
          confirmation.heading
        )}
      </h2>

      <p>
        Hi ${escapeHtml(firstName)},
      </p>

      <p>
        ${escapeHtml(
          confirmation.message
            .replace(/\s+/g, " ")
            .trim()
        )}
      </p>

      <p>
        ${escapeHtml(
          confirmation.next
            .replace(/\s+/g, " ")
            .trim()
        )}
      </p>

      <p>
        <strong>Reference:</strong>
        ${escapeHtml(reference)}
      </p>

      <p>
        You can reply directly to this email
        if you have additional information
        you would like us to consider.
      </p>

      <p style="margin-top:28px">
        Best,<br>
        <strong>LINK Community Hub™</strong><br>
        Lake Norman
      </p>

      <p
        style="
          margin-top:28px;
          padding-top:18px;
          border-top:1px solid #e5e7eb;
          color:#6b7280;
          font-size:12px;
        "
      >
        Our Community. Connected.<br>
        www.linkcommunityhub.com
      </p>

    </div>
  `;


  /*
    =====================================================
    SEND ADMIN EMAIL
    =====================================================
  */

  var adminResponse =
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

            to: [
              admin
            ],

            reply_to:
              lead.email,

            subject:
              adminSubject,

            html:
              adminHtml

          })

      }
    );


  var adminText =
    await adminResponse.text();


  if (!adminResponse.ok) {

    console.error(
      "LINK ADMIN EMAIL FAILED:",
      adminResponse.status,
      adminText
    );

  } else {

    console.log(
      "LINK ADMIN EMAIL ACCEPTED:",
      adminResponse.status,
      adminText
    );

  }


  /*
    =====================================================
    SEND SUBMITTER EMAIL
    =====================================================
  */

  var userResponse =
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

            to: [
              lead.email
            ],

            reply_to:
              admin,

            subject:
              confirmation.subject,

            html:
              userHtml

          })

      }
    );


  var userText =
    await userResponse.text();


  if (!userResponse.ok) {

    console.error(
      "LINK CONFIRMATION EMAIL FAILED:",
      userResponse.status,
      userText
    );

  } else {

    console.log(
      "LINK CONFIRMATION EMAIL ACCEPTED:",
      userResponse.status,
      userText
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

      var reference =
        "LINK-" +
        rows[0].id
          .slice(0, 8)
          .toUpperCase();

      await sendLeadEmails(
        lead,
        reference
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
        reference ||
        (
          "LINK-" +
          rows[0].id
            .slice(0, 8)
            .toUpperCase()
        )
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
