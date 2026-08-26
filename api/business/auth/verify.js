import { consumeMagicToken, createSession, getSql, setSessionCookie } from "../_auth.js";
import { clean } from "../_util.js";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); res.status(405).send("Method not allowed."); return; }
  if (!process.env.DATABASE_URL) { res.status(503).send("LINK business sign-in is temporarily unavailable."); return; }
  try {
    const token = clean(req.query?.token, 300);
    if (!token) { res.redirect(302, "/business/?error=invalid-link"); return; }
    const sql = getSql();
    const consumed = await consumeMagicToken(sql, token);
    if (!consumed) { res.redirect(302, "/business/?error=expired-link"); return; }
    await sql`UPDATE hub_business_accounts SET email_verified_at = COALESCE(email_verified_at, now()), status = CASE WHEN status = 'pending' THEN 'active' ELSE status END, updated_at = now() WHERE id = ${consumed.business_id}`;
    const sessionToken = await createSession(sql, consumed.business_id);
    setSessionCookie(res, sessionToken);
    res.redirect(302, "/business/portal.html");
  } catch (error) {
    console.error("LINK business auth verify error:", error);
    res.redirect(302, "/business/?error=invalid-link");
  }
}
