const expressAsyncHandler = require("express-async-handler");
const Notification = require("../models/notificationModel");
const PushToken = require("../models/pushTokenModel");
const { formatNotification } = require("../services/orderNotificationService");

const getNotifications = expressAsyncHandler(async (req, res) => {
  const user_id = req.user?.id;
  const items = await Notification.find({ user_id })
    .sort({ createdAt: -1 })
    .limit(100);

  return res.status(200).json({
    data: items.map(formatNotification),
    message: "Fetched notifications",
  });
});

const markNotificationRead = expressAsyncHandler(async (req, res) => {
  const user_id = req.user?.id;
  const { id } = req.params;

  const item = await Notification.findOneAndUpdate(
    { notification_id: id, user_id },
    { $set: { read: true } },
    { new: true }
  );

  if (!item) {
    return res.status(404).json({ message: "Notification not found" });
  }

  return res.status(200).json({
    data: formatNotification(item),
    message: "Notification marked as read",
  });
});

const savePushToken = expressAsyncHandler(async (req, res) => {
  const user_id = req.user?.id;
  const { token, platform } = req.body || {};

  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "token is required" });
  }

  const normalizedPlatform = ["ios", "android"].includes(platform)
    ? platform
    : "unknown";

  await PushToken.findOneAndUpdate(
    { token },
    { user_id, token, platform: normalizedPlatform },
    { upsert: true, new: true }
  );

  return res.status(200).json({ message: "Push token saved" });
});

const removePushToken = expressAsyncHandler(async (req, res) => {
  const user_id = req.user?.id;
  const { token } = req.body || {};

  if (token) {
    await PushToken.deleteOne({ token, user_id });
  } else {
    await PushToken.deleteMany({ user_id });
  }

  return res.status(200).json({ message: "Push token removed" });
});

module.exports = {
  getNotifications,
  markNotificationRead,
  savePushToken,
  removePushToken,
};
