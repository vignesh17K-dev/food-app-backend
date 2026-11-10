const Notification = require("../models/notificationModel");
const { publishToUser } = require("../config/pusher");

const STATUS_COPY = {
  confirmed: {
    title: "Order confirmed",
    body: "Your order has been received and is being prepared.",
    icon: "check-circle-outline",
  },
  prepared: {
    title: "Order ready",
    body: "The restaurant has finished preparing your order.",
    icon: "food",
  },
  out_for_delivery: {
    title: "On the way",
    body: "Your rider is heading to you. Track your order anytime.",
    icon: "moped",
  },
  delivered: {
    title: "Delivered",
    body: "Your order has arrived. Enjoy your meal!",
    icon: "package-variant-closed",
  },
};

const formatNotification = (doc) => {
  if (!doc) {
    return null;
  }
  const item = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: item.notification_id,
    order_id: item.order_id,
    order_status: item.order_status,
    title: item.title,
    body: item.body,
    icon: item.icon,
    read: item.read,
    created_at: item.createdAt,
  };
};

const saveNotification = async ({ user_id, order_id, order_status }) => {
  const copy = STATUS_COPY[order_status] || {
    title: "Order update",
    body: `Your order is now ${String(order_status).replace(/_/g, " ")}.`,
    icon: "bell-outline",
  };

  const doc = await Notification.create({
    user_id,
    order_id,
    order_status,
    title: copy.title,
    body: copy.body,
    icon: copy.icon,
    read: false,
  });

  return formatNotification(doc);
};

const publishOrderStatusUpdate = async (order, payload) => {
  if (!order?.user_id || !order?.order_id) {
    return;
  }

  const order_status = payload.order_status || order.order_status;
  let notification = null;

  try {
    notification = await saveNotification({
      user_id: order.user_id,
      order_id: order.order_id,
      order_status,
    });
  } catch (error) {
    console.error("Save notification failed:", error?.message || error);
  }

  await publishToUser(order.user_id, "order-status-updated", {
    ...payload,
    notification,
  });
};

module.exports = {
  formatNotification,
  publishOrderStatusUpdate,
};
