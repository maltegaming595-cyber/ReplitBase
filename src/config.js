require('dotenv').config();

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

module.exports = {
  PORT: process.env.PORT || 10000,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || "",
  CLIENT_ID: process.env.CLIENT_ID || "",
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || "",
  DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI || "",
  GUILD_ID: process.env.GUILD_ID || "",
  ROLE_PREMIUM: process.env.ROLE_PREMIUM || "",
  WEBSITE_ADMIN_ROLE_ID: process.env.WEBSITE_ADMIN_ROLE_ID || "1467344940383338662",
  MONGODB_URI: process.env.MONGODB_URI || "",
  WEBSITE_JWT_SECRET: process.env.WEBSITE_JWT_SECRET || "",
  COOKIE_SECURE: (process.env.COOKIE_SECURE || "true").toLowerCase() === "true",
  FREE_DAILY_LIMIT: Number(process.env.FREE_DAILY_LIMIT || "5"),
  // GitHub release download settings (match your bot's existing solution)
  GITHUB_OWNER: process.env.GITHUB_OWNER || "",
  GITHUB_REPO: process.env.GITHUB_REPO || "",
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || ""  // optional
};
