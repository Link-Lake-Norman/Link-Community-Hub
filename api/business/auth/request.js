import { createMagicToken, getSql } from "../_auth.js";
import { sendBusinessMagicLink } from "../_email.js";
import { clean, noStore, parseJsonBody, validEmail } from "../_util.js";

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); res.status(405).json({ ok: false, error: "Method not allowed." }); return; }
  const generic = { ok: true, message: "If a LINK business account exists for that email, a secure sign-in link is on the way." };
  if (!process.env.DATABASE_URL) { res.status(200).json(generic); return; }
  try {
    const email = clean(parseJsonBody(req).email, 180).toLowerCase();
    if (!validEmail(email)) { res.status(200).json(generic); return; }
    const sql = getSql();
    const rows = await sql`SELECT id, business_name, contact_name, email, status FROM hub_business_accounts WHERE lower(email) = ${email} AND status <> 'closed' LIMIT 1`;
    if (!rows.length) { res.status(200).json(generic); return; }
    const business = rows[0];
    const token = await createMagicToken(sql, business.id);
    try { await sendBusinessMagicLink({ req, businessName: business.business_name, contactName: business.contact_name, email: business.email, token }); } catch (emailError) { console.error("LINK business login email error:", emailError); }
    res.status(200).json(generic);
  } catch (error) {
    console.error("LINK business auth request error:", error);
    res.status(200).json(generic);
  }
}
