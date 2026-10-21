const express = require("express");
const validateRoutes = require("../middleware/validateRoutes");
const { createOrder } = require("../controller/OrderController");

const router = express.Router();


router.use(validateRoutes);
router.route('/create-order').post(createOrder);

module.exports = router;