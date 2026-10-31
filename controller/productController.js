const mock_data = require("../data/products");

// Parses "25-30 mins" → 30 (upper bound in minutes)
const parseDeliveryTimeMax = (deliveryTime) => {
  if (!deliveryTime) return null;
  const match = deliveryTime.match(/(\d+)/g);
  if (!match) return null;
  return Math.max(...match.map(Number));
};

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
    image: restaurant.image, // hero / cover
    logo: restaurant.logo, // brand logo
    rating: restaurant.rating,
    deliveryTime: restaurant.deliveryTime,
    deliveryDistance: restaurant.deliveryDistance,
    cuisine: restaurant.cuisine,
  };
};

const resolveRestaurant = (restaurant_id) =>
  restaurantById.get(restaurant_id) || null;

/** Prefer restaurant delivery/rating fields when linked; keep product fields as fallback. */
const withRestaurant = (product) => {
  if (!product) return product;
  const restaurant = resolveRestaurant(product.restaurant_id);
  const summary = restaurantSummary(restaurant);
  return {
    ...product,
    deliveryTime: restaurant?.deliveryTime ?? product.deliveryTime,
    deliveryDistance:
      restaurant?.deliveryDistance ?? product.deliveryDistance,
    restaurant: summary,
  };
};

// POST /products — body: { search, filters, page, limit }
const getProducts = (req, res) => {
  const { search, filters = {}, page = 1, limit = 5 } = req.body;
  const {
    minPrice,
    maxPrice,
    rating,
    maxDeliveryTime,
    maxDistance,
    tags,
    restaurant_id,
  } = filters;

  const searchTerm = search?.trim().toLowerCase() || null;

  const parsedTags = tags
    ? (Array.isArray(tags) ? tags : tags.split(",")).map((t) =>
        String(t).trim().toLowerCase(),
      )
    : null;

  const filtered_products = mock_data.products_data?.filter((product) => {
    const restaurant = resolveRestaurant(product.restaurant_id);
    const deliveryTime =
      restaurant?.deliveryTime ?? product.deliveryTime;
    const deliveryDistance =
      restaurant?.deliveryDistance ?? product.deliveryDistance;
    const productRating = product.rating ?? restaurant?.rating ?? 0;

    if (restaurant_id && product.restaurant_id !== restaurant_id) {
      return false;
    }

    if (searchTerm) {
      const nameMatch = product.name?.toLowerCase().includes(searchTerm);
      const descMatch = product.description?.toLowerCase().includes(searchTerm);
      const tagMatch = product.tags?.some((t) =>
        t.toLowerCase().includes(searchTerm),
      );
      const restaurantMatch = restaurant?.name
        ?.toLowerCase()
        .includes(searchTerm);
      if (!nameMatch && !descMatch && !tagMatch && !restaurantMatch)
        return false;
    }

    if (minPrice !== undefined && product.price < parseFloat(minPrice))
      return false;
    if (maxPrice !== undefined && product.price > parseFloat(maxPrice))
      return false;

    if (rating !== undefined) {
      const selectedRating = parseFloat(rating);
      if (productRating < selectedRating || productRating >= selectedRating + 1)
        return false;
    }

    if (maxDeliveryTime !== undefined && deliveryTime) {
      const upperMins = parseDeliveryTimeMax(deliveryTime);
      if (upperMins !== null && upperMins > parseFloat(maxDeliveryTime))
        return false;
    }

    if (maxDistance !== undefined && deliveryDistance !== undefined) {
      if (deliveryDistance > parseFloat(maxDistance)) return false;
    }

    if (parsedTags && product.tags) {
      const productTags = product.tags.map((t) => t.toLowerCase());
      const hasAllTags = parsedTags.every((t) => productTags.includes(t));
      if (!hasAllTags) return false;
    }

    return true;
  });

  const current_page = Math.max(1, parseInt(page, 10) || 1);
  const product_limit = Math.min(
    50,
    Math.max(1, parseInt(limit, 10) || 5),
  );

  const total = filtered_products.length;
  const total_pages = total === 0 ? 0 : Math.ceil(total / product_limit);

  const start_index = (current_page - 1) * product_limit;
  const paginated_products = filtered_products
    .slice(start_index, start_index + product_limit)
    .map(withRestaurant);

  res.status(200).json({
    status: 200,
    data: paginated_products,
    pagination: {
      page: current_page,
      limit: product_limit,
      total,
      total_pages,
      has_next: current_page < total_pages,
      has_prev: current_page > 1,
    },
    message: "successfully fetched",
  });
};

