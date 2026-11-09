import { rateLimit, ipKeyGenerator } from "express-rate-limit";

const common = { standardHeaders: "draft-8", legacyHeaders: false };

// Failed sign-ins per address and account: blocks password guessing without locking out
// customers who share a network, and normal page loads (/auth/me) are not counted at all.
export const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.email || "").trim().toLowerCase()}`,
  message: { success: false, message: "Too many failed sign-in attempts. Try again in 15 minutes." },
});

// Account creation and password-reset requests per address.
export const accountLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: { success: false, message: "Too many requests. Try again later." },
});

export const paymentLimiter = rateLimit({ ...common, windowMs: 60 * 1000, limit: 120 });
