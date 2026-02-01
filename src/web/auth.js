const jwt = require("jsonwebtoken");

const COOKIE_NAME = "zosfas_session";

function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    const payload = jwt.verify(token, process.env.WEBSITE_JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}

function setSessionCookie(res, payload) {
  const token = jwt.sign(payload, process.env.WEBSITE_JWT_SECRET, { expiresIn: "7d" });
  const secure = (process.env.COOKIE_SECURE ?? "true").toLowerCase() === "true";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

module.exports = { requireAuth, setSessionCookie, clearSessionCookie, COOKIE_NAME };
