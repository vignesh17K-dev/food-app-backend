const Cart = require("../models/cartModel");
const mock_data = require("../data/products");
const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");

const restaurantById = new Map(
  (mock_data.restaurants || []).map((restaurant) => [
    restaurant.id,
    restaurant,
  ]),
);

const restaurantSummary = (restaurant) => {
  if (!restaurant) return null;
  return {
    id: restaurant.id,
    name: restaurant.name,
    image: restaurant.image,
    logo: restaurant.logo,
    rating: restaurant.rating,
    deliveryTime: restaurant.deliveryTime,
    deliveryDistance: restaurant.deliveryDistance,
    cuisine: restaurant.cuisine,
  };
};

const getProductById = (product_id) => {
  const listItem = mock_data.products_data?.find((p) => p.id === product_id);
  const detail = mock_data.product_details?.find((p) => p.id === product_id);
  if (!listItem && !detail) return null;
  const product = {
    ...(listItem || {}),
    ...(detail || {}),
    sizes: detail?.sizes || listItem?.sizes || [],
  };
  const restaurant = restaurantById.get(product.restaurant_id) || null;
  return {
    ...product,
    deliveryTime: restaurant?.deliveryTime ?? product.deliveryTime,
    deliveryDistance:
      restaurant?.deliveryDistance ?? product.deliveryDistance,
    restaurant: restaurantSummary(restaurant),
  };
};

const calculateCartTotal = (cart) => {
  if (!cart?.products) return 0;

  let total = 0;
  const products =
    cart.products instanceof Map
      ? cart.products
      : new Map(Object.entries(cart.products || {}));

  for (const variants of products.values()) {
    const variantMap =
      variants instanceof Map
        ? variants
        : new Map(Object.entries(variants || {}));

    for (const item of variantMap.values()) {
      const line = item?._doc || item;
      const price = Number(line?.price) || 0;
      const quantity = Number(line?.quantity) || 0;
      total += price * quantity;
    }
  }

  return Math.round(total * 100) / 100;
};

const syncCartTotal = (cart) => {
  cart.cart_total = calculateCartTotal(cart);
  return cart;
};

const formatCartResponse = (cart) => {
  if (!cart) return null;
  const plain = cart.toObject
    ? cart.toObject({ flattenMaps: true })
    : cart;
  return {
    ...plain,
    cart_total: calculateCartTotal(cart),
  };
};

const formatCartLineItem = (item) => {
  if (!item) return null;
  const line = item?._doc || item;
  return {
    product_id: line.product_id,
    cart_item_id: line.cart_item_id,
    quantity: line.quantity,
    selectedSize: line.selectedSize,
  };
};

const getOrCreateCart = async (cart_id, user_id) => {
  let cart = await Cart.findOne({ cart_id });
  if (!cart) {
    cart = await Cart.create({
      cart_id: uuidv4(),
      user_id,
      products: {},
      cart_total: 0,
    });
  }
  return cart;
};

const ensureProductMap = (cart, product_id) => {
  if (!cart.products) {
    cart.products = new Map();
  }
  if (!cart.products.has(product_id)) {
    cart.products.set(product_id, new Map());
  }
  return cart.products.get(product_id);
};


const findVariantBySize = (variantsMap, selectedSize) => {
  if (!variantsMap) return null;
  for (const [cart_item_id, item] of variantsMap.entries()) {
    const variant = item?._doc || item;
    if (variant?.selectedSize === selectedSize) {
      return { cart_item_id, item: variant };
    }
  }
  return null;
};

const buildCartItem = (
  product,
  product_id,
  selectedSize,
  quantity,
  cart_item_id,
) => ({
  cart_item_id,
  product_id,
  name: product.name,
  description: product.description,
  categories: product.categories || [],
  price: product.price,
  calories: product.calories,
  isFavorite: product.isFavorite || false,
  image: product.image,
  quantity,
  selectedSize,
  added_at: new Date(),
  deliveryTime: product.deliveryTime || "20-30 mins",
  deliveryDistance: product.deliveryDistance ?? 0,
  tags: product.tags || [],
  rating: product.rating ?? 0,
  restaurant_id: product.restaurant_id || null,
  restaurant: product.restaurant || null,
});

const initializeCart = asyncHandler(async (req, res) => {
  try {
    const user_id = req?.body?.user_id || req?.user?.id;
    if (!user_id) {
      return res.status(400).json({
        status: 400,
        message: "user_id is required",
      });
    }

    const existing_cart = await Cart.findOne({ user_id });
    if (existing_cart) {
      return res.status(200).json({
        status: 200,
        data: formatCartResponse(existing_cart),
        message: "Cart already exists",
      });
    }

    const new_cart_data = await Cart.create({
      cart_id: uuidv4(),
      user_id,
      products: {},
      cart_total: 0,
    });

    return res.status(200).json({
      status: 200,
      data: formatCartResponse(new_cart_data),
      message: "Cart initialized successfully",
    });
  } catch (err) {
    res.status(404);
    throw new Error(err.message || "Failed to initialize cart");
  }
});

const getCartDetails = asyncHandler(async (req, res) => {
  try {
    const cart_id = req?.body?.cart_id;
    if (!cart_id) {
      return res.status(400).json({
        status: 400,
        message: "cart_id is required",
      });
    }

    const cart = await Cart.findOne({ cart_id });
    if (!cart) {
      return res.status(404).json({
        status: 404,
        message: "Cart not found",
      });
    }

    return res.status(200).json({
      status: 200,
      data: formatCartResponse(cart),
      message: "fetched cart details successfully",
    });
  } catch (err) {
    res.status(404);
    throw new Error(err.message || "Cart not found");
  }
});

