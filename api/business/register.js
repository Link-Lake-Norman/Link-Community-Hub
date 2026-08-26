import { getSql, createMagicToken } from "./_auth.js";
import { sendBusinessMagicLink } from "./_email.js";
import { clean, fail, noStore, parseJsonBody, safeUrl, validEmail } from "./_util.js";

export default async function handler(req, res) {
  noStore(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    fail(res, 405, "Method not allowed.");
    return;
  }

  if (!process.env.DATABASE_URL) {
    fail(res, 503, "LINK business registration is temporarily unavailable.");
    return;
  }

  try {
    const body = parseJsonBody(req);
    const submittedBusinessName = clean(body.businessName, 180);
    const submittedContactName = clean(body.contactName, 140);
    const email = clean(body.email, 180).toLowerCase();
    const phone = clean(body.phone, 50) || null;
    const website = safeUrl(body.website);
    const inviteToken = clean(body.inviteToken, 300) || null;

    if (
      !submittedBusinessName ||
      !submittedContactName ||
      !validEmail(email) ||
      body.termsAccepted !== true
    ) {
      fail(res, 400, "Please complete all required business registration fields.");
      return;
    }

    const sql = getSql();
    const existing = await sql`
      SELECT id, business_name, contact_name, email, status
      FROM hub_business_accounts
      WHERE lower(email) = ${email}
      LIMIT 1
    `;

    let business = existing[0];

    if (!business) {
      const inserted = await sql`
        INSERT INTO hub_business_accounts (
          business_name,
          contact_name,
          email,
          phone,
          website_url,
          claim_window_months,
          status,
          plan_tier,
          active_listing_limit,
          public_profile_enabled,
          terms_accepted_at
        )
        VALUES (
          ${submittedBusinessName},
          ${submittedContactName},
          ${email},
          ${phone},
          ${website},
          12,
          'pending',
          'community_free',
          1,
          true,
          now()
        )
        RETURNING id, business_name, contact_name, email, status
      `;
      business = inserted[0];
    } else if (business.status === "closed") {
      fail(res, 403, "This LINK business account is closed. Please contact LINK for assistance.");
      return;
    }

    // Do not let an unauthenticated re-registration overwrite an existing
    // business profile. Existing owners edit profile data after secure sign-in.

    if (inviteToken) {
      await sql`
        UPDATE hub_invites
        SET status = 'converted',
            converted_at = COALESCE(converted_at, now()),
            updated_at = now()
        WHERE invite_token = ${inviteToken}
          AND audience_type = 'business'
          AND status NOT IN ('expired', 'cancelled')
      `;
    }

    const token = await createMagicToken(sql, business.id);

    if (token) {
      try {
        await sendBusinessMagicLink({
          req,
          businessName: business.business_name,
          contactName: business.contact_name,
          email: business.email,
          token
        });
      } catch (emailError) {
        console.error("LINK business registration email error:", emailError);
      }
    }

    res.status(200).json({
      ok: true,
      message: "Registration received. Check your email for a secure LINK sign-in link."
    });
  } catch (error) {
    console.error("LINK business registration error:", error);
    fail(res, 500, "Business registration could not be completed.");
  }
}
