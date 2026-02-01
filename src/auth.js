const jwt = require('jsonwebtoken');
const { WEBSITE_JWT_SECRET, COOKIE_SECURE } = require('./config');

const COOKIE_NAME = 'zosfas_session';

function signSession(payload) {
  return jwt.sign(payload, WEBSITE_JWT_SECRET, { expiresIn: '7d' });
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function requireAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'not_logged_in' });
    req.user = jwt.verify(token, WEBSITE_JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid_session' });
  }
}

module.exports = { COOKIE_NAME, signSession, setSessionCookie, clearSessionCookie, requireAuth };
