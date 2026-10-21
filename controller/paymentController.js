const asyncHandler = require("express-async-handler");
const { validate: validateUuid } = require("uuid");
const PaymentMethod = require("../models/paymentModel");

const getUserId = (req) => req?.user?.id;

const getAllCards = asyncHandler(async (req, res) => {
  const user_id = getUserId(req);
  if (!user_id) {
    return res.status(401).json({ message: "User Id is required" });
  }

  const cards = await PaymentMethod.find({ user_id })
    .select(
      "payment_method_id provider brand last4 expiryMonth expiryYear createdAt"
    )
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    status: 200,
    data: cards,
    message: "Cards fetched successfully",
  });
});

const addCard = asyncHandler(async (req, res) => {
  const user_id = getUserId(req);
  const allowedBrands = ["Visa", "Mastercard", "RuPay"];
  if (!user_id) {
    return res.status(401).json({ message: "User Id is required" });
  }

  const { brand, last4, expiryMonth, expiryYear } = req.body;

  if (!allowedBrands.includes(brand)) {
    return res.status(400).json({ message: "Invalid demo card brand" });
  }

  if (!/^\d{4}$/.test(String(last4))) {
    return res.status(400).json({ message: "last4 must be four digits" });
  }

  const month = Number(expiryMonth);
  const year = Number(expiryYear);

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < new Date().getFullYear() ||
    year > new Date().getFullYear() + 25
  ) {
    return res.status(400).json({ message: "Invalid expiry date" });
  }

  const card = await PaymentMethod.create({
    user_id,
    provider: "demo",
    brand,
    last4,
    expiryMonth: month,
    expiryYear: year,
  });

  res.status(201).json({
    status: 201,
    data: {
      payment_method_id: card.payment_method_id,
      provider: card.provider,
      brand: card.brand,
      last4: card.last4,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
    },
    message: "Demo card added. It cannot be used for payment.",
  });
});

const deleteCard = asyncHandler(async (req, res) => {
  const user_id = getUserId(req);
  if (!user_id) {
    return res.status(401).json({ message: "User Id is required" });
  }

  const { payment_method_id } = req?.params;
  if (!validateUuid(payment_method_id)) {
    return res.status(400).json({ message: "Invalid card ID" });
  }

  const deleted = await PaymentMethod.findOneAndDelete({
    payment_method_id,
    user_id,
  });

  if (!deleted) {
    return res.status(404).json({ message: "Card not found" });
  }

  if (deleted.provider === "razorpay") {
    return res.status(409).json({
      message: "Provider token deletion must be completed first",
    });
  }

  res.status(200).json({
    status: 200,
    data: { success: true },
    message: "Card removed successfully",
  });
});

module.exports = {
  getAllCards,
  addCard,
  deleteCard,
};
