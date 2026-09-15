import prisma from "../database/db.js";
import {
  extractPawaPayStatus,
  getPawaPayDepositStatus,
  getPawaPayPayoutStatus,
  getPawaPayRefundStatus,
  matchesStoredPayment,
  matchesStoredPayout,
  matchesStoredRefund,
} from "../utils/pawaPay.js";
import { transitionPayment } from "./paymentService.js";
import { transitionSellerPayout } from "./payoutService.js";
import { transitionRefund } from "./refundService.js";
import { financialLog } from "../utils/financialLogger.js";

const positiveNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

export const reconciliationDelayMs = () =>
  positiveNumber(process.env.PAYMENT_RECONCILIATION_AFTER_MINUTES, 15) * 60_000;

const retryDelayMs = (attempts, baseDelay) => Math.min(
  baseDelay * (2 ** Math.min(Math.max(attempts - 1, 0), 6)),
  positiveNumber(process.env.PAWAPAY_RECONCILIATION_MAX_DELAY_MINUTES, 360) * 60_000,
);

const retryDue = (transaction, now, baseDelay) => !transaction.last_checked_at
  || transaction.last_checked_at.getTime() + retryDelayMs(transaction.check_attempts, baseDelay) <= now.getTime();

const notFoundIsDefinitive = (attempts) => attempts >= positiveNumber(
  process.env.PAWAPAY_NOT_FOUND_CONFIRMATIONS, 3,
);

const alertIfStuck = (kind, transaction, identifiers) => {
  const threshold = positiveNumber(process.env.PAWAPAY_RECONCILIATION_ALERT_AFTER_ATTEMPTS, 5);
  if (transaction.check_attempts >= threshold) {
    financialLog("warn", `pawapay.${kind}.stuck`, { ...identifiers, checkAttempts: transaction.check_attempts });
  }
};

export async function reconcilePendingPayments({
  now = new Date(),
  getStatus = getPawaPayDepositStatus,
  limit = 100,
} = {}) {
  const retryBefore = new Date(now.getTime() - reconciliationDelayMs());
  const payments = await prisma.payment.findMany({
    where: {
      payment_status: "Pending",
      created_at: { lte: retryBefore },
      order: { stock_reserved: true },
    },
    orderBy: [{ last_checked_at: { sort: "asc", nulls: "first" } }, { created_at: "asc" }],
    include: { order: { select: { total_price: true } } },
    take: limit * 3,
  });

  const results = [];
  for (const payment of payments) {
    if (results.length >= limit || !retryDue(payment, now, reconciliationDelayMs())) continue;
    alertIfStuck("deposit", payment, { orderId: payment.order_id, paymentId: payment.id });
    try {
      const claimed = await prisma.payment.updateMany({
        where: {
          id: payment.id,
          payment_status: "Pending",
          OR: [{ last_checked_at: null }, { last_checked_at: { lte: retryBefore } }],
        },
        data: { last_checked_at: now, check_attempts: { increment: 1 } },
      });
      if (claimed.count === 0) continue;
      const payload = await getStatus(payment.transaction_id);
      const status = extractPawaPayStatus(payload);
      if (status === "COMPLETED" || status === "FAILED") {
        if (!matchesStoredPayment(payment, payload)) {
          financialLog("error", "pawapay.deposit.reconciliation_mismatch", { orderId: payment.order_id, paymentId: payment.id });
          continue;
        }
        await transitionPayment(payment.order_id, status === "COMPLETED" ? "Paid" : "Failed", payload);
        results.push({ orderId: payment.order_id, status });
      } else if (payload?.status === "NOT_FOUND" && notFoundIsDefinitive(payment.check_attempts + 1)) {
        await transitionPayment(payment.order_id, "Failed", payload);
        results.push({ orderId: payment.order_id, status: "NOT_FOUND" });
      }
    } catch (error) {
      financialLog("warn", "pawapay.deposit.reconciliation_failed", { orderId: payment.order_id, paymentId: payment.id, error: error.message });
    }
  }
  return results;
}