const getPopularRails = (req, res) => {
  const updated_popular_rails = mock_data.popular_rails.map((id) => {
    const product = mock_data.products_data.find(
      (product) => product?.id === id,
    );
    return withRestaurant(product);
  });

  res.status(200).json({
    status: 200,
    data: updated_popular_rails,
    message: "successfully fetched popular rails",
  });
};

const getMenuRails = (req, res) => {
  const updated_menu_rails = mock_data.menu_data?.map((menu_item) => {
    const updated_list = menu_item?.list?.map((id) => {
      const product = mock_data.products_data.find(
        (product) => product?.id === id,
      );
      return withRestaurant(product);
    });
    return {
      ...menu_item,
      list: updated_list,
    };
  });

  res.status(200).json({
    status: 200,
    data: updated_menu_rails,
    message: "successfully fetched menu rails",
  });
};

// GET
const getProductCategories = (req, res) => {
  res.status(200).json({
    status: 200,
    data: mock_data.categories,
    message: "successfully fetched categories",
  });
};

// GET /restaurants
const getRestaurants = (req, res) => {
  const searchTerm = req.query?.search?.trim().toLowerCase() || null;
  const cuisine = req.query?.cuisine?.trim().toLowerCase() || null;

  let restaurants = mock_data.restaurants || [];

  if (searchTerm) {
    restaurants = restaurants.filter(
      (restaurant) =>
        restaurant.name?.toLowerCase().includes(searchTerm) ||
        restaurant.tags?.some((t) => t.toLowerCase().includes(searchTerm)) ||
        restaurant.cuisine?.some((c) => c.toLowerCase().includes(searchTerm)),
    );
  }

  if (cuisine) {
    restaurants = restaurants.filter((restaurant) =>
      restaurant.cuisine?.some((c) => c.toLowerCase() === cuisine),
    );
  }

  res.status(200).json({
    status: 200,
    data: restaurants,
    message: "successfully fetched restaurants",
  });
};

// GET /restaurants/:id
const getRestaurantById = (req, res) => {
  const restaurant = resolveRestaurant(req.params.id);
  if (!restaurant) {
    return res.status(404).json({
      status: 404,
      message: "Restaurant not found",
    });
  }

  const menu = (mock_data.products_data || [])
    .filter((product) => product.restaurant_id === restaurant.id)
    .map(withRestaurant);

  return res.status(200).json({
    status: 200,
    data: {
      ...restaurant,
      menu,
    },
    message: "successfully fetched restaurant",
  });
};

//GET
const getProductsByCategory = (req, res) => {
  const category_id = req?.params?.id;
  const products = mock_data?.products_data
    ?.filter((product) => product?.categories?.includes(category_id))
    .map(withRestaurant);
  res.status(200).json({
    status: 200,
    data: products,
    message: "successfully fetched categories",
  });
};

// GET
const getProductDetails = (req, res) => {
  const product = mock_data.product_details.find(
    (product) => product?.id === req?.params?.id,
  );

  if (!product) {
    return res.status(404).json({
      status: 404,
      message: "Product not found",
    });
  }

  res.status(200).json({
    status: 200,
    data: withRestaurant(product),
    message: `successfully fetched detail ${req?.params?.id}`,
  });
};

module.exports = {
  getProducts,
  getProductDetails,
  getProductCategories,
  getPopularRails,
  getMenuRails,
  getProductsByCategory,
  getRestaurants,
  getRestaurantById,
};
