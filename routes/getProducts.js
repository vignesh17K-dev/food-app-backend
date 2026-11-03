const express = require("express");
const router = express.Router();
const {
    getProducts, 
    getProductDetails,
    getProductCategories,
    getPopularRails,
    getMenuRails,
    getProductsByCategory,
    getRestaurants,
    getRestaurantById,
} = require('../controller/productController')

router.route("/").post(getProducts);
router.route("/popular").get(getPopularRails);
router.route("/menu_item").get(getMenuRails);
router.route("/categories").get(getProductCategories);
router.route("/restaurants").get(getRestaurants);
router.route("/restaurants/:id").get(getRestaurantById);
router.route("/detail/:id").get(getProductDetails)
router.route("/category/:id").get(getProductsByCategory)

module.exports = router;