export async function reconcilePendingPayouts({
  now = new Date(),
  getStatus = getPawaPayPayoutStatus,
  limit = 100,
} = {}) {
  const delay = positiveNumber(process.env.PAYOUT_RECONCILIATION_AFTER_MINUTES, 15) * 60_000;
  const retryBefore = new Date(now.getTime() - delay);
  const payouts = await prisma.sellerPayout.findMany({
    where: {
      status: "Pending",
      created_at: { lte: retryBefore },
    },
    orderBy: [{ last_checked_at: { sort: "asc", nulls: "first" } }, { created_at: "asc" }],
    take: limit * 3,
  });
  const results = [];
  for (const payout of payouts) {
    if (results.length >= limit || !retryDue(payout, now, delay)) continue;
    alertIfStuck("payout", payout, { payoutId: payout.id, sellerId: payout.seller_id });
    try {
      const claimed = await prisma.sellerPayout.updateMany({
        where: {
          id: payout.id,
          status: "Pending",
          OR: [{ last_checked_at: null }, { last_checked_at: { lte: retryBefore } }],
        },
        data: { last_checked_at: now, check_attempts: { increment: 1 } },
      });
      if (claimed.count === 0) continue;
      const payload = await getStatus(payout.id);
      const status = extractPawaPayStatus(payload);
      if (status === "COMPLETED" || status === "FAILED") {
        if (!matchesStoredPayout(payout, payload)) {
          financialLog("error", "pawapay.payout.reconciliation_mismatch", { payoutId: payout.id, sellerId: payout.seller_id });
          continue;
        }
        await transitionSellerPayout(payout.id, status === "COMPLETED" ? "Completed" : "Failed", payload);
        results.push({ payoutId: payout.id, status });
      } else if (payload?.status === "NOT_FOUND" && notFoundIsDefinitive(payout.check_attempts + 1)) {
        await transitionSellerPayout(payout.id, "Failed", payload);
        results.push({ payoutId: payout.id, status: "NOT_FOUND" });
      }
    } catch (error) {
      financialLog("warn", "pawapay.payout.reconciliation_failed", { payoutId: payout.id, sellerId: payout.seller_id, error: error.message });
    }
  }
  return results;
}

export async function reconcilePendingRefunds({
  now = new Date(),
  getStatus = getPawaPayRefundStatus,
  limit = 100,
} = {}) {
  const delay = positiveNumber(process.env.REFUND_RECONCILIATION_AFTER_MINUTES, 5) * 60_000;
  const refunds = await prisma.saleRefund.findMany({
    where: {
      status: { in: ["Pending", "Accepted", "Processing", "Enqueued"] },
      created_at: { lte: new Date(now.getTime() - delay) },
      OR: [{ next_check_at: null }, { next_check_at: { lte: now } }],
    },
    orderBy: [{ next_check_at: { sort: "asc", nulls: "first" } }, { created_at: "asc" }],
    take: limit,
  });
  const results = [];
  for (const refund of refunds) {
    alertIfStuck("refund", refund, { refundId: refund.id, paymentId: refund.payment_id });
    try {
      const nextCheck = new Date(now.getTime() + retryDelayMs(refund.check_attempts + 1, delay));
      const claimed = await prisma.saleRefund.updateMany({
        where: {
          id: refund.id,
          status: { in: ["Pending", "Accepted", "Processing", "Enqueued"] },
          OR: [{ next_check_at: null }, { next_check_at: { lte: now } }],
        },
        data: { last_checked_at: now, next_check_at: nextCheck, check_attempts: { increment: 1 } },
      });
      if (claimed.count === 0) continue;
      const payload = await getStatus(refund.id);
      if (payload?.status !== "FOUND") {
        if (payload?.status === "NOT_FOUND" && notFoundIsDefinitive(refund.check_attempts + 1)) {
          await transitionRefund(refund.id, "FAILED", { failureReason: { failureCode: "NOT_FOUND" } });
          results.push({ refundId: refund.id, status: "NOT_FOUND" });
        }
        continue;
      }
      if (!matchesStoredRefund(refund, payload)) {
        financialLog("error", "pawapay.refund.reconciliation_mismatch", { refundId: refund.id, paymentId: refund.payment_id });
        continue;
      }
      const status = extractPawaPayStatus(payload);
      if (["COMPLETED", "FAILED", "PROCESSING", "ENQUEUED"].includes(status)) {
        await transitionRefund(refund.id, status, payload);
        results.push({ refundId: refund.id, status });
      }
    } catch (error) {
      financialLog("warn", "pawapay.refund.reconciliation_failed", { refundId: refund.id, paymentId: refund.payment_id, error: error.message });
    }
  }
  return results;
}

export const startPaymentReconciliation = () => {
  const intervalMs = positiveNumber(process.env.PAYMENT_RECONCILIATION_INTERVAL_MS, 60_000);
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await Promise.all([reconcilePendingPayments(), reconcilePendingPayouts(), reconcilePendingRefunds()]);
    } catch (error) {
      financialLog("error", "pawapay.reconciliation_cycle_failed", { error: error.message });
    } finally {
      running = false;
    }
  };
  const timer = setInterval(run, intervalMs);
  timer.unref();
  void run();
  return timer;
};
