import crypto from "crypto";

import {
  neon
} from "@neondatabase/serverless";

import {
  requireLinkAdmin
} from "./_auth.js";

import {
  sendLinkEmail,
  emailProviderStatus
} from "../_mailer.js";


function clean(value, max = 10000) {
  return String(
    value ?? ""
  )
    .trim()
    .slice(
      0,
      max
    );
}


function htmlEscape(value) {
  return clean(
    value,
    20000
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
    return (
      process.env.LINK_PUBLIC_BASE_URL
        .replace(
          /\/+$/,
          ""
        )
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


async function resolveOrganization(
  sql,
  organizationId
) {
  const rows =
    await sql`
      SELECT
        o.id,
        o.display_name,
        o.legal_name,
        o.public_email,

        (
          SELECT
            c.email

          FROM
            organization_contacts c

          WHERE
            c.organization_id = o.id

          ORDER BY
            c.is_primary DESC,
            c.created_at ASC

          LIMIT 1
        ) AS contact_email,

        (
          SELECT
            s.contact_email

          FROM
            nonprofit_submissions s

          WHERE
            s.organization_id = o.id

            OR lower(
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
        ) AS submission_email

      FROM
        organizations o

      WHERE
        o.id = ${organizationId}

      LIMIT 1
    `;

  return (
    rows[0] ||
    null
  );
}


function bestEmail(
  organization,
  override = ""
) {
  return (
    clean(
      override,
      320
    ) ||
    clean(
      organization?.contact_email,
      320
    ) ||
    clean(
      organization?.public_email,
      320
    ) ||
    clean(
      organization?.submission_email,
      320
    )
  );
}


async function createClaimInvite({
  sql,
  req,
  organizationId,
  email,
  createdBy
}) {
  const organization =
    await resolveOrganization(
      sql,
      organizationId
    );

  if (!organization) {
    throw new Error(
      "Organization not found."
    );
  }

  const recipient =
    bestEmail(
      organization,
      email
    );

  if (!recipient) {
    return {
      ok:
        false,

      organizationId,

      organizationName:
        organization.display_name,

      status:
        "missing_email",

      error:
        "No email is available for this organization."
    };
  }


  const rawToken =
    crypto
      .randomBytes(32)
      .toString("hex");

  const tokenHash =
    crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

  const inviteRows =
    await sql`
      INSERT INTO hub_nonprofit_claim_invites (
        organization_id,
        email,
        token_hash,
        expires_at,
        sent_at,
        send_count,
        created_by
      )

      VALUES (
        ${organization.id},
        ${recipient},
        ${tokenHash},
        now() + interval '14 days',
        now(),
        1,
        ${createdBy}
      )

      RETURNING
        id
    `;

  const inviteId =
    inviteRows[0].id;


  const claimUrl =
    `${baseUrl(req)}/nonprofits/claim.html?token=${encodeURIComponent(rawToken)}`;


  const organizationName =
    organization.display_name ||
    organization.legal_name ||
    "your organization";


  const subject =
    "Claim and update your LINK Community Hub profile";


  const text =
`Your organization is already listed in LINK Community Hub™ · Lake Norman.

Claim your existing profile to confirm or update your organization's information, logo, needs, opportunities, events and contact information.

Organization: ${organizationName}

Claim your profile:
${claimUrl}

This secure link expires in 14 days.

LINK Community Hub™`;


  const html =
`<p>Your organization is already listed in <strong>LINK Community Hub™ · Lake Norman</strong>.</p>

<p>Claim your existing profile to confirm or update your organization's information, logo, needs, opportunities, events and contact information.</p>

<p><strong>Organization:</strong> ${htmlEscape(organizationName)}</p>

<p><a href="${htmlEscape(claimUrl)}">Claim &amp; Update Your LINK Profile</a></p>

<p>This secure link expires in 14 days.</p>

<p>LINK Community Hub™</p>`;


  const delivery =
    await sendLinkEmail({
      to:
        recipient,

      subject,

      html,

      text
    });


  await sql`
    UPDATE hub_nonprofit_claim_invites

    SET
      email_status =
        ${delivery.status},

      email_provider =
        ${delivery.provider},

      email_message_id =
        ${delivery.messageId},

      email_error =
        ${delivery.error || null},

      updated_at =
        now()

    WHERE
      id = ${inviteId}
  `;


  return {
    ok:
      true,

    organizationId:
      organization.id,

    organizationName,

    email:
      recipient,

    claimUrl,

    inviteId,

    delivery
  };
}


async function sendAdminMessage({
  sql,
  req,
  organizationId,
  subject,
  body,
  emailOverride,
  bulkCampaignId = null,
  createdBy
}) {
  const organization =
    await resolveOrganization(
      sql,
      organizationId
    );

  if (!organization) {
    throw new Error(
      "Organization not found."
    );
  }


  const recipient =
    bestEmail(
      organization,
      emailOverride
    );


  const rows =
    await sql`
      INSERT INTO hub_nonprofit_messages (
        organization_id,
        sender_type,
        sender_name,
        subject,
        body,
        bulk_campaign_id,
        email_to,
        created_at
      )

      VALUES (
        ${organization.id},
        'admin',
        ${createdBy},
        ${subject},
        ${body},
        ${bulkCampaignId},
        ${recipient || null},
        now()
      )

      RETURNING
        id
    `;


  const messageId =
    rows[0].id;


  const portalUrl =
    `${baseUrl(req)}/nonprofits/`;


  const emailText =
`${body}

You can reply to LINK and view your organization messages in your nonprofit portal:
${portalUrl}

LINK Community Hub™`;


  const emailHtml =
`<p>${htmlEscape(body).replace(/\n/g, "<br>")}</p>

<p><a href="${htmlEscape(portalUrl)}">Open Your LINK Nonprofit Portal</a></p>

<p>LINK Community Hub™</p>`;


  const delivery =
    await sendLinkEmail({
      to:
        recipient,

      subject,

      html:
        emailHtml,

      text:
        emailText
    });


  await sql`
    UPDATE hub_nonprofit_messages

    SET
      email_status =
        ${delivery.status},

      email_provider =
        ${delivery.provider},

      email_message_id =
        ${delivery.messageId},

      email_error =
        ${delivery.error || null},

      email_sent_at =
        CASE
          WHEN ${delivery.status} = 'sent'
          THEN now()
          ELSE NULL
        END

    WHERE
      id = ${messageId}
  `;


  return {
    messageId,

    organizationId:
      organization.id,

    organizationName:
      organization.display_name,

    email:
      recipient || null,

    delivery
  };
}


export default async function handler(
  req,
  res
) {
  if (
    !requireLinkAdmin(
      req,
      res
    )
  ) {
    return;
  }

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  if (
    !process.env.DATABASE_URL
  ) {
    return res
      .status(503)
      .json({
        ok:
          false,

        error:
          "Database is not configured."
      });
  }


  const sql =
    neon(
      process.env.DATABASE_URL
    );


  try {
    if (
      req.method === "GET"
    ) {
      const [
        organizations,
        messages,
        campaigns
      ] =
        await Promise.all([

          sql`
            SELECT
              o.id,
              o.display_name,
              o.legal_name,
              o.public_email,
              o.public_phone,
              o.city,
              o.state,
              o.active,
              o.approval_status,
              o.claim_status,
              o.renewal_status,

              (
                SELECT
                  c.full_name

                FROM
                  organization_contacts c

                WHERE
                  c.organization_id = o.id

                ORDER BY
                  c.is_primary DESC,
                  c.created_at ASC

                LIMIT 1
              ) AS contact_name,

              (
                SELECT
                  c.email

                FROM
                  organization_contacts c

                WHERE
                  c.organization_id = o.id

                ORDER BY
                  c.is_primary DESC,
                  c.created_at ASC

                LIMIT 1
              ) AS contact_email,

              (
                SELECT
                  s.contact_email

                FROM
                  nonprofit_submissions s

                WHERE
                  s.organization_id = o.id

                  OR lower(
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
              ) AS submission_email,

              (
                SELECT
                  jsonb_build_object(
                    'id',
                    i.id,

                    'email',
                    i.email,

                    'expires_at',
                    i.expires_at,

                    'claimed_at',
                    i.claimed_at,

                    'revoked_at',
                    i.revoked_at,

                    'email_status',
                    i.email_status,

                    'created_at',
                    i.created_at
                  )

                FROM
                  hub_nonprofit_claim_invites i

                WHERE
                  i.organization_id = o.id

                ORDER BY
                  i.created_at DESC

                LIMIT 1
              ) AS latest_claim_invite,

              (
                SELECT
                  count(*)::int

                FROM
                  hub_nonprofit_messages m

                WHERE
                  m.organization_id = o.id
              ) AS message_count,

              (
                SELECT
                  count(*)::int

                FROM
                  hub_nonprofit_messages m

                WHERE
                  m.organization_id = o.id

                  AND
                  m.sender_type = 'nonprofit'

                  AND
                  m.read_by_admin_at IS NULL
              ) AS unread_admin_count

            FROM
              organizations o

            ORDER BY
              o.display_name ASC
          `,


          sql`
            SELECT
              m.*,
              o.display_name AS organization_name

            FROM
              hub_nonprofit_messages m

            LEFT JOIN
              organizations o
                ON o.id = m.organization_id

            ORDER BY
              m.created_at DESC

            LIMIT 500
          `,


          sql`
            SELECT
              c.*,

              COALESCE(
                (
                  SELECT
                    jsonb_agg(
                      jsonb_build_object(
                        'organization_id',
                        r.organization_id,

                        'organization_name',
                        o.display_name,

                        'email',
                        r.email,

                        'delivery_status',
                        r.delivery_status
                      )

                      ORDER BY
                        o.display_name
                    )

                  FROM
                    hub_nonprofit_message_recipients r

                  LEFT JOIN
                    organizations o
                      ON o.id = r.organization_id

                  WHERE
                    r.campaign_id = c.id
                ),
                '[]'::jsonb
              ) AS recipients

            FROM
              hub_nonprofit_message_campaigns c

            ORDER BY
              c.created_at DESC

            LIMIT 100
          `
        ]);


      return res
        .status(200)
        .json({
          ok:
            true,

          emailProvider:
            emailProviderStatus(),

          organizations,

          messages,

          campaigns
        });
    }


    if (
      req.method !== "POST"
    ) {
      res.setHeader(
        "Allow",
        "GET, POST"
      );

      return res
        .status(405)
        .json({
          ok:
            false,

          error:
            "Method not allowed."
        });
    }


    const body =
      req.body || {};

    const action =
      clean(
        body.action,
        80
      );

    const createdBy =
      "LINK Admin";


    /* -------------------------------------------------------
       Individual claim/update invitation
       ------------------------------------------------------- */

    if (
      action === "send_claim_invite"
    ) {
      const organizationId =
        clean(
          body.organizationId,
          100
        );

      if (!organizationId) {
        return res
          .status(400)
          .json({
            ok:
              false,

            error:
              "Organization is required."
          });
      }


      const result =
        await createClaimInvite({
          sql,
          req,

          organizationId,

          email:
            clean(
              body.email,
              320
            ),

          createdBy
        });


      return res
        .status(
          result.ok
            ? 200
            : 422
        )
        .json(result);
    }


    /* -------------------------------------------------------
       Bulk claim/update invitations
       ------------------------------------------------------- */

    if (
      action === "send_bulk_claim_invites"
    ) {
      const organizationIds =
        Array.isArray(
          body.organizationIds
        )
          ? body.organizationIds
            .map(
              value =>
                clean(
                  value,
                  100
                )
            )
            .filter(Boolean)
            .slice(
              0,
              100
            )
          : [];


      if (
        !organizationIds.length
      ) {
        return res
          .status(400)
          .json({
            ok:
              false,

            error:
              "Select at least one organization."
          });
      }


      const results = [];


      for (
        const organizationId
        of organizationIds
      ) {
        try {
          results.push(
            await createClaimInvite({
              sql,
              req,

              organizationId,

              email:
                "",

              createdBy
            })
          );

        } catch (error) {
          results.push({
            ok:
              false,

            organizationId,

            status:
              "failed",

            error:
              error.message
          });
        }
      }


      return res
        .status(200)
        .json({
          ok:
            true,

          results
        });
    }


    /* -------------------------------------------------------
       Approve completed nonprofit claim
       ------------------------------------------------------- */

    if (
      action === "approve_claim"
    ) {
      const organizationId =
        clean(
          body.organizationId,
          100
        );


      if (
        !organizationId
      ) {
        return res
          .status(400)
          .json({
            ok:
              false,

            error:
              "Organization is required."
          });
      }


      const organizations =
        await sql`
          SELECT
            id,
            display_name,
            claim_status

          FROM organizations

          WHERE
            id =
              ${organizationId}::uuid

          LIMIT 1
        `;


      if (
        !organizations.length
      ) {
        return res
          .status(404)
          .json({
            ok:
              false,

            error:
              "Organization not found."
          });
      }


      const organization =
        organizations[0];


      if (
        organization.claim_status ===
          "approved"
      ) {
        return res
          .status(409)
          .json({
            ok:
              false,

            error:
              `${organization.display_name} is already approved and portal-ready.`
          });
      }


      if (
        organization.claim_status !==
          "pending-review"
      ) {
        return res
          .status(409)
          .json({
            ok:
              false,

            error:
              "This nonprofit has not completed a claim awaiting LINK review."
          });
      }


      const completedClaims =
        await sql`
          SELECT
            id,
            email,
            claimed_at

          FROM
            hub_nonprofit_claim_invites

          WHERE
            organization_id =
              ${organizationId}::uuid

            AND claimed_at
              IS NOT NULL

            AND revoked_at
              IS NULL

          ORDER BY
            claimed_at DESC

          LIMIT 1
        `;


      if (
        !completedClaims.length
      ) {
        return res
          .status(409)
          .json({
            ok:
              false,

            error:
              "No completed claim invitation was found for this nonprofit."
          });
      }


      const claim =
        completedClaims[0];


      const authorizedContacts =
        await sql`
          SELECT
            id,
            full_name,
            email

          FROM
            organization_contacts

          WHERE
            organization_id =
              ${organizationId}::uuid

            AND lower(email) =
              lower(${claim.email})

          LIMIT 1
        `;


      if (
        !authorizedContacts.length
      ) {
        return res
          .status(409)
          .json({
            ok:
              false,

            error:
              "The claimed nonprofit contact could not be verified."
          });
      }


      const approved =
        await sql`
          UPDATE organizations

          SET
            claim_status =
              'approved',

            updated_at =
              now()

          WHERE
            id =
              ${organizationId}::uuid

            AND claim_status =
              'pending-review'

          RETURNING
            id,
            display_name,
            claim_status
        `;


      if (
        !approved.length
      ) {
        return res
          .status(409)
          .json({
            ok:
              false,

            error:
              "The claim status changed before approval could be completed. Refresh and review the nonprofit again."
          });
      }


      return res
        .status(200)
        .json({
          ok:
            true,

          organizationId:
            approved[0].id,

          claimStatus:
            approved[0].claim_status,

          contact:
            {
              id:
                authorizedContacts[0].id,

              name:
                authorizedContacts[0].full_name,

              email:
                authorizedContacts[0].email
            },

          message:
            `${approved[0].display_name} is approved and portal-ready.`
        });
    }


    /* -------------------------------------------------------
       Individual message
       ------------------------------------------------------- */

    if (
      action === "send_message"
    ) {
      const organizationId =
        clean(
          body.organizationId,
          100
        );

      const subject =
        clean(
          body.subject,
          240
        );

      const messageBody =
        clean(
          body.body,
          12000
        );


      if (
        !organizationId ||
        !subject ||
        !messageBody
      ) {
        return res
          .status(400)
          .json({
            ok:
              false,

            error:
              "Organization, subject and message are required."
          });
      }


      const result =
        await sendAdminMessage({
          sql,
          req,

          organizationId,

          subject,

          body:
            messageBody,

          emailOverride:
            clean(
              body.email,
              320
            ),

          createdBy
        });


      return res
        .status(200)
        .json({
          ok:
            true,

          result
        });
    }


    /* -------------------------------------------------------
       Bulk message
       ------------------------------------------------------- */

    if (
      action === "send_bulk_message"
    ) {
      const organizationIds =
        Array.isArray(
          body.organizationIds
        )
          ? body.organizationIds
            .map(
              value =>
                clean(
                  value,
                  100
                )
            )
            .filter(Boolean)
            .slice(
              0,
              100
            )
          : [];

      const subject =
        clean(
          body.subject,
          240
        );

      const messageBody =
        clean(
          body.body,
          12000
        );


      if (
        !organizationIds.length ||
        !subject ||
        !messageBody
      ) {
        return res
          .status(400)
          .json({
            ok:
              false,

            error:
              "Recipients, subject and message are required."
          });
      }


      const campaignRows =
        await sql`
          INSERT INTO hub_nonprofit_message_campaigns (
            subject,
            body,
            recipient_count,
            created_by
          )

          VALUES (
            ${subject},
            ${messageBody},
            ${organizationIds.length},
            ${createdBy}
          )

          RETURNING
            id
        `;


      const campaignId =
        campaignRows[0].id;

      const results = [];


      for (
        const organizationId
        of organizationIds
      ) {
        try {
          const result =
            await sendAdminMessage({
              sql,
              req,

              organizationId,

              subject,

              body:
                messageBody,

              emailOverride:
                "",

              bulkCampaignId:
                campaignId,

              createdBy
            });


          await sql`
            INSERT INTO hub_nonprofit_message_recipients (
              campaign_id,
              organization_id,
              message_id,
              email,
              delivery_status,
              delivery_provider,
              delivery_message_id,
              delivery_error
            )

            VALUES (
              ${campaignId},
              ${organizationId},
              ${result.messageId},
              ${result.email},
              ${result.delivery.status},
              ${result.delivery.provider},
              ${result.delivery.messageId},
              ${result.delivery.error || null}
            )
          `;


          results.push({
            ok:
              true,

            ...result
          });

        } catch (error) {
          await sql`
            INSERT INTO hub_nonprofit_message_recipients (
              campaign_id,
              organization_id,
              delivery_status,
              delivery_error
            )

            VALUES (
              ${campaignId},
              ${organizationId},
              'failed',
              ${error.message}
            )
          `;


          results.push({
            ok:
              false,

            organizationId,

            error:
              error.message
          });
        }
      }


      return res
        .status(200)
        .json({
          ok:
            true,

          campaignId,

          results
        });
    }


    /* -------------------------------------------------------
       Mark nonprofit messages read by Admin
       ------------------------------------------------------- */

    if (
      action === "mark_read"
    ) {
      const organizationId =
        clean(
          body.organizationId,
          100
        );

      if (!organizationId) {
        return res
          .status(400)
          .json({
            ok:
              false,

            error:
              "Organization is required."
          });
      }


      await sql`
        UPDATE hub_nonprofit_messages

        SET
          read_by_admin_at =
            COALESCE(
              read_by_admin_at,
              now()
            )

        WHERE
          organization_id =
            ${organizationId}

          AND
          sender_type =
            'nonprofit'
      `;


      return res
        .status(200)
        .json({
          ok:
            true
        });
    }


    return res
      .status(400)
      .json({
        ok:
          false,

        error:
          "Unknown action."
      });

  } catch (error) {
    console.error(
      "LINK communications admin:",
      error
    );

    return res
      .status(500)
      .json({
        ok:
          false,

        error:
          error.message ||
          "Unable to process communication."
      });
  }
}
