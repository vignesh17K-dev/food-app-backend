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

    const result = await qstash.publishJSON({
        url: `${process.env.APP_BASE_URL}/api/order/advance-status`,
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