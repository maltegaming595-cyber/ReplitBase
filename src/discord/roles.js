const fetch = require("node-fetch");
const crypto = require("crypto");
const { logger } = require("../util/logger");

function hashRoles(roleIds) {
  return crypto.createHash("sha1").update(roleIds.sort().join(",")).digest("hex");
}

async function fetchMemberRoles(discordUserId) {
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.GUILD_ID;
  if (!token) throw new Error("DISCORD_TOKEN missing");
  if (!guildId) throw new Error("GUILD_ID missing");

  const url = `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bot ${token}` }
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Discord member fetch failed: ${r.status} ${t}`);
  }
  const data = await r.json();
  return Array.isArray(data.roles) ? data.roles : [];
}

async function resolveFlags(discordUserId) {
  const rolePremium = process.env.ROLE_PREMIUM;
  const adminRole = process.env.WEBSITE_ADMIN_ROLE_ID || "1467344940383338662";

  const roles = await fetchMemberRoles(discordUserId);
  const rolesH = hashRoles(roles);

  const isPremium = !!rolePremium && roles.includes(rolePremium);
  const isAdmin = !!adminRole && roles.includes(adminRole);

  return { roles, rolesHash: rolesH, isPremium, isAdmin };
}

module.exports = { fetchMemberRoles, resolveFlags };
