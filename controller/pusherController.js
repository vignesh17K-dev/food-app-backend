
const { pusher, userChannelName } = require("../config/pusher");
const expressAsyncHandler = require("express-async-handler");

const PusherAuth = expressAsyncHandler(async (req, res) => {
    if (!pusher) {
        return res.status(503).json({ message: "Pusher is not configured" });
    }

    const user_id = req?.user?.id;
    const socket_id = req.body?.socket_id;
    const channel_name = req.body?.channel_name;

    if (!socket_id || !channel_name) {
        return res.status(400).json({ message: "socket_id and channel_name required" });
    }

    const allowedChannel = userChannelName(user_id);
    if (channel_name !== allowedChannel) {
        return res.status(403).json({ message: "Forbidden channel" });
    }

    const authResponse = pusher.authorizeChannel(socket_id, channel_name);
    return res.send(authResponse);
});

module.exports = {
    PusherAuth
}