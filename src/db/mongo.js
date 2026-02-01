const mongoose = require("mongoose");
const { logger } = require("../util/logger");

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  logger.info("✅ MongoDB connected");
}

module.exports = { connectMongo };
