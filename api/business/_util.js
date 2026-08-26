import crypto from "node:crypto";

export function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function safeUrl(value) {
  const text = clean(value, 500);
  if (!text) return null;
  try {
    const parsed = new URL(text);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export function noStore(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
}

export function fail(res, status, message, details = undefined) {
  const body = { ok: false, error: message };
  if (details !== undefined) body.details = details;
  res.status(status).json(body);
}

export function parseJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body;
}

export function publicBaseUrl(req) {
  const proto = clean(req.headers["x-forwarded-proto"], 20) || "https";
  const host = clean(req.headers["x-forwarded-host"] || req.headers.host, 300);
  const requestBase = host ? `${proto}://${host}` : "";

  // Preview magic links must return to the preview deployment, not production.
  if (process.env.VERCEL_ENV === "preview" && requestBase) {
    return requestBase.replace(/\/+$/, "");
  }

  const configured = clean(process.env.LINK_PUBLIC_URL, 500);
  if (configured) return configured.replace(/\/+$/, "");

  return requestBase
    ? requestBase.replace(/\/+$/, "")
    : "https://www.linkcommunityhub.com";
}

export function cookieValue(req, name) {
  const cookie = String(req.headers.cookie || "");
  for (const piece of cookie.split(";")) {
    const index = piece.indexOf("=");
    if (index === -1) continue;
    const key = piece.slice(0, index).trim();
    if (key === name) return decodeURIComponent(piece.slice(index + 1).trim());
  }
  return "";
}
