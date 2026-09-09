import express from "express";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import authRouter from "./router/authRoutes.js";
import productRouter from "./router/productRoutes.js";
import adminRouter from "./router/adminRoutes.js";
import orderRouter from "./router/orderRoutes.js";
import chatRouter from "./router/chatRoutes.js";
import sellerRouter from "./router/sellerRoutes.js";
import settingsRouter from "./router/settingsRoutes.js";
import { extractPawaPayStatus, getPawaPayDepositStatus } from "./utils/pawaPay.js";
import { transitionPayment } from "./services/paymentService.js";

const app = express();

config();

app.use(
  cors({
    origin: [process.env.FRONTEND_URL, process.env.DASHBOARD_URL],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.disable("x-powered-by");
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(
  fileUpload({
    tempFileDir: "./uploads",
    useTempFiles: true,
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    safeFileNames: true,
  })
);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
const paymentLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false });

app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  const allowedOrigins = [process.env.FRONTEND_URL, process.env.DASHBOARD_URL].filter(Boolean);
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ success: false, message: "Origin not allowed." });
  }
  next();
});

app.get("/api/v1/health", (_req, res) => res.status(200).json({ success: true }));

app.use("/api/v1/auth", authLimiter, authRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/seller", sellerRouter);
app.use("/api/v1/settings", settingsRouter);

app.post("/api/v1/payment/pawapay/callback", paymentLimiter, async (req, res) => {
  try {
    const orderId = req.body?.depositId;
    if (!orderId) return res.status(400).json({ success: false });
    // Do not trust the callback body: confirm final status with pawaPay's authenticated API.
    const providerPayload = await getPawaPayDepositStatus(orderId);
    const providerStatus = extractPawaPayStatus(providerPayload);
    if (!["COMPLETED", "FAILED"].includes(providerStatus)) return res.status(202).json({ success: true });
    const result = await transitionPayment(orderId, providerStatus === "COMPLETED" ? "Paid" : "Failed", providerPayload);
    if (!result) return res.status(404).json({ success: false });
    res.status(200).json({ success: true, changed: result.changed });
  } catch (error) {
    console.error("pawaPay callback error:", error.message);
    res.status(500).json({ success: false });
  }
});

app.use(errorMiddleware);

export default app;
