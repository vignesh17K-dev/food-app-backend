const expressAsyncHandler = require("express-async-handler");
const Notification = require("../models/notificationModel");
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

module.exports = {
  getNotifications,
  markNotificationRead,
};
