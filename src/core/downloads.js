const DownloadEvent = require("../db/models/DownloadEvent");
const User = require("../db/models/User");
const { resolveFlags } = require("../discord/roles");

const FREE_LIMIT = 5;
const ROLE_CACHE_MS = 5 * 60 * 1000; // 5 min
const WINDOW_MS = 24 * 60 * 60 * 1000;

async function refreshUserFlags(user) {
  const now = Date.now();
  const last = user.lastRoleCheckAt ? user.lastRoleCheckAt.getTime() : 0;
  if (now - last < ROLE_CACHE_MS) return user;

  const flags = await resolveFlags(user.discordId);
  await User.updateOne(
    { discordId: user.discordId },
    { 
      $set: {
        isPremium: flags.isPremium,
        isAdmin: flags.isAdmin,
        lastRoleCheckAt: new Date(),
        rolesHash: flags.rolesHash,
      }
    }
  );
  user.isPremium = flags.isPremium;
  user.isAdmin = flags.isAdmin;
  user.lastRoleCheckAt = new Date();
  user.rolesHash = flags.rolesHash;
  return user;
}

async function getUsage24h(discordId) {
  const since = new Date(Date.now() - WINDOW_MS);
  return DownloadEvent.countDocuments({ discordId, createdAt: { $gte: since } });
}

async function canDownload(discordId) {
  const user = await User.findOne({ discordId }).lean();
  if (!user) return { allowed: false, reason: "user_not_found" };

  // refresh with cache
  const userDoc = await User.findOne({ discordId });
  await refreshUserFlags(userDoc);

  if (userDoc.isPremium) return { allowed: true, remaining: Infinity, premium: true, used: await getUsage24h(discordId) };

  const used = await getUsage24h(discordId);
  const remaining = Math.max(0, FREE_LIMIT - used);
  return { allowed: remaining > 0, remaining, premium: false, used };
}

async function logDownload({ discordId, source, resource, meta }) {
  await DownloadEvent.create({ discordId, source, resource, meta: meta || {} });
}

module.exports = { canDownload, logDownload, refreshUserFlags, getUsage24h, FREE_LIMIT };
