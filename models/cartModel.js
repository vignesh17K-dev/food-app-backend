const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const cartItemSchema = new mongoose.Schema(
  {
    cart_item_id: { type: String, required: true },
    product_id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    categories: [{ type: String, required: true }],
    price: { type: Number, required: true },
    calories: { type: Number, required: true },
    isFavorite: { type: Boolean, default: false },
    image: { type: String, required: true },
    quantity: { type: Number, default: 1, required: true },
    selectedSize: { type: String, required: true },
    added_at: { type: Date, default: Date.now },
    deliveryTime: { type: String, required: true },
    deliveryDistance: { type: Number, required: true },
    tags: [{ type: String, required: true }],
    rating: { type: Number, required: true },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    cart_id: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
    },
    user_id: {
      type: String,
      required: true,
    },
    cart_total: {
      type: Number,
      default: 0,
    },
    // products: Map<product_id, Map<cart_item_id, cartItem>>
    products: {
      type: Map,
      of: {
        type: Map,
        of: cartItemSchema,
      },
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
module.exports.cartItemSchema = cartItemSchema;
