export function requireLinkAdmin(req, res) {
  const expected =
    process.env.LINK_ADMIN_SECRET;

  if (!expected) {
    res.status(503).json({
      ok: false,
      error:
        "LINK admin authentication is not configured."
    });

    return false;
  }

  const auth =
    String(
      req.headers.authorization ||
      ""
    );

  if (
    !auth.startsWith("Bearer ") ||
    auth.slice(7) !== expected
  ) {
    res.status(401).json({
      ok: false,
      error: "Unauthorized."
    });

    return false;
  }

  return true;
}
