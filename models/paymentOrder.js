const mongoose = require("mongoose");

const paymentOrderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
    razorpayPaymentId: String,
  },
  { timestamps: true }
);


const PaymentOrder = mongoose.model("PaymentOrder", paymentOrderSchema);
module.exports = PaymentOrder;