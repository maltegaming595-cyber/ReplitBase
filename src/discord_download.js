const DownloadEvent = require('./models/DownloadEvent');

async function logDiscordDownload(discordId, resource) {
  await DownloadEvent.create({ discordId, source: 'discord', resource });
}

module.exports = { logDiscordDownload };