// POST /api/cart/item
// Add:    { product_id, selectedSize, quantity }
// Update: { product_id, cart_item_id, quantity }  (quantity 0 = remove)
const updateProductToCart = asyncHandler(async (req, res) => {
  try {
    const cart_id = req?.body?.cart_id;
    const user_id = req?.user?.id;
    const { product_id, selectedSize, quantity = 1, cart_item_id } = req.body;

    if (!cart_id) {
      return res.status(400).json({
        status: 400,
        message: "cart_id is required",
      });
    }
    if (!product_id) {
      return res.status(400).json({
        status: 400,
        message: "product_id is required",
      });
    }

    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 0) {
      return res.status(400).json({
        status: 400,
        message: "quantity must be an integer >= 0",
      });
    }

    const cart = await getOrCreateCart(cart_id, user_id);

    // Update / remove existing line by cart_item_id
    if (cart_item_id) {
      const variantsMap = cart.products?.get(product_id);
      if (!variantsMap || !variantsMap.has(cart_item_id)) {
        return res.status(404).json({
          status: 404,
          message: "Cart item not found",
        });
      }

      if (qty === 0) {
        variantsMap.delete(cart_item_id);
        if (variantsMap.size === 0) {
          cart.products.delete(product_id);
        }
        syncCartTotal(cart);
        cart.markModified("products");
        await cart.save();
        return res.status(200).json({
          status: 200,
          message: "Cart item removed successfully",
        });
      }

      const existing = variantsMap.get(cart_item_id);
      const item = {
        ...(existing._doc || existing),
        quantity: qty,
        ...(selectedSize ? { selectedSize } : {}),
      };
      variantsMap.set(cart_item_id, item);
      syncCartTotal(cart);
      cart.markModified("products");
      await cart.save();

      return res.status(200).json({
        status: 200,
        data: formatCartLineItem(variantsMap.get(cart_item_id)),
        message: "Cart item updated successfully",
      });
    }

    // Add / merge by selectedSize
    if (qty < 1) {
      return res.status(400).json({
        status: 400,
        message: "quantity must be >= 1 when adding to cart",
      });
    }

    if (!selectedSize) {
      return res.status(400).json({
        status: 400,
        message: "selectedSize is required when adding to cart",
      });
    }

    const product = getProductById(product_id);
    if (!product) {
      return res.status(404).json({
        status: 404,
        message: "Product not found",
      });
    }

    const validSizes = product?.sizes || [];
    if (!validSizes.includes(selectedSize)) {
      return res.status(400).json({
        status: 400,
        message: `Invalid selectedSize. Allowed: ${validSizes.join(", ") || "none"}`,
      });
    }

    const variantsMap = ensureProductMap(cart, product_id);
    const existingVariant = findVariantBySize(variantsMap, selectedSize);

    if (existingVariant) {
      const { cart_item_id: existingId, item } = existingVariant;
      variantsMap.set(existingId, {
        ...item,
        quantity: (item.quantity || 0) + qty,
      });
      syncCartTotal(cart);
      cart.markModified("products");
      await cart.save();

      return res.status(200).json({
        status: 200,
        data: formatCartLineItem(variantsMap.get(existingId)),
        message: "Cart item quantity updated successfully",
      });
    }

    const new_cart_item_id = uuidv4();
    variantsMap.set(
      new_cart_item_id,
      buildCartItem(product, product_id, selectedSize, qty, new_cart_item_id),
    );

    syncCartTotal(cart);
    cart.markModified("products");
    await cart.save();

    return res.status(200).json({
      status: 200,
      data: formatCartLineItem(variantsMap.get(new_cart_item_id)),
      message: "Product added to cart successfully",
    });
  } catch (err) {
    res.status(404);
    throw new Error(err.message || "Failed to update cart");
  }
});

// DELETE /api/cart/item
// Body: { product_id, cart_item_id }
const removeProductFromCart = asyncHandler(async (req, res) => {
  try {
    const cart_id = req?.body?.cart_id;
    const { product_id, cart_item_id } = req.body;

    if (!product_id || !cart_item_id || !cart_id) {
      return res.status(400).json({
        status: 400,
        message: "product_id and cart_item_id and cart_id are required",
      });
    }

    const cart = await Cart.findOne({ cart_id });
    if (!cart) {
      return res.status(404).json({
        status: 404,
        message: "Cart not found",
      });
    }

    const variantsMap = cart.products?.get(product_id);
    if (!variantsMap || !variantsMap.has(cart_item_id)) {
      return res.status(404).json({
        status: 404,
        message: "Cart item not found",
      });
    }

    const removedItem = variantsMap.get(cart_item_id);
    variantsMap.delete(cart_item_id);
    if (variantsMap.size === 0) {
      cart.products.delete(product_id);
    }

    syncCartTotal(cart);
    cart.markModified("products");
    await cart.save();

    return res.status(200).json({
      status: 200,
      data: formatCartLineItem(removedItem),
      message: "Cart item removed successfully",
    });
  } catch (err) {
    res.status(404);
    throw new Error(err.message || "Failed to remove cart item");
  }
});

module.exports = {
  getCartDetails,
  updateProductToCart,
  initializeCart,
  removeProductFromCart,
};
