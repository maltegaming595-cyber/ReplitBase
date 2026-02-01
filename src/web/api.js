const express = require("express");
const oauth = require("./oauth");
const { requireAuth } = require("./auth");
const User = require("../db/models/User");
const DownloadEvent = require("../db/models/DownloadEvent");
const { canDownload, logDownload, refreshUserFlags, FREE_LIMIT, getUsage24h } = require("../core/downloads");
const { getLatestRelease, pickZipAsset } = require("../core/github");

const router = express.Router();

router.use(oauth);

// current user
router.get("/me", requireAuth, async (req, res) => {
  const discordId = req.user.discordId;
  const userDoc = await User.findOne({ discordId });
  if (!userDoc) return res.status(401).json({ error: "unauthorized" });

  // try refresh; if discord token missing/invalid, don't hard fail
  try {
    await refreshUserFlags(userDoc);
  } catch (e) {
    // keep previous isPremium/isAdmin; just return as-is
  }

  const used = await getUsage24h(discordId);
  const premium = !!userDoc.isPremium;
  const remaining = premium ? Infinity : Math.max(0, FREE_LIMIT - used);

  res.json({
    discordId,
    username: userDoc.username,
    avatar: userDoc.avatar,
    premium,
    isAdmin: !!userDoc.isAdmin,
    used24h: used,
    remaining24h: premium ? null : remaining,
    freeLimit: FREE_LIMIT
  });
});

// start download (enforces limits and returns asset info)
router.post("/downloads/start", requireAuth, async (req, res) => {
  const discordId = req.user.discordId;
  const resource = (req.body && req.body.resource) ? String(req.body.resource) : "";
  const appId = (req.body && req.body.appId) ? String(req.body.appId) : "";
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!owner || !repo) return res.status(500).json({ error: "GITHUB_OWNER/GITHUB_REPO not set" });

  const wantName = appId ? `${appId}.zip` : (resource || "");
  const check = await canDownload(discordId);
  if (!check.allowed) {
    return res.status(429).json({
      error: "limit_reached",
      premium: check.premium,
      used24h: check.used,
      freeLimit: FREE_LIMIT
    });
  }

  const rel = await getLatestRelease(owner, repo);
  const asset = pickZipAsset(rel, wantName);
  if (!asset) return res.status(404).json({ error: "no_assets_in_latest_release" });

  await logDownload({
    discordId,
    source: "web",
    resource: asset.name || wantName || "unknown.zip",
    meta: { release: rel.tag_name, url: asset.browser_download_url }
  });

  res.json({
    ok: true,
    premium: check.premium,
    used24h: check.used,
    asset: {
      name: asset.name,
      size: asset.size,
      url: asset.browser_download_url,
      releaseTag: rel.tag_name
    }
  });
});

// recent downloads
router.get("/downloads/recent", requireAuth, async (req, res) => {
  const discordId = req.user.discordId;
  const events = await DownloadEvent.find({ discordId }).sort({ createdAt: -1 }).limit(10).lean();
  res.json({ events });
});

module.exports = router;
