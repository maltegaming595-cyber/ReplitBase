const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { logger } = require("../util/logger");
const User = require("../db/models/User");
const { canDownload, logDownload } = require("../core/downloads");
const { getLatestRelease, pickZipAsset } = require("../core/github");

let client;

function buildCommands() {
  return [
    new SlashCommandBuilder()
      .setName("download")
      .setDescription("Get a .zip from the latest GitHub release (limited unless premium).")
      .addStringOption(o => o.setName("appid").setDescription("App ID (downloads appid.zip)").setRequired(false))
      .addStringOption(o => o.setName("name").setDescription("Exact asset name (e.g. 730.zip)").setRequired(false))
      .toJSON()
  ];
}

async function ensureUser(discordUser) {
  const discordId = discordUser.id;
  const username = discordUser.tag || discordUser.username || discordId;
  await User.updateOne(
    { discordId },
    { $set: { discordId, username } },
    { upsert: true }
  );
}

async function onDownload(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!owner || !repo) {
    return interaction.editReply("Server missing GITHUB_OWNER/GITHUB_REPO.");
  }

  const appid = interaction.options.getString("appid") || "";
  const name = interaction.options.getString("name") || "";
  const wantName = name || (appid ? `${appid}.zip` : "");

  await ensureUser(interaction.user);

  const check = await canDownload(interaction.user.id);
  if (!check.allowed) {
    return interaction.editReply(`Limit reached. Free users get 5 downloads per 24h. Premium users are unlimited.`);
  }

  const rel = await getLatestRelease(owner, repo);
  const asset = pickZipAsset(rel, wantName);
  if (!asset) return interaction.editReply("No assets found in latest release.");

  await logDownload({
    discordId: interaction.user.id,
    source: "discord",
    resource: asset.name || wantName || "unknown.zip",
    meta: { release: rel.tag_name, url: asset.browser_download_url }
  });

  const embed = new EmbedBuilder()
    .setTitle("Download ready")
    .setDescription(`[Click here to download **${asset.name}**](${asset.browser_download_url})`)
    .addFields(
      { name: "Release", value: String(rel.tag_name || "latest"), inline: true },
      { name: "Size", value: `${Math.round(asset.size/1024/1024)} MB`, inline: true },
      { name: "Access", value: check.premium ? "Premium (∞)" : `Free (${check.remaining} left)`, inline: true }
    );

  return interaction.editReply({ embeds: [embed] });
}

async function initBot() {
  client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", () => {
    logger.info({ user: client.user?.tag }, "🤖 Bot ready");
  });

  client.on("interactionCreate", async (interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName === "download") return await onDownload(interaction);
    } catch (err) {
      logger.error({ err: err?.message }, "Bot interaction error");
      if (interaction.deferred || interaction.replied) {
        interaction.editReply("Error handling command.");
      } else {
        interaction.reply({ content: "Error handling command.", ephemeral: true });
      }
    }
  });

  const token = process.env.DISCORD_TOKEN;
  await client.login(token);
}

module.exports = { initBot, buildCommands };
