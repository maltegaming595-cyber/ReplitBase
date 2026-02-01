require("dotenv").config();
const { REST, Routes } = require("discord.js");
const { buildCommands } = require("../src/bot/bot");

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  if (!token || !clientId) {
    console.error("Missing DISCORD_TOKEN or CLIENT_ID");
    process.exit(1);
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const body = buildCommands();

  await rest.put(Routes.applicationCommands(clientId), { body });
  console.log("✅ Registered slash commands globally");
}

main().catch((e) => { console.error(e); process.exit(1); });
