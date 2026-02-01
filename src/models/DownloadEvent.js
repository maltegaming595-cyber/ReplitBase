const mongoose = require('mongoose');

const DownloadEventSchema = new mongoose.Schema({
  discordId: { type: String, required: true, index: true },
  source: { type: String, enum: ['web','discord'], required: true },
  resource: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('DownloadEvent', DownloadEventSchema);
