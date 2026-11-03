const expressAsyncHandler = require("express-async-handler");
const { scheduleNextStatus } = require("../services/orderStatusService");
const Order = require("../models/orderModel");
const { receiver } = require("../config/qstash");
const { publishToUser } = require("../config/pusher");
const { lerpDeliveryLocation } = require("../services/deliveryLocation");

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

    const baseUrl = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
    const isValid = await receiver.verify({
      signature,
      body: req.rawBody,
      url: `${baseUrl}${req.originalUrl}`,
    });

    if (!isValid) {
      return res.status(401).json({
        message: "Invalid QStash signature",
      });
    }

    const { order_id, expected_status, next_status } = req.body;

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

    const current = await Order.findOne({
      order_id,
      payment_status: "paid",
      order_status: expected_status,
    });

    if (!current) {
      return res.status(200).json({
        success: true,
        skipped: true,
        message: "Order not updated (already advanced or not found)",
      });
    }

    const delivery_location =
      lerpDeliveryLocation(
        current.delivery_detail?.restaurant_location,
        current.delivery_detail?.customer_location,
        next_status
      ) || current.delivery_detail?.delivery_location;

    const update = {
      order_status: next_status,
      order_status_updated_at: new Date(),
    };
    if (delivery_location) {
      update["delivery_detail.delivery_location"] = delivery_location;
    }

    const order = await Order.findOneAndUpdate(
      {
        order_id,
        payment_status: "paid",
        order_status: expected_status,
      },
      { $set: update },
      { new: true }
    );

    if (!order) {
      // Idempotent: already advanced or missing — still 200 so QStash does not retry forever
      return res.status(200).json({
        success: true,
        skipped: true,
        message: "Order not updated (already advanced or not found)",
      });
    }

    await publishToUser(order.user_id, "order-status-updated", {
      order_id: order.order_id,
      order_status: next_status,
      payment_status: order.payment_status,
      amount: order.amount,
      currency: order.currency,
      estimated_delivery_time: order.estimated_delivery_time,
      restaurant: order.restaurant_data,
      delivery_location: order.delivery_detail?.delivery_location,
    });

    await scheduleNextStatus(order.order_id, next_status);

    return res.status(200).json({
      success: true,
      orderId: order.order_id,
      status: next_status,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error("advanceStatus error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error?.message,
    });
  }
});

module.exports = { advanceStatus };
