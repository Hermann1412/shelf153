import express from "express";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import helmet from "helmet";
import { paymentLimiter } from "./middlewares/rateLimiters.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import authRouter from "./router/authRoutes.js";
import productRouter from "./router/productRoutes.js";
import adminRouter from "./router/adminRoutes.js";
import orderRouter from "./router/orderRoutes.js";
import chatRouter from "./router/chatRoutes.js";
import sellerRouter from "./router/sellerRoutes.js";
import settingsRouter from "./router/settingsRoutes.js";
import payoutRouter from "./router/payoutRoutes.js";
import refundRouter from "./router/refundRoutes.js";
import {
  extractPawaPayStatus,
  getPawaPayDepositStatus,
  getPawaPayPayoutStatus,
  matchesStoredPayment,
  matchesStoredPayout,
  getPawaPayRefundStatus,
  matchesStoredRefund,
} from "./utils/pawaPay.js";
import { transitionPayment } from "./services/paymentService.js";
import { transitionSellerPayout } from "./services/payoutService.js";
import { transitionRefund } from "./services/refundService.js";
import prisma from "./database/db.js";
import { requirePawaPayCallbackSignature } from "./middlewares/pawaPaySignature.js";

const app = express();

config();

if (process.env.TRUST_PROXY_HOPS) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
}

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
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buffer) => { req.rawBody = Buffer.from(buffer); },
}));
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

// Rate limits are set per route in authRoutes (sign-in, sign-up, password reset only).
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/seller", sellerRouter);
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1/payout", payoutRouter);
app.use("/api/v1/refund", refundRouter);

export const createPawaPayCallbackHandler = ({
  getStatus = getPawaPayDepositStatus,
  applyTransition = transitionPayment,
  findPayment = (orderId) => prisma.payment.findUnique({
    where: { order_id: orderId },
    include: { order: { select: { total_price: true } } },
  }),
} = {}) => async (req, res) => {
  try {
    const orderId = req.body?.depositId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId || "")) {
      return res.status(400).json({ success: false });
    }
    const payment = await findPayment(orderId);
    if (!payment) return res.status(404).json({ success: false });
    // Do not trust the callback body: confirm final status with pawaPay's authenticated API.
    const providerPayload = await getStatus(orderId);
    const providerStatus = extractPawaPayStatus(providerPayload);
    if (!["COMPLETED", "FAILED"].includes(providerStatus)) return res.status(202).json({ success: true });
    if (!matchesStoredPayment(payment, providerPayload)) return res.status(409).json({ success: false });
    const result = await applyTransition(orderId, providerStatus === "COMPLETED" ? "Paid" : "Failed", providerPayload);
    if (!result) return res.status(404).json({ success: false });
    res.status(200).json({ success: true, changed: result.changed });
  } catch (error) {
    console.error("pawaPay callback error:", error.message);
    res.status(500).json({ success: false });
  }
};

app.post("/api/v1/payment/pawapay/callback", paymentLimiter, requirePawaPayCallbackSignature, createPawaPayCallbackHandler());

export const createPawaPayPayoutCallbackHandler = ({
  getStatus = getPawaPayPayoutStatus,
  applyTransition = transitionSellerPayout,
  findPayout = (payoutId) => prisma.sellerPayout.findUnique({ where: { id: payoutId } }),
} = {}) => async (req, res) => {
  try {
    const payoutId = req.body?.payoutId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payoutId || "")) {
      return res.status(400).json({ success: false });
    }
    const payout = await findPayout(payoutId);
    if (!payout) return res.status(404).json({ success: false });
    const payload = await getStatus(payoutId);
    const providerStatus = extractPawaPayStatus(payload);
    if (!["COMPLETED", "FAILED"].includes(providerStatus)) return res.status(202).json({ success: true });
    if (!matchesStoredPayout(payout, payload)) return res.status(409).json({ success: false });
    const result = await applyTransition(payoutId, providerStatus === "COMPLETED" ? "Completed" : "Failed", payload);
    res.status(200).json({ success: true, changed: result?.changed || false });
  } catch (error) {
    console.error("pawaPay payout callback error:", error.message);
    res.status(500).json({ success: false });
  }
};

app.post(
  "/api/v1/payment/pawapay/payout-callback",
  paymentLimiter,
  requirePawaPayCallbackSignature,
  createPawaPayPayoutCallbackHandler(),
);

export const createPawaPayRefundCallbackHandler = ({
  getStatus = getPawaPayRefundStatus,
  applyTransition = transitionRefund,
  findRefund = (refundId) => prisma.saleRefund.findUnique({ where: { id: refundId } }),
} = {}) => async (req, res) => {
  try {
    const refundId = req.body?.refundId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(refundId || "")) {
      return res.status(400).json({ success: false });
    }
    const refund = await findRefund(refundId);
    if (!refund) return res.status(404).json({ success: false });
    const payload = await getStatus(refundId);
    if (payload?.status !== "FOUND") return res.status(202).json({ success: true });
    const providerStatus = extractPawaPayStatus(payload);
    if (!["COMPLETED", "FAILED"].includes(providerStatus)) return res.status(202).json({ success: true });
    if (!matchesStoredRefund(refund, payload)) return res.status(409).json({ success: false });
    const result = await applyTransition(refundId, providerStatus, payload);
    res.status(200).json({ success: true, changed: result?.changed || false });
  } catch (error) {
    console.error(JSON.stringify({ event: "pawapay.refund.callback_failed", error: error.message }));
    res.status(500).json({ success: false });
  }
};

app.post(
  "/api/v1/payment/pawapay/refund-callback",
  paymentLimiter,
  requirePawaPayCallbackSignature,
  createPawaPayRefundCallbackHandler(),
);

app.use(errorMiddleware);

export default app;
