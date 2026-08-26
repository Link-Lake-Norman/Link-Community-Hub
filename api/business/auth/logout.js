import { clearSessionCookie, destroySession } from "../_auth.js";
import { noStore } from "../_util.js";

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); res.status(405).json({ ok: false, error: "Method not allowed." }); return; }
  try { await destroySession(req); } catch (error) { console.error("LINK business logout cleanup error:", error); }
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
