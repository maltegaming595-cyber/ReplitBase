const { GUILD_ID, ROLE_PREMIUM, WEBSITE_ADMIN_ROLE_ID } = require('../config');
const { fetchGuildMember } = require('./discordApi');

async function resolveRoles(discordId) {
  const member = await fetchGuildMember(GUILD_ID, discordId);
  const roles = member.roles || [];
  return {
    isPremium: ROLE_PREMIUM ? roles.includes(ROLE_PREMIUM) : false,
    isAdmin: WEBSITE_ADMIN_ROLE_ID ? roles.includes(WEBSITE_ADMIN_ROLE_ID) : false,
    roles
  };
}

module.exports = { resolveRoles };
