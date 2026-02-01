# Zosfas Full (Website + Discord Bot)

This is a Render-safe, **full** setup that runs:
- a member website (Discord OAuth)
- a Discord bot (discord.js v14)

## Key features
- **Premium sync**: Premium = user has `ROLE_PREMIUM` in `GUILD_ID`.
- **Download limits**: free users get **5 downloads / rolling 24h**, premium = unlimited.
- **Shared enforcement**: both website + bot call the same server-side limiter.
- **GitHub downloads**: resolves the **latest GitHub release** and returns/streams `.zip` assets.

## Render settings
- Build command: `npm ci` (or `npm install`)
- Start command: `npm start`
- Root directory: *(empty)*

## Environment variables (Render)
Required:
- `MONGODB_URI`
- `DISCORD_TOKEN` (bot token)
- `CLIENT_ID` (Discord app client id)
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI` (e.g. `https://YOUR.onrender.com/auth/discord/callback`)
- `WEBSITE_JWT_SECRET` (random long string)
- `GUILD_ID`
- `ROLE_PREMIUM`
Optional:
- `WEBSITE_ADMIN_ROLE_ID` (defaults to `1467344940383338662`)
- `COOKIE_SECURE` (`true` on Render)
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_TOKEN` (recommended if private / rate limits)

## Discord OAuth settings
Add the redirect in the Discord developer portal:
`https://YOUR.onrender.com/auth/discord/callback`

## Slash commands
This repo includes `/download` as an example. Register it with:
`npm run register:commands`

