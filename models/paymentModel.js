const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const paymentSchema = new mongoose.Schema(
  {
    payment_method_id: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
    },
    user_id: { type: String, required: true, index: true },
    provider: {
      type: String,
      enum: ["demo", "razorpay"],
      required: true,
    },
    brand: { type: String, required: true },
    cardholderName: { type: String, required: true, trim: true },
    last4: { type: String, required: true },
    expiryMonth: { type: Number, required: true },
    expiryYear: { type: Number, required: true },
    // providerCustomerId: String,
    // providerTokenReference: String,
  },
  { timestamps: true }
);

const PaymentMethod = mongoose.model("PaymentMethod", paymentSchema);
module.exports = PaymentMethod;
