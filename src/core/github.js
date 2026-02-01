const fetch = require("node-fetch");

function ghHeaders() {
  const h = { "Accept": "application/vnd.github+json", "User-Agent": "zosfas-full-web-bot" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function getLatestRelease(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const r = await fetch(url, { headers: ghHeaders() });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`GitHub latest release failed: ${r.status} ${t}`);
  }
  return r.json();
}

function pickZipAsset(release, wantedName) {
  const assets = Array.isArray(release.assets) ? release.assets : [];
  if (wantedName) {
    const byName = assets.find(a => (a.name || "").toLowerCase() === wantedName.toLowerCase());
    if (byName) return byName;
  }
  // prefer .zip
  const zip = assets.find(a => (a.name || "").toLowerCase().endsWith(".zip"));
  if (zip) return zip;
  return assets[0] || null;
}

module.exports = { getLatestRelease, pickZipAsset };
