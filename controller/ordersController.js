const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const { validate: validateUuid } = require("uuid");
const razorpay = require("../config/razorpay");
const Cart = require("../models/cartModel");
const PaymentMethod = require("../models/paymentModel");
const Order = require("../models/orderModel");


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

    const { cart_id, payment_method_id = '', provider, delivery_address } = req.body;
    const is_razorpay = provider === "razorpay";
    const razorpay_key_id = process.env.RAZORPAY_KEY_ID;
    let payment_details;
    let paymentMethod;

    if (!cart_id) {
        return res.status(400).json({
            status: 400,
            message: "cart_id is required",
        });
    }

    if (!delivery_address?.formattedAddress || !delivery_address?.latitude || !delivery_address?.longitude) {
        return res.status(400).json({
            status: 400,
            message: "delivery_address is required",
        });
    }

    if (!provider || !["demo", "razorpay"].includes(provider)) {
        return res.status(400).json({
            status: 400,
            message: "provider must be demo or razorpay",
        });
    }

    if (!is_razorpay) {
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

        paymentMethod = await PaymentMethod.findOne({
            payment_method_id,
            user_id,
        }).lean();

        if (!paymentMethod) {
            return res.status(404).json({
                status: 404,
                message: "Payment method not found",
            });
        }

        payment_details = {
            payment_method_id: paymentMethod?.payment_method_id,
            provider: paymentMethod?.provider,
            brand: paymentMethod?.brand,
            cardholderName: paymentMethod?.cardholderName,
        };
    }


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

    const orderPayload = {
        user_id,
        cart_details: {
            cart_id: cart?.cart_id,
            cart_total: cart?.cart_total,
            products: cart?.products,
        },
        delivery_address: delivery_address,
        amount: cart?.cart_total,
        razorpayOrderId: razorpayOrder?.id,
        currency: razorpayOrder?.currency || "INR",
        payment_status: is_razorpay ? "created" : "paid",
        razorpay_key_id: razorpay_key_id
    };

    if (!is_razorpay) {
        orderPayload.payment_details = payment_details;
    }

    const order = await Order.create(orderPayload);

    await Cart.findOneAndDelete({ cart_id, user_id });

    res.status(201).json({
        status: 201,
        data: {
            order_data: formatOrderResponse(order),
            razorpay_data: {
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            },
        },
        message: "Order created successfully",
    });
});


const verifyOrder = asyncHandler(async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                status: 400,
                message: "All fields are required",
            });
        }

        const appOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!appOrder) {
            return res.status(404).json({
                status: 404,
                message: "Order not found",
            });
        }

        // Verify using the stored Razorpay order ID, not an
        // order ID blindly trusted from the request body.
        if (!secret) {
            throw new Error('Razorpay secret is not configured');
        }

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${appOrder.razorpayOrderId}|${razorpay_payment_id}`)
            .digest();

        const receivedSignature = Buffer.from(
            razorpay_signature,
            'hex'
        );

        if (
            receivedSignature.length !== expectedSignature.length ||
            !crypto.timingSafeEqual(
                expectedSignature,
                receivedSignature
            )
        ) {
            return res.status(400).json({
                verified: false,
                message: 'Invalid payment signature',
            });
        }

        // Fetch payment details from Razorpay's server API.
        const payment = await razorpay.payments.fetch(
            razorpay_payment_id
        );

        // Check that this payment belongs to the stored order
        // and has the expected amount and currency.
        const expectedAmountPaise = Math.round(Number(appOrder.amount) * 100);
        if (
            payment.order_id !== appOrder.razorpayOrderId ||
            payment.amount !== expectedAmountPaise ||
            payment.currency !== appOrder.currency
        ) {
            return res.status(400).json({
                verified: false,
                message: 'Payment details do not match the order',
            });
        }


        // This endpoint confirms only captured payments.
        // If payment is authorized but not captured, handle
        // capture separately according to your payment setup.
        if (payment.status !== 'captured') {
            return res.status(409).json({
                verified: false,
                status: payment.status,
                message: 'Payment is not captured yet',
            });
        }

        // Prevent a second payment from being attached to an
        // order that has already been paid.
        if (appOrder.payment_status === "paid") {
            if (
                appOrder.payment_details?.payment_method_id ===
                razorpay_payment_id
            ) {
                return res.json({
                    verified: true,
                    payment_status: "paid",
                    message: "Payment already verified",
                });
            }

            return res.status(409).json({
                verified: false,
                message: "Order has already been paid",
            });
        }

        appOrder.payment_status = "paid";
        appOrder.payment_details = {
            payment_method_id: razorpay_payment_id,
            provider: "razorpay",
            brand: payment.card?.network || payment.method || "Razorpay",
            cardholderName:
                payment.card?.name || payment.email || "Customer",
        };
        await appOrder.save();


        return res.json({
            verified: true,
            payment_status: "paid",
            paymentId: razorpay_payment_id,
            message: "Payment verified successfully",
        });
    } catch (error) {
        return res.status(500).json({
            verified: false,
            message: 'Error verifying payment',
            error: error.message,
        });
    }


});


const getOrders = asyncHandler(async (req, res) => {
    const user_id = req?.user?.id;
    if (!user_id) {
        return res.status(401).json({
            status: 401,
            message: "User Id is required",
        });
    }

    const order_list = await Order.find({ user_id }).sort({ createdAt: -1 });

    return res.status(200).json({
        status: 200,
        data: order_list,
        message: "Orders fetched successfully",
    });

});

module.exports = { createOrder, verifyOrder  , getOrders};
