const fetch = require('node-fetch');
const { GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN } = require('../config');

/**
 * Minimal "latest release asset" resolver.
 * Expects an asset named `${appId}.zip` OR first .zip asset.
 * Returns { url, name, tag } where url is the GitHub asset browser_download_url.
 */
async function getLatestZipDownload(appId) {
  if (!GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error('Missing GITHUB_OWNER/GITHUB_REPO env vars');
  }
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
  const headers = { 'User-Agent': 'zosfasgen' };
  if (GITHUB_TOKEN) headers.Authorization = `token ${GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const txt = await res.text().catch(()=>"");
    throw new Error(`GitHub API error ${res.status}: ${txt}`);
  }
  const rel = await res.json();
  const assets = rel.assets || [];
  const wantedName = `${appId}.zip`;
  let asset = assets.find(a => (a.name || '').toLowerCase() === wantedName.toLowerCase());
  if (!asset) asset = assets.find(a => (a.name || '').toLowerCase().endsWith('.zip'));
  if (!asset) throw new Error('No .zip assets found in latest release');
  return { url: asset.browser_download_url, name: asset.name, tag: rel.tag_name };
}

module.exports = { getLatestZipDownload };
