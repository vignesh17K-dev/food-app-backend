const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
    },
    products: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, required: true },
        categories: [{ type: String, required: true }],
        price: { type: Number, required: true },
        calories: { type: Number, required: true },
        isFavorite: { type: Boolean, default: false },
        image: { type: String, required: true },
        added_at: { type: Date, default: Date.now },
        sizes: { type: String, required: true }
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
module.exports = Wishlist;
