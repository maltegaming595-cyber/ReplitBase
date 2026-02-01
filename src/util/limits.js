const DownloadEvent = require('../models/DownloadEvent');
const { FREE_DAILY_LIMIT } = require('../config');

function since24h() {
  return new Date(Date.now() - 24*60*60*1000);
}

async function getUsage24h(discordId) {
  return DownloadEvent.countDocuments({ discordId, createdAt: { $gte: since24h() } });
}

async function canDownload({ discordId, isPremium }) {
  if (isPremium) return { allowed: true, remaining: null, used: null, limit: null };
  const used = await getUsage24h(discordId);
  const limit = FREE_DAILY_LIMIT;
  const remaining = Math.max(0, limit - used);
  return { allowed: used < limit, remaining, used, limit };
}

module.exports = { canDownload, getUsage24h };
