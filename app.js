const express = require("express");
const dotenv = require("dotenv").config();
const connectdb = require("./config/dbConnections");
const errorHandler = require("./middleware/errorHandler");
const cors = require('cors')


const app = express();
connectdb();
const port = process?.env?.PORT || 5000;

const corsOptions = {
  origin: '*', // Allow only this origin
  methods: ['GET', 'POST', 'DELETE'],            // Allow GET, POST, DELETE
  allowedHeaders: ["Content-Type", "Authorization"], // ✅ Allow Authorization header
  credentials: true, // Allow specific headers
};

app.use(cors(corsOptions));
app.use(express.json())
// app.use(
//   express.json({
//     verify: (req, _res, buf) => {
//       // Required for QStash signature verification on /api/order/advance_status
//       req.rawBody = buf.toString("utf8");
//     },
//   })
// );
app.use('/api/products', require('./routes/getProducts'));
app.use("/api/wishlist", require('./routes/wishlist'));
app.use("/api/cart", require('./routes/cart'));
app.use("/api/user", require('./routes/user'));
app.use("/api/contact", require('./routes/contact'));
app.use("/api/payment", require('./routes/payment.js'));
app.use("/api/order", require("./routes/order.js"));
app.use("/api/pusher", require("./routes/pusher.js"));
app.use(errorHandler);

app.listen(port, () => {
  console.log(`server running port ${port}`);
});