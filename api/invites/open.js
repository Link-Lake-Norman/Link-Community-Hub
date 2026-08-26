import { neon } from "@neondatabase/serverless";

function clean(value, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

function destination(audienceType, token) {
  const encoded = encodeURIComponent(token);
  if (audienceType === "business") return `/business/?invite=${encoded}`;
  if (audienceType === "nonprofit") return `/lakenorman/nonprofits/register.html?invite=${encoded}`;
  return `/?invite=${encoded}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).send("Method not allowed.");
    return;
  }

  const token = clean(req.query?.token, 300);
  if (!token || !process.env.DATABASE_URL) {
    res.redirect(302, "/");
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      UPDATE hub_invites
      SET status = CASE
            WHEN status IN ('created', 'sent', 'opened') THEN 'clicked'
            ELSE status
          END,
          opened_at = COALESCE(opened_at, now()),
          clicked_at = COALESCE(clicked_at, now()),
          updated_at = now()
      WHERE invite_token = ${token}
        AND status NOT IN ('expired', 'cancelled')
      RETURNING audience_type
    `;

    res.redirect(302, rows.length ? destination(rows[0].audience_type, token) : "/");
  } catch (error) {
    console.error("LINK invite tracking error:", error);
    res.redirect(302, "/");
  }
}
