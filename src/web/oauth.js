const express = require("express");
const fetch = require("node-fetch");
const { z } = require("zod");
const { setSessionCookie, clearSessionCookie } = require("./auth");
const User = require("../db/models/User");
const { logger } = require("../util/logger");

const router = express.Router();

function getBaseUrl(req) {
  // Works on Render and locally
  const explicit = process.env.WEBSITE_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

router.get("/auth/discord", (req, res) => {
  const clientId = process.env.CLIENT_ID;
  const redirect = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !redirect) return res.status(500).send("Missing CLIENT_ID or DISCORD_REDIRECT_URI");
  const state = Math.random().toString(16).slice(2);
  res.cookie("oauth_state", state, { httpOnly: true, sameSite: "lax", secure: (process.env.COOKIE_SECURE ?? "true")==="true", maxAge: 10*60*1000 });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: "identify"
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}&state=${state}`);
});

router.get("/auth/discord/callback", async (req, res) => {
  const schema = z.object({ code: z.string(), state: z.string().optional() });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).send("Invalid callback params");

  const expectedState = req.cookies["oauth_state"];
  if (expectedState && parsed.data.state && expectedState !== parsed.data.state) {
    return res.status(400).send("State mismatch");
  }

  const code = parsed.data.code;
  const redirect = process.env.DISCORD_REDIRECT_URI;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!redirect || !clientId || !clientSecret) return res.status(500).send("Missing OAuth env vars");

  const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirect,
    })
  });

  if (!tokenRes.ok) {
    const t = await tokenRes.text().catch(() => "");
    logger.warn({ t }, "OAuth token exchange failed");
    return res.status(400).send("OAuth token exchange failed");
  }
  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;

  const meRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!meRes.ok) return res.status(400).send("Failed to fetch user");
  const me = await meRes.json();

  const discordId = me.id;
  const username = `${me.username}${me.discriminator && me.discriminator !== "0" ? "#" + me.discriminator : ""}`;
  const avatar = me.avatar || "";

  await User.updateOne(
    { discordId },
    { $set: { discordId, username, avatar } },
    { upsert: true }
  );

  setSessionCookie(res, { discordId });

  const base = getBaseUrl(req);
  res.redirect(base + "/");
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

module.exports = router;
