const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const paymentMethodSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
    },
    userId: { type: String, required: true, index: true },
    provider: {
      type: String,
      enum: ["demo", "razorpay"],
      required: true,
    },
    brand: { type: String, required: true },
    last4: { type: String, required: true },
    expiryMonth: { type: Number, required: true },
    expiryYear: { type: Number, required: true },
    providerCustomerId: String,
    providerTokenReference: String,
  },
  { _id: false, timestamps: true }
);

const PaymentMethod = mongoose.model("PaymentMethod", paymentMethodSchema);
module.exports = PaymentMethod;
