import crypto from "crypto";

import {
  sql,
  token as sessionToken,
  tokenHash as sessionTokenHash,
  setCookie
} from "./portal/_auth.js";


function clean(
  value,
  max = 2000
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


function claimTokenHash(
  token
) {
  return crypto
    .createHash(
      "sha256"
    )
    .update(token)
    .digest(
      "hex"
    );
}


function maskEmail(
  email
) {
  const [
    local,
    domain
  ] =
    String(
      email || ""
    )
      .split("@");


  if (
    !local ||
    !domain
  ) {
    return email || "";
  }


  return (
    local.slice(
      0,
      Math.min(
        2,
        local.length
      )
    )
    +
    "***@"
    +
    domain
  );
}


function noStore(
  res
) {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );
}


export default async function handler(
  req,
  res
) {
  noStore(res);


  if (
    req.method !== "GET" &&
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


  const requestToken =
    clean(
      req.method === "GET"
        ? req.query?.token
        : req.body?.token,
      300
    );


  if (
    !requestToken
  ) {
    return res
      .status(400)
      .json({
        ok:
          false,

        error:
          "Claim token is required."
      });
  }


  const db =
    sql();


  try {
    const hash =
      claimTokenHash(
        requestToken
      );


    const rows =
      await db`
        SELECT
          i.id,
          i.organization_id,
          i.email,
          i.expires_at,
          i.claimed_at,
          i.revoked_at,

          o.display_name,
          o.legal_name,
          o.active,
          o.approval_status,
          o.service_area_verified

        FROM
          hub_nonprofit_claim_invites i

        INNER JOIN
          organizations o
            ON o.id =
              i.organization_id

        WHERE
          i.token_hash =
            ${hash}

        LIMIT 1
      `;


    const invite =
      rows[0];


    if (
      !invite
    ) {
      return res
        .status(404)
        .json({
          ok:
            false,

          error:
            "This claim link is not valid."
        });
    }


    if (
      invite.revoked_at
    ) {
      return res
        .status(410)
        .json({
          ok:
            false,

          error:
            "This claim link has been revoked."
        });
    }


    if (
      invite.claimed_at
    ) {
      return res
        .status(410)
        .json({
          ok:
            false,

          error:
            "This invitation has already been used."
        });
    }


    if (
      new Date(
        invite.expires_at
      ).getTime()
      <
      Date.now()
    ) {
      return res
        .status(410)
        .json({
          ok:
            false,

          error:
            "This claim link has expired."
        });
    }


    if (
      !invite.active ||
      invite.approval_status !==
        "approved" ||
      !invite.service_area_verified
    ) {
      return res
        .status(403)
        .json({
          ok:
            false,

          error:
            "This organization is not currently eligible for portal access. Please contact LINK."
        });
    }


    if (
      req.method === "GET"
    ) {
      return res
        .status(200)
        .json({
          ok:
            true,

          organization: {
            id:
              invite.organization_id,

            name:
              invite.display_name ||
              invite.legal_name
          },

          email:
            invite.email,

          maskedEmail:
            maskEmail(
              invite.email
            ),

          expiresAt:
            invite.expires_at
        });
    }


    const fullName =
      clean(
        req.body?.fullName,
        250
      );


    const title =
      clean(
        req.body?.title,
        250
      );


    const phone =
      clean(
        req.body?.phone,
        80
      );


    if (
      !fullName
    ) {
      return res
        .status(400)
        .json({
          ok:
            false,

          error:
            "Your name is required."
        });
    }


    /*
     * Find an existing authorized contact for this
     * existing organization and email.
     */
    const contacts =
      await db`
        SELECT
          id

        FROM
          organization_contacts

        WHERE
          organization_id =
            ${invite.organization_id}

          AND lower(email) =
            lower(${invite.email})

        LIMIT 1
      `;


    let contactId;


    if (
      contacts.length
    ) {
      const updated =
        await db`
          UPDATE
            organization_contacts

          SET
            full_name =
              ${fullName},

            title =
              ${title || null},

            phone =
              ${phone || null},

            updated_at =
              now()

          WHERE
            id =
              ${contacts[0].id}

          RETURNING
            id
        `;


      contactId =
        updated[0].id;

    } else {
      const existingPrimary =
        await db`
          SELECT
            id

          FROM
            organization_contacts

          WHERE
            organization_id =
              ${invite.organization_id}

            AND is_primary =
              true

          LIMIT 1
        `;


      const inserted =
        await db`
          INSERT INTO
            organization_contacts
          (
            id,
            organization_id,
            full_name,
            title,
            email,
            phone,
            is_primary,
            is_public,
            created_at,
            updated_at
          )

          VALUES
          (
            ${crypto.randomUUID()},
            ${invite.organization_id},
            ${fullName},
            ${title || null},
            ${String(invite.email).toLowerCase()},
            ${phone || null},
            ${existingPrimary.length === 0},
            false,
            now(),
            now()
          )

          RETURNING
            id
        `;


      contactId =
        inserted[0].id;
    }


    /*
     * Portal access is granted only after LINK
     * approves this completed organization claim.
     */

    


    /*
     * Only mark the claim used after the normal portal
     * session has been successfully created.
     */
    await db`
      UPDATE
        hub_nonprofit_claim_invites

      SET
        claimed_at =
          now(),

        updated_at =
          now()

      WHERE
        id =
          ${invite.id}
    `;

    /*
     * Claiming connects the representative to the
     * EXISTING organization record.
     *
     * LINK approval remains a separate step.
     */
    await db`
      UPDATE organizations

      SET
        claim_status =
          CASE
            WHEN claim_status = 'approved'
              THEN 'approved'
            ELSE 'pending-review'
          END

      WHERE
        id = ${invite.organization_id}
    `;


    


    return res
      .status(200)
      .json({
        ok:
          true,

        organizationName:
          invite.display_name ||
          invite.legal_name,

        organizationId:
          invite.organization_id,

        contactId,

        portalUrl:
          "/nonprofits/?claim=pending-review"
      });

  } catch (error) {
    console.error(
      "LINK nonprofit claim:",
      error
    );


    return res
      .status(500)
      .json({
        ok:
          false,

        error:
          "Unable to claim this nonprofit profile."
      });
  }
}
