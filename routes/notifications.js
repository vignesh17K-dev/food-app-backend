const express = require("express");
const validateRoutes = require("../middleware/validateRoutes");
const {
  getNotifications,
  markNotificationRead,
  savePushToken,
  removePushToken,
} = require("../controller/notificationController");

const router = express.Router();

router.get("/", validateRoutes, getNotifications);
router.post("/push_token", validateRoutes, savePushToken);
router.post("/push_token/remove", validateRoutes, removePushToken);
router.post("/:id/read", validateRoutes, markNotificationRead);

module.exports = router;
