function fromAddress() {
  return (
    process.env.LINK_FROM_EMAIL ||
    process.env.LINK_EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.POSTMARK_FROM_EMAIL ||
    ""
  );
}


async function sendResend({
  to,
  subject,
  html,
  text
}) {
  const from =
    fromAddress();

  if (
    !process.env.RESEND_API_KEY ||
    !from
  ) {
    return null;
  }

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${process.env.RESEND_API_KEY}`,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            from,
            to: [to],
            subject,
            html,
            text
          })
      }
    );

  const payload =
    await response.json()
      .catch(
        () => ({})
      );

  if (!response.ok) {
    throw new Error(
      payload.message ||
      "Resend delivery failed."
    );
  }

  return {
    status:
      "sent",

    provider:
      "resend",

    messageId:
      payload.id || null
  };
}


async function sendSendGrid({
  to,
  subject,
  html,
  text
}) {
  const from =
    fromAddress();

  if (
    !process.env.SENDGRID_API_KEY ||
    !from
  ) {
    return null;
  }

  const response =
    await fetch(
      "https://api.sendgrid.com/v3/mail/send",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${process.env.SENDGRID_API_KEY}`,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            personalizations: [
              {
                to: [
                  {
                    email: to
                  }
                ]
              }
            ],

            from: {
              email: from
                .replace(
                  /^.*<([^>]+)>.*$/,
                  "$1"
                )
            },

            subject,

            content: [
              {
                type:
                  "text/plain",
                value:
                  text || ""
              },

              {
                type:
                  "text/html",
                value:
                  html || ""
              }
            ]
          })
      }
    );

  if (!response.ok) {
    const message =
      await response.text()
        .catch(
          () => ""
        );

    throw new Error(
      message ||
      "SendGrid delivery failed."
    );
  }

  return {
    status:
      "sent",

    provider:
      "sendgrid",

    messageId:
      response.headers.get(
        "x-message-id"
      )
  };
}


async function sendPostmark({
  to,
  subject,
  html,
  text
}) {
  const from =
    fromAddress();

  if (
    !process.env.POSTMARK_SERVER_TOKEN ||
    !from
  ) {
    return null;
  }

  const response =
    await fetch(
      "https://api.postmarkapp.com/email",
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          "X-Postmark-Server-Token":
            process.env.POSTMARK_SERVER_TOKEN
        },

        body:
          JSON.stringify({
            From: from,
            To: to,
            Subject: subject,
            HtmlBody: html,
            TextBody: text
          })
      }
    );

  const payload =
    await response.json()
      .catch(
        () => ({})
      );

  if (!response.ok) {
    throw new Error(
      payload.Message ||
      "Postmark delivery failed."
    );
  }

  return {
    status:
      "sent",

    provider:
      "postmark",

    messageId:
      payload.MessageID || null
  };
}


export async function sendLinkEmail({
  to,
  subject,
  html,
  text
}) {
  if (!to) {
    return {
      status:
        "no_email",

      provider:
        null,

      messageId:
        null,

      error:
        "No recipient email."
    };
  }

  try {
    const resend =
      await sendResend({
        to,
        subject,
        html,
        text
      });

    if (resend) {
      return resend;
    }

    const sendgrid =
      await sendSendGrid({
        to,
        subject,
        html,
        text
      });

    if (sendgrid) {
      return sendgrid;
    }

    const postmark =
      await sendPostmark({
        to,
        subject,
        html,
        text
      });

    if (postmark) {
      return postmark;
    }

    return {
      status:
        "not_configured",

      provider:
        null,

      messageId:
        null,

      error:
        "Email provider not configured."
    };

  } catch (error) {
    return {
      status:
        "failed",

      provider:
        null,

      messageId:
        null,

      error:
        error.message ||
        "Email delivery failed."
    };
  }
}


export function emailProviderStatus() {
  const from =
    fromAddress();

  if (
    process.env.RESEND_API_KEY &&
    from
  ) {
    return "resend";
  }

  if (
    process.env.SENDGRID_API_KEY &&
    from
  ) {
    return "sendgrid";
  }

  if (
    process.env.POSTMARK_SERVER_TOKEN &&
    from
  ) {
    return "postmark";
  }

  return "not_configured";
}
