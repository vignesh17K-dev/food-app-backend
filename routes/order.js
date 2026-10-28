const express = require("express");
const validateRoutes = require("../middleware/validateRoutes");
const { createOrder, verifyOrder, getOrders } = require("../controller/ordersController");

const router = express.Router();


router.use(validateRoutes);
router.route('/create_order').post(createOrder);
router.route('/verify_order').post(verifyOrder);
router.route('/get_orders').get(getOrders);

module.exports = router;