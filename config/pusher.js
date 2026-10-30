const Pusher = require("pusher");

const {
    PUSHER_APP_ID,
    PUSHER_KEY,
    PUSHER_SECRET,
    PUSHER_CLUSTER,
} = process.env;

const pusher = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
})

/** Per-user private channel (client must auth via /api/pusher/auth). */
const userChannelName = (user_id) => `private-user-${user_id}`;

const publishToUser = async (user_id, event, payload) => {
    if (!pusher || !user_id) {
        return;
    }

    try {
        await pusher.trigger(userChannelName(user_id), event, payload);
    } catch (err) {
        console.error("Pusher trigger failed:", err?.message || err);
    }
};

module.exports = {
    pusher,
    userChannelName,
    publishToUser,
};
