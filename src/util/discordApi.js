const fetch = require('node-fetch');
const { DISCORD_TOKEN } = require('../config');

async function fetchGuildMember(guildId, userId) {
  if (!DISCORD_TOKEN) throw new Error('DISCORD_TOKEN missing');
  const url = `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bot ${DISCORD_TOKEN}` }
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error(`Discord API error ${res.status}: ${txt}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

module.exports = { fetchGuildMember };
