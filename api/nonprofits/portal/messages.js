import {
  session
} from "./_auth.js";

import {
  sendLinkEmail
} from "../_mailer.js";


function clean(
  value,
  max = 10000
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


function safeHtml(
  value
) {
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


export default async function handler(
  req,
  res
) {
  res.setHeader(
    "Cache-Control",
    "no-store"
  );


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


  /*
   * Use the existing nonprofit portal session.
   * This guarantees messages are attached to the
   * exact organization/contact that is signed in.
   */
  const authenticated =
    await session(
      req,
      res
    );


  if (
    !authenticated
  ) {
    return;
  }


  const {
    db,
    org
  } =
    authenticated;


  try {
    if (
      req.method === "GET"
    ) {
      const messages =
        await db`
          SELECT
            id,
            sender_type,
            sender_name,
            subject,
            body,
            reply_to_id,
            email_status,
            read_by_admin_at,
            read_by_nonprofit_at,
            created_at

          FROM
            hub_nonprofit_messages

          WHERE
            organization_id =
              ${org.organization_id}

          ORDER BY
            created_at ASC

          LIMIT 500
        `;


      await db`
        UPDATE
          hub_nonprofit_messages

        SET
          read_by_nonprofit_at =
            COALESCE(
              read_by_nonprofit_at,
              now()
            )

        WHERE
          organization_id =
            ${org.organization_id}

          AND sender_type =
            'admin'
      `;


      return res
        .status(200)
        .json({
          ok:
            true,

          organization: {
            id:
              org.organization_id,

            name:
              org.display_name
          },

          messages
        });
    }


    const subject =
      clean(
        req.body?.subject,
        240
      );


    const messageBody =
      clean(
        req.body?.body,
        12000
      );


    const replyToId =
      clean(
        req.body?.replyToId,
        100
      ) || null;


    if (
      !subject ||
      !messageBody
    ) {
      return res
        .status(400)
        .json({
          ok:
            false,

          error:
            "Subject and message are required."
        });
    }


    const inserted =
      await db`
        INSERT INTO
          hub_nonprofit_messages
        (
          organization_id,
          sender_type,
          sender_contact_id,
          sender_name,
          subject,
          body,
          reply_to_id,
          read_by_nonprofit_at
        )

        VALUES
        (
          ${org.organization_id},
          'nonprofit',
          ${org.contact_id},
          ${org.full_name || org.display_name},
          ${subject},
          ${messageBody},
          ${replyToId},
          now()
        )

        RETURNING
          id,
          created_at
      `;


    const messageId =
      inserted[0].id;


    const adminEmail =
      process.env
        .LINK_ADMIN_EMAIL ||
      "";


    const delivery =
      await sendLinkEmail({
        to:
          adminEmail,

        subject:
          `LINK Portal Message — ${org.display_name}: ${subject}`,

        text:
`${org.display_name} sent a message through the LINK nonprofit portal.

Subject: ${subject}

${messageBody}

Open LINK Admin to reply.`,

        html:
`<p>
  <strong>${safeHtml(org.display_name)}</strong>
  sent a message through the LINK nonprofit portal.
</p>

<p>
  <strong>Subject:</strong>
  ${safeHtml(subject)}
</p>

<p>
  ${safeHtml(messageBody).replace(/\n/g, "<br>")}
</p>

<p>
  Open LINK Admin to reply.
</p>`
      });


    await db`
      UPDATE
        hub_nonprofit_messages

      SET
        email_to =
          ${adminEmail || null},

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
            WHEN
              ${delivery.status} =
              'sent'
            THEN
              now()
            ELSE
              NULL
          END

      WHERE
        id =
          ${messageId}
    `;


    return res
      .status(200)
      .json({
        ok:
          true,

        messageId,

        createdAt:
          inserted[0].created_at,

        adminNotification:
          delivery.status
      });

  } catch (error) {
    console.error(
      "LINK nonprofit portal messages:",
      error
    );


    return res
      .status(500)
      .json({
        ok:
          false,

        error:
          "Unable to process nonprofit message."
      });
  }
}
