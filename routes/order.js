const express = require("express");
const validateRoutes = require("../middleware/validateRoutes");
const { createOrder, verifyOrder } = require("../controller/ordersController");

const router = express.Router();


router.use(validateRoutes);
router.route('/create_order').post(createOrder);
router.route('/verify_order').post(verifyOrder);

module.exports = router;