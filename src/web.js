const express = require('express');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');
const { CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, PORT } = require('./config');
const { signSession, setSessionCookie, clearSessionCookie, requireAuth } = require('./auth');
const { resolveRoles } = require('./util/premium');
const { canDownload, getUsage24h } = require('./util/limits');
const DownloadEvent = require('./models/DownloadEvent');
const { getLatestZipDownload } = require('./util/githubDownload');

function buildAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify'
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

function startWebServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // basic homepage
  app.get('/', (req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>ZosfasGen</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:0;background:#0b0f17;color:#e9eef7}
    .wrap{max-width:780px;margin:0 auto;padding:24px}
    .card{background:#121a29;border:1px solid #22304a;border-radius:16px;padding:18px;margin:12px 0}
    input,button{font-size:16px;padding:10px 12px;border-radius:12px;border:1px solid #2a3a57;background:#0b1322;color:#e9eef7}
    button{cursor:pointer}
    .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .muted{opacity:.8}
    .pill{display:inline-block;padding:6px 10px;border-radius:999px;background:#0b1322;border:1px solid #2a3a57}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>ZosfasGen</h1>
    <div class="card">
      <div class="row">
        <a href="/auth/discord"><button>Login with Discord</button></a>
        <button onclick="logout()">Logout</button>
      </div>
      <p class="muted">Premium sync is role-based. Free users: 5 downloads / 24h.</p>
    </div>

    <div class="card">
      <h3>Your status</h3>
      <pre id="me">Loading...</pre>
      <button onclick="refreshMe()">Refresh</button>
    </div>

    <div class="card">
      <h3>Download</h3>
      <div class="row">
        <input id="appid" placeholder="app id (e.g. 12345)" />
        <button onclick="startDownload()">Get download link</button>
      </div>
      <pre id="dl"></pre>
    </div>

    <div class="card">
      <h3>Recent downloads</h3>
      <pre id="recent">Loading...</pre>
    </div>
  </div>

<script>
async function refreshMe(){
  const r = await fetch('/api/me');
  document.getElementById('me').textContent = await r.text();
}
async function loadRecent(){
  const r = await fetch('/api/downloads/recent');
  document.getElementById('recent').textContent = await r.text();
}
async function startDownload(){
  const appid = document.getElementById('appid').value.trim();
  const r = await fetch('/api/downloads/start', {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify({ appId: appid })
  });
  document.getElementById('dl').textContent = await r.text();
}
async function logout(){
  await fetch('/api/logout',{method:'POST'});
  await refreshMe(); await loadRecent();
}
refreshMe(); loadRecent();
</script>
</body>
</html>`);
  });

  // OAuth start
  app.get('/auth/discord', (req, res) => {
    if (!CLIENT_ID) return res.status(500).send('Missing CLIENT_ID');
    if (!DISCORD_REDIRECT_URI) return res.status(500).send('Missing DISCORD_REDIRECT_URI');
    return res.redirect(buildAuthUrl());
  });

  // OAuth callback
  app.get('/auth/discord/callback', async (req, res) => {
    try {
      const code = req.query.code;
      if (!code) return res.status(400).send('Missing code');

      const body = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code.toString(),
        redirect_uri: DISCORD_REDIRECT_URI
      });

      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      if (!tokenRes.ok) {
        const txt = await tokenRes.text().catch(()=>"");
        return res.status(400).send(`OAuth token exchange failed: ${txt}`);
      }
      const token = await tokenRes.json();
      const accessToken = token.access_token;

      const meRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!meRes.ok) return res.status(400).send('Failed to fetch user');
      const me = await meRes.json();

      const session = signSession({
        discordId: me.id,
        username: me.username,
        avatar: me.avatar
      });
      setSessionCookie(res, session);
      return res.redirect('/');
    } catch (e) {
      return res.status(500).send(`Auth error: ${e.message}`);
    }
  });

  // API: me
  app.get('/api/me', requireAuth, async (req, res) => {
    try {
      const { isPremium, isAdmin } = await resolveRoles(req.user.discordId);
      const used24h = await getUsage24h(req.user.discordId);
      const limitInfo = await canDownload({ discordId: req.user.discordId, isPremium });
      res.json({
        discordId: req.user.discordId,
        username: req.user.username,
        isPremium,
        isAdmin,
        used24h,
        remaining24h: isPremium ? "∞" : limitInfo.remaining
      });
    } catch (e) {
      // If DISCORD_TOKEN invalid, still return session basics (site stays up)
      res.json({
        discordId: req.user.discordId,
        username: req.user.username,
        roleCheckError: e.message
      });
    }
  });

  // API: logout
  app.post('/api/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  // API: start download
  app.post('/api/downloads/start', requireAuth, async (req, res) => {
    const appId = (req.body.appId || '').toString().trim();
    if (!appId) return res.status(400).json({ error: 'missing_appId' });

    let isPremium = false;
    try {
      const roles = await resolveRoles(req.user.discordId);
      isPremium = roles.isPremium;
    } catch (e) {
      // If bot token is broken we can't role-check; treat as non-premium.
      isPremium = false;
    }

    const lim = await canDownload({ discordId: req.user.discordId, isPremium });
    if (!lim.allowed) {
      return res.status(429).json({
        error: 'limit_reached',
        message: 'You reached 5 downloads in the last 24 hours. Premium = unlimited.',
        used: lim.used,
        limit: lim.limit
      });
    }

    // Log event first (server-side enforcement)
    await DownloadEvent.create({
      discordId: req.user.discordId,
      source: 'web',
      resource: `github:${appId}`
    });

    // Resolve a download link from latest release
    try {
      const dl = await getLatestZipDownload(appId);
      return res.json({ ok: true, appId, ...dl, note: 'Open the url to download.' });
    } catch (e) {
      return res.status(500).json({ error: 'github_resolve_failed', message: e.message });
    }
  });

  app.get('/api/downloads/recent', requireAuth, async (req, res) => {
    const rows = await DownloadEvent.find({ discordId: req.user.discordId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json(rows.map(r => ({
      when: r.createdAt,
      source: r.source,
      resource: r.resource
    })));
  });

  app.listen(PORT, () => console.log(`🌐 Website listening on :${PORT}`));
  return app;
}

module.exports = { startWebServer };
