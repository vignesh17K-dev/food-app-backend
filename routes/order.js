const express = require("express");
const validateRoutes = require("../middleware/validateRoutes");
const {
  createOrder,
  verifyOrder,
  getOrders,
} = require("../controller/ordersController");
const { advanceStatus } = require("../controller/advanceStatusController");

const router = express.Router();

// QStash webhook — no user JWT (signature verified in controller)
// router.route("/advance_status").post(advanceStatus);

router.use(validateRoutes);
router.route("/create_order").post(createOrder);
router.route("/verify_order").post(verifyOrder);
router.route("/get_orders").get(getOrders);

module.exports = router;
