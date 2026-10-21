const express = require("express");
const router = express.Router();
const {
  getAllCards,
  addCard,
  deleteCard,
} = require("../controller/paymentController");
const validateRoutes = require("../middleware/validateRoutes");

router.use(validateRoutes);
router.route("/all_cards").get(getAllCards);
router.route("/add_card").post(addCard);
router.route("/delete_card/:id").delete(deleteCard);

module.exports = router;