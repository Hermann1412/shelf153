import express from "express";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";
import { createTables } from "./utils/createTables.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import authRouter from "./router/authRoutes.js";
import productRouter from "./router/productRoutes.js";
import adminRouter from "./router/adminRoutes.js";
import orderRouter from "./router/orderRoutes.js";
import chatRouter from "./router/chatRoutes.js";
import sellerRouter from "./router/sellerRoutes.js";
import database from "./database/db.js";

const app = express();

config();

app.use(
  cors({
    origin: [process.env.FRONTEND_URL, process.env.DASHBOARD_URL],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  fileUpload({
    tempFileDir: "./uploads",
    useTempFiles: true,
  })
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/public", express.static(path.join(__dirname, "public")));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/seller", sellerRouter);

app.post("/api/v1/payment/airtel/callback", async (req, res) => {
  try {
    const { transaction } = req.body;
    const orderId = transaction?.id;
    const statusCode = transaction?.status_code;

    if (!orderId) return res.status(400).json({ success: false });

    if (statusCode === "TS") {
      await database.query(
        "UPDATE payments SET payment_status = 'Paid' WHERE order_id = ?",
        [orderId]
      );
      await database.query("UPDATE orders SET paid_at = NOW() WHERE id = ?", [
        orderId,
      ]);

      const { rows: orderedItems } = await database.query(
        "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
        [orderId]
      );
      for (const item of orderedItems) {
        await database.query(
          "UPDATE products SET stock = stock - ? WHERE id = ?",
          [item.quantity, item.product_id]
        );
      }
    } else if (statusCode === "TF") {
      await database.query(
        "UPDATE payments SET payment_status = 'Failed' WHERE order_id = ?",
        [orderId]
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Airtel callback error:", error.message);
    res.status(500).json({ success: false });
  }
});

createTables();

app.use(errorMiddleware);

export default app;
