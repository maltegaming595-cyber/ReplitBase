const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true, index: true },
  username: { type: String, default: "" },
  avatar: { type: String, default: "" },
  isPremium: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  lastRoleCheckAt: { type: Date, default: null },
  rolesHash: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
