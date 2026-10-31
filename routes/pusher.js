const express = require("express");
const validateRoutes = require("../middleware/validateRoutes");
const { PusherAuth } = require("../controller/pusherController");

const router = express.Router();
router.use(validateRoutes);
router.route("/auth").post(PusherAuth);

module.exports = router;
