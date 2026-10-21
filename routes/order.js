const express = require("express");
const validateRoutes = require("../middleware/validateRoutes");
const { createOrder } = require("../controller/ordersController");

const router = express.Router();


router.use(validateRoutes);
router.route('/create_order').post(createOrder);

module.exports = router;