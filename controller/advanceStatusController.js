const expressAsyncHandler = require("express-async-handler");
const { scheduleNextStatus } = require("../services/orderStatusService");
const Order = require("../models/orderModel");
const { receiver } = require("../config/qstash");


const STATUS_SEQUENCE = {
    confirmed: "prepared",
    prepared: "out_for_delivery",
    out_for_delivery: "delivered",
};

const advanceStatus = expressAsyncHandler(async (req, res) => {
    try {
        const signature = req?.headers["upstash-signature"];

        if (!signature || !req.rawBody) {
            return res.status(401).json({
                message: "Missing QStash signature or raw body",
            });
        }

        const isValid = await receiver.verify({
            signature,
            body: req.rawBody,
            url: `${process.env.APP_BASE_URL}${req.originalUrl}`,
        });

        if (!isValid) {
            return res.status(401).json({
                message: "Invalid QStash signature",
            });
        }

        const { order_id, expected_status, next_status } = req.body;
        const { user_id } = req?.user;

        if (!order_id || !expected_status || !next_status) {
            return res.status(400).json({
                status: 400,
                message: "All fields are required",
            });
        }


        if (STATUS_SEQUENCE[expected_status] !== next_status) {
            return res.status(400).json({
                message: "Invalid status transition",
            });
        }

        //update the order status in the database
        const order = await Order.findOneAndUpdate(
            {
                order_id: order_id,
                payment_status: 'paid',
                order_status: expected_status,
            },
            {
                $set: {
                    order_status: next_status,
                    order_status_updated_at: new Date(),
                },
            },
            {
                new: true,
            }
        );

        //update pusher notification
        await publishToUser(user_id, "order-status-updated", {
            order_id: order.order_id,
            order_status: next_status,
            payment_status: order.payment_status,
            amount: order.amount,
            currency: order.currency,
        });

        //schedule the next status
        await scheduleNextStatus(order?.order_id, next_status);


        return res.status(200).json({
            success: true,
            orderId: order._id,
            status: next_status,
            message: "Order status updated successfully",
        });

    } catch (error) {
        return res.status(500).json({
            status: 500,
            message: "Internal server error",
        });
    }
});


module.exports = { advanceStatus };





