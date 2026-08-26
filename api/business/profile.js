import { getBusinessSession } from "./_auth.js";
import { clean, fail, noStore, parseJsonBody, safeUrl } from "./_util.js";

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); fail(res, 405, "Method not allowed."); return; }
  const session = await getBusinessSession(req, res); if (!session) return;
  try {
    const body = parseJsonBody(req); const { sql, business } = session;
    const businessName = clean(body.businessName, 180); const contactName = clean(body.contactName, 140);
    const claimWindowMonths = Number(body.claimWindowMonths);
    if (!businessName || !contactName) { fail(res, 400, "Business name and contact name are required."); return; }
    if (![6, 12].includes(claimWindowMonths)) { fail(res, 400, "Choose a 6-month or 12-month nonprofit giving interval."); return; }
    await sql`UPDATE hub_business_accounts SET business_name = ${businessName}, contact_name = ${contactName}, phone = ${clean(body.phone, 50) || null}, website_url = ${safeUrl(body.website)}, claim_window_months = ${claimWindowMonths}, public_profile_enabled = ${body.publicProfileEnabled !== false}, leaderboard_opt_in = ${body.leaderboardOptIn === true}, leaderboard_display_name = ${clean(body.leaderboardDisplayName, 120) || null}, updated_at = now() WHERE id = ${business.id}`;
    res.status(200).json({ ok: true });
  } catch (error) { console.error("LINK business profile update error:", error); fail(res, 500, "Business settings could not be saved."); }
}
