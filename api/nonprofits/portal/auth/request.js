import {
  fail,
  noStore,
  parse,
  sql,
  validEmail,
  token,
  tokenHash
} from "../_auth.js";

import {
  sendLinkEmail,
  emailProviderStatus
} from "../../_mailer.js";


function safeHtml(value) {
  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


function baseUrl(req) {
  if (
    process.env.LINK_PUBLIC_BASE_URL
  ) {
    return process.env
      .LINK_PUBLIC_BASE_URL
      .replace(
        /\/+$/,
        ""
      );
  }


  const host =
    req.headers[
      "x-forwarded-host"
    ] ||
    req.headers.host;


  const proto =
    req.headers[
      "x-forwarded-proto"
    ] ||
    (
      host?.includes(
        "localhost"
      )
        ? "http"
        : "https"
    );


  return `${proto}://${host}`;
}


export default async function handler(
  req,
  res
) {
  noStore(res);


  if (
    req.method !== "POST"
  ) {
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
    emailProviderStatus() ===
    "not_configured"
  ) {
    fail(
      res,
      503,
      "Email sign-in is temporarily unavailable."
    );

    return;
  }


  try {
    const body =
      parse(req);


    const email =
      String(
        body.email || ""
      )
        .trim()
        .toLowerCase();


    if (
      !validEmail(email)
    ) {
      fail(
        res,
        400,
        "Enter a valid email address."
      );

      return;
    }


    const db =
      sql();


    const rows =
      await db`
        SELECT
          c.id AS contact_id,
          c.organization_id,
          c.full_name,
          o.display_name

        FROM
          organization_contacts c

        INNER JOIN
          organizations o
            ON o.id =
              c.organization_id

        WHERE
          lower(c.email) =
            lower(${email})

          AND o.active =
            true

          AND o.approval_status =
            'approved'
          AND o.claim_status = 'approved'

          AND o.service_area_verified =
            true

        LIMIT 1
      `;


    /*
     * Privacy-preserving response.
     * We do not reveal whether an address exists.
     */
    if (
      !rows.length
    ) {
      res
        .status(200)
        .json({
          ok:
            true,

          message:
            "If this email is authorized for an approved LINK nonprofit, a sign-in link is on the way."
        });

      return;
    }


    const account =
      rows[0];


    const recent =
      await db`
        SELECT
          id

        FROM
          hub_nonprofit_portal_magic_tokens

        WHERE
          contact_id =
            ${account.contact_id}

          AND used_at IS NULL

          AND expires_at >
            now()

          AND created_at >
            now() -
            interval '60 seconds'

        LIMIT 1
      `;


    if (
      recent.length
    ) {
      res
        .status(200)
        .json({
          ok:
            true,

          message:
            "A sign-in link was recently sent. Please check your email."
        });

      return;
    }


    const raw =
      token();


    await db`
      INSERT INTO
        hub_nonprofit_portal_magic_tokens
      (
        organization_id,
        contact_id,
        email,
        token_hash,
        expires_at
      )

      VALUES
      (
        ${account.organization_id},
        ${account.contact_id},
        ${email},
        ${tokenHash(raw)},
        now() +
          interval '20 minutes'
      )
    `;


    const link =
      `${baseUrl(req)}/api/nonprofits/portal/auth/verify?token=${encodeURIComponent(raw)}`;


    const subject =
      "Your LINK Nonprofit Portal sign-in link";


    const text =
`Use the secure link below to sign in to the LINK nonprofit portal for ${account.display_name}.

${link}

This link expires in 20 minutes.

LINK Community Hub™`;


    const html =
`<div style="font-family:Arial,sans-serif;color:#0b2344;line-height:1.55">

<h2>
  LINK Community Hub™
</h2>

<p>
  Use the secure link below to sign in to the nonprofit portal for
  <strong>${safeHtml(account.display_name)}</strong>.
</p>

<p>
  <a href="${safeHtml(link)}">
    Sign in to LINK
  </a>
</p>

<p>
  This link expires in 20 minutes.
</p>

</div>`;


    const delivery =
      await sendLinkEmail({
        to:
          email,

        subject,

        text,

        html
      });


    if (
      delivery.status !==
      "sent"
    ) {
      /*
       * Do not leave an unusable active token
       * when email delivery fails.
       */
      await db`
        DELETE FROM
          hub_nonprofit_portal_magic_tokens

        WHERE
          token_hash =
            ${tokenHash(raw)}
      `;


      console.error(
        "LINK nonprofit sign-in email:",
        delivery.status,
        delivery.error || ""
      );


      fail(
        res,
        503,
        "Email sign-in is temporarily unavailable."
      );

      return;
    }


    res
      .status(200)
      .json({
        ok:
          true,

        message:
          "Check your email for your secure LINK sign-in link."
      });

  } catch (error) {
    console.error(
      "LINK nonprofit auth request error:",
      error
    );


    fail(
      res,
      500,
      "We could not send your sign-in link."
    );
  }
}
