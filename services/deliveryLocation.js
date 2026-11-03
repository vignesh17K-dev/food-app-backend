/** Progress along restaurant → customer for each order_status */
const STATUS_PROGRESS = {
  confirmed: 0,
  prepared: 1 / 3,
  out_for_delivery: 2 / 3,
  delivered: 1,
};

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Linearly interpolate partner pin between restaurant and customer by status.
 * @returns {{ latitude: number, longitude: number } | null}
 */
const lerpDeliveryLocation = (
  restaurant_location,
  customer_location,
  order_status
) => {
  if (
    restaurant_location?.latitude == null ||
    restaurant_location?.longitude == null ||
    customer_location?.latitude == null ||
    customer_location?.longitude == null
  ) {
    return null;
  }

  const t = STATUS_PROGRESS[order_status];
  if (t == null) {
    return null;
  }

  return {
    latitude: lerp(
      restaurant_location.latitude,
      customer_location.latitude,
      t
    ),
    longitude: lerp(
      restaurant_location.longitude,
      customer_location.longitude,
      t
    ),
  };
};

module.exports = {
  STATUS_PROGRESS,
  lerpDeliveryLocation,
};
