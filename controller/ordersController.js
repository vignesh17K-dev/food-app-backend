const asyncHandler = require("express-async-handler");

const Cart = require("../models/cartModel");
const PaymentMethod = require("../models/paymentModel");
const { validate: validateUuid } = require("uuid");
const Order = require("../models/orderModel");
const razorpay = require("../config/razorpay");


const formatOrderResponse = (order) => {
    if (!order) return null;
    return order.toObject
        ? order.toObject({ flattenMaps: true })
        : order;
};

const createOrder = asyncHandler(async (req, res) => {
    const user_id = req?.user?.id;
    if (!user_id) {
        return res.status(401).json({
            status: 401,
            message: "User Id is required",
        });
    }

    const { cart_id, payment_method_id } = req.body;

    if (!cart_id) {
        return res.status(400).json({
            status: 400,
            message: "cart_id is required",
        });
    }

    if (!payment_method_id) {
        return res.status(400).json({
            status: 400,
            message: "payment_method_id is required",
        });
    }

    if (!validateUuid(payment_method_id)) {
        return res.status(400).json({
            status: 400,
            message: "Invalid payment_method_id",
        });
    }

    const paymentMethod = await PaymentMethod.findOne({
        payment_method_id,
        user_id,
    }).lean();

    if (!paymentMethod) {
        return res.status(404).json({
            status: 404,
            message: "Payment method not found",
        });
    }

    const payment_details = {
        payment_method_id: paymentMethod.payment_method_id,
        provider: paymentMethod.provider,
        brand: paymentMethod.brand,
        cardholderName: paymentMethod.cardholderName,
    };

    const cart = await Cart.findOne({ cart_id, user_id });
    if (!cart) {
        return res.status(404).json({
            status: 404,
            message: "Cart not found",
        });
    }

    const amountPaise = Math.round(Number(cart.cart_total) * 100);

    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
        return res.status(400).json({
            status: 400,
            message: "Invalid cart total",
        });
    }

    const razorpayOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: `food_${cart_id.replace(/-/g, "").slice(0, 20)}`,
    });

    if (!razorpayOrder?.id) {
        return res.status(400).json({
            status: 400,
            message: "Failed to create Razorpay order",
        });
    }

    const order = await Order.create({
        user_id,
        cart_details: {
            cart_id: cart?.cart_id,
            cart_total: cart?.cart_total,
            products: cart?.products,
        },
        total: cart?.cart_total,
        payment_details,
        razorpayOrderId: razorpayOrder.id,
        currency: razorpayOrder.currency || "INR",
    });

    await Cart.findOneAndDelete({ cart_id, user_id });

    res.status(201).json({
        status: 201,
        data: {
            order: formatOrderResponse(order),
            razorpay: {
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
            },
        },
        message: "Order created successfully",
    });
});

module.exports = { createOrder };
