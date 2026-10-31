/**
 * Flatten cart products map/array and return the first line item's restaurant summary.
 */
const getFirstRestaurantFromProducts = (products) => {
  if (!products) {
    return null;
  }

  const entries = products instanceof Map
    ? Array.from(products.values())
    : Array.isArray(products)
      ? products
      : Object.values(products);

  for (const variants of entries) {
    const variantEntries =
      variants instanceof Map
        ? Array.from(variants.values())
        : Array.isArray(variants)
          ? variants
          : Object.values(variants || {});

    for (const item of variantEntries) {
      const line = item?._doc || item;
      if (line?.restaurant) {
        return line.restaurant;
      }
    }
  }

  return null;
};

const getFirstRestaurantFromOrder = (order) => {
  if (!order) {
    return null;
  }
  const products =
    order.cart_details?.products ??
    order.toObject?.()?.cart_details?.products;
  return getFirstRestaurantFromProducts(products);
};

module.exports = {
  getFirstRestaurantFromProducts,
  getFirstRestaurantFromOrder,
};
