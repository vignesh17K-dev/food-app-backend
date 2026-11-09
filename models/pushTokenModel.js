const mongoose = require("mongoose");

const pushTokenSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ["ios", "android", "unknown"], default: "unknown" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PushToken", pushTokenSchema);
