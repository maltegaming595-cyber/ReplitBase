const mongoose = require("mongoose");

const DownloadEventSchema = new mongoose.Schema({
  discordId: { type: String, required: true, index: true },
  source: { type: String, enum: ["web", "discord"], required: true },
  resource: { type: String, required: true },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: () => new Date(), index: true },
}, { timestamps: false });

module.exports = mongoose.model("DownloadEvent", DownloadEventSchema);
