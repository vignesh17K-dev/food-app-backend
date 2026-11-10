const express = require("express");
const validateRoutes = require("../middleware/validateRoutes");
const {
  getNotifications,
  markNotificationRead,
} = require("../controller/notificationController");

const router = express.Router();

router.get("/", validateRoutes, getNotifications);
router.post("/:id/read", validateRoutes, markNotificationRead);

module.exports = router;
