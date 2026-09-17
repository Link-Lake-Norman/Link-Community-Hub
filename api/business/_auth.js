import { neon } from "@neondatabase/serverless";
import { cookieValue, fail, hashToken, randomToken } from "./_util.js";

const BUSINESS_COOKIE = "link_business_session";

export function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  return neon(process.env.DATABASE_URL);
}

export async function createMagicToken(sql, businessId) {
  const recent = await sql`
    SELECT id
    FROM hub_business_magic_tokens
    WHERE business_id = ${businessId}
      AND used_at IS NULL
      AND expires_at > now()
      AND created_at > now() - interval '60 seconds'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (recent.length) return null;

  const token = randomToken(32);
  const tokenHash = hashToken(token);

  await sql`
    INSERT INTO hub_business_magic_tokens (business_id, token_hash, expires_at)
    VALUES (${businessId}, ${tokenHash}, now() + interval '20 minutes')
  `;

  return token;
}

export async function consumeMagicToken(sql, token) {
  const rows = await sql`
    UPDATE hub_business_magic_tokens
    SET used_at = now()
    WHERE token_hash = ${hashToken(token)}
      AND used_at IS NULL
      AND expires_at > now()
    RETURNING business_id
  `;
  return rows[0] || null;
}

export async function createSession(sql, businessId) {
  const token = randomToken(36);
  await sql`
    INSERT INTO hub_business_sessions (business_id, token_hash, expires_at)
    VALUES (${businessId}, ${hashToken(token)}, now() + interval '30 days')
  `;
  return token;
}

export function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${BUSINESS_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${BUSINESS_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}

export async function destroySession(req) {
  const raw = cookieValue(req, BUSINESS_COOKIE);
  if (!raw || !process.env.DATABASE_URL) return;
  const sql = getSql();
  await sql`DELETE FROM hub_business_sessions WHERE token_hash = ${hashToken(raw)}`;
}

export async function getBusinessSession(req, res) {
  if (!process.env.DATABASE_URL) {
    fail(res, 503, "LINK business services are temporarily unavailable.");
    return null;
  }

  const raw = cookieValue(req, BUSINESS_COOKIE);
  if (!raw) {
    fail(res, 401, "Please sign in to your LINK business account.");
    return null;
  }

  const sql = getSql();
  const rows = await sql`
    SELECT b.*
    FROM hub_business_sessions s
    JOIN hub_business_accounts b ON b.id = s.business_id
    WHERE s.token_hash = ${hashToken(raw)}
      AND s.expires_at > now()
      AND b.status <> 'closed'
    LIMIT 1
  `;

  if (!rows.length) {
    clearSessionCookie(res);
    fail(res, 401, "Your LINK session has expired. Please sign in again.");
    return null;
  }

  return { sql, business: rows[0] };
}
