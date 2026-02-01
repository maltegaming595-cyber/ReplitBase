const { Client, GatewayIntentBits } = require('discord.js');
const { DISCORD_TOKEN } = require('./config');
const { logDiscordDownload } = require('./discord_download');

async function startBot() {
  if (!DISCORD_TOKEN) throw new Error('DISCORD_TOKEN missing');
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
  });

  // Minimal command handler placeholder:
  // You can integrate your existing commands; keep download enforcement server-side if desired.
  // Here we just demonstrate logging for a "download" action.
  client.on('interactionCreate', async (interaction) => {
    // noop - integrate your existing handlers here.
  });

  await client.login(DISCORD_TOKEN);
  return client;
}

module.exports = { startBot };
