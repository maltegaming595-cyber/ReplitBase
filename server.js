require("dotenv").config();
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { connectMongo } = require("./src/db/mongo");
const { logger } = require("./src/util/logger");
const { initBot } = require("./src/bot/bot");
const api = require("./src/web/api");

const PORT = process.env.PORT || 10000;
const ENABLE_WEB = (process.env.ENABLE_WEB ?? "true").toLowerCase() === "true";

async function main() {
  await connectMongo();

  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({
    contentSecurityPolicy: false, // keep simple for now
  }));
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  // light global rate limit (adjust if needed)
  app.use(rateLimit({
    windowMs: 60_000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  if (ENABLE_WEB) {
    app.use("/", express.static(path.join(__dirname, "src", "web", "public")));
  }

  app.use("/api", api);

  app.get("/healthz", (req, res) => res.json({ ok: true }));

  app.listen(PORT, () => {
    logger.info({ PORT }, "🌐 Website/API listening");
  });

  // Start bot *after* web is up; never crash the process if bot fails.
  if ((process.env.DISCORD_TOKEN || "").length > 0) {
    initBot().catch((err) => {
      logger.error({ err: err?.message, code: err?.code }, "⚠️ Bot failed to start (web still running)");
    });
  } else {
    logger.warn("⚠️ DISCORD_TOKEN not set; bot will not start (web still running)");
  }
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
