const { qstash } = require("../config/qstash");

const STATUS_SEQUENCE = {
  confirmed: "prepared",
  prepared: "out_for_delivery",
  out_for_delivery: "delivered",
};

const scheduleNextStatus = async (order_id, current_status) => {
  const next_status = STATUS_SEQUENCE[current_status];
  if (!next_status) {
    return;
  }

  if (!process.env.QSTASH_TOKEN) {
    console.warn("QSTASH_TOKEN missing; skip scheduleNextStatus");
    return;
  }

  const baseUrl = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
  if (!baseUrl) {
    console.warn("APP_BASE_URL missing; skip scheduleNextStatus");
    return;
  }

  // Must match routes/order.js: POST /api/order/advance_status
  const result = await qstash.publishJSON({
    url: `${baseUrl}/api/order/advance_status`,
    body: {
      order_id: order_id.toString(),
      expected_status: current_status,
      next_status,
    },
    delay: "30s",
  });

  console.log("Next order status scheduled:", {
    order_id,
    next_status,
    messageId: result?.messageId,
  });
};

module.exports = { scheduleNextStatus };
