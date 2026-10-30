const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { cartItemSchema } = require("./cartModel");

const paymentDetailsSchema = new mongoose.Schema(
  {
    payment_method_id: { type: String, required: true },
    provider: {
      type: String,
      enum: ["demo", "razorpay"],
      required: true,
    },
    brand: { type: String, required: true },
    cardholderName: { type: String, required: true },
  },
  { _id: false }
);

const cartDetailsSchema = new mongoose.Schema(
  {
    cart_id: { type: String, required: true },
    cart_total: { type: Number, required: true },
    products: {
      type: Map,
      of: {
        type: Map,
        of: cartItemSchema,
      },
      default: {},
    },
  },
  { _id: false }
);

const DeliveryAddressSchema = new mongoose.Schema(
  {
    formattedAddress: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
);


const orderModelSchema = new mongoose.Schema(
  {
    order_id: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
    },
    user_id: { type: String, required: true, index: true },
    cart_details: { type: cartDetailsSchema, required: true },
    amount: { type: Number, required: true },
    order_status: {
      type: String,
      enum: ["confirmed", "prepared", "out_for_delivery", "delivered", "cancelled"],
      default: "confirmed",
    },
    delivery_address: { type: DeliveryAddressSchema, required: true },
    payment_details: { type: paymentDetailsSchema, required: false },
    razorpayOrderId: { type: String, required: true, unique: true },
    currency: { type: String, default: "INR" },
    payment_status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderModelSchema);
module.exports = Order;
