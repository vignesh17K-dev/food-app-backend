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

/** Map restaurant summary → address + lat/lng for delivery_detail.restaurant_location */
const restaurantToLocation = (restaurant) => {
  if (
    !restaurant?.formattedAddress ||
    restaurant.latitude == null ||
    restaurant.longitude == null
  ) {
    return null;
  }
  return {
    formattedAddress: restaurant.formattedAddress,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  };
};

/** Partner pin starts at the restaurant (lat/lng only). */
const restaurantToDeliveryLocation = (restaurant) => {
  if (restaurant?.latitude == null || restaurant?.longitude == null) {
    return null;
  }
  return {
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  };
};

module.exports = {
  getFirstRestaurantFromProducts,
  getFirstRestaurantFromOrder,
  restaurantToLocation,
  restaurantToDeliveryLocation,
};
