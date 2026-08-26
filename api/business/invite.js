import { getBusinessSession } from "./_auth.js";
import { sendBusinessInvite } from "./_email.js";
import { clean, fail, noStore, parseJsonBody, randomToken, validEmail } from "./_util.js";

const AUDIENCES = new Set([
  "business",
  "nonprofit",
  "school",
  "organization",
  "student",
  "volunteer",
  "community",
  "other"
]);

export default async function handler(req, res) {
  noStore(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    fail(res, 405, "Method not allowed.");
    return;
  }

  const session = await getBusinessSession(req, res);
  if (!session) return;

  try {
    const body = parseJsonBody(req);
    const { sql, business } = session;
    const inviteeName = clean(body.inviteeName, 140) || null;
    const inviteeEmail = clean(body.inviteeEmail, 180).toLowerCase();
    const audienceType = clean(body.audienceType, 50) || "community";

    if (!validEmail(inviteeEmail) || !AUDIENCES.has(audienceType)) {
      fail(res, 400, "Enter a valid email and audience type.");
      return;
    }

    const token = randomToken(24);
    const rows = await sql`
      INSERT INTO hub_invites (
        referrer_type,
        referrer_id,
        referrer_display_name,
        audience_type,
        invitee_name,
        invitee_email,
        invite_token,
        source_context,
        status
      )
      VALUES (
        'business',
        ${business.id},
        ${business.business_name},
        ${audienceType},
        ${inviteeName},
        ${inviteeEmail},
        ${token},
        'business-portal',
        'created'
      )
      RETURNING id
    `;

    let emailResult;
    try {
      emailResult = await sendBusinessInvite({
        req,
        fromBusiness: business,
        inviteeName,
        inviteeEmail,
        audienceType,
        token
      });
    } catch (emailError) {
      console.error("LINK business invite email error:", emailError);
    }

    const sent =
      emailResult &&
      emailResult.configured !== false &&
      !emailResult.error;

    if (!sent) {
      fail(res, 503, "The invitation was saved, but email delivery is not available right now. Please try again later.");
      return;
    }

    await sql`
      UPDATE hub_invites
      SET status = 'sent',
          sent_at = now(),
          updated_at = now()
      WHERE id = ${rows[0].id}
    `;

    await sql`
      INSERT INTO hub_share_events (
        referrer_type,
        referrer_id,
        audience_type,
        channel,
        source_context,
        invite_id
      )
      VALUES (
        'business',
        ${business.id},
        ${audienceType},
        'email',
        'business-portal',
        ${rows[0].id}
      )
    `;

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("LINK business invite error:", error);
    fail(res, 500, "The invitation could not be sent.");
  }
}
