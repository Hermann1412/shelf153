import { randomUUID } from "crypto";
import prisma from "../database/db.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import {
  calculateCumulativeRefund,
  decimalToMinorUnits,
  minorUnitsToDecimal,
  multiplyMinorUnitsByRateToWhole,
} from "./financialService.js";
import { appendLedgerEntry } from "./financialLedgerService.js";
import {
  extractPawaPayStatus,
  getPawaPayRefundStatus,
  matchesStoredRefund,
} from "../utils/pawaPay.js";
import { initiateRefund } from "../utils/pawaPayRefund.js";
import { financialLog } from "../utils/financialLogger.js";

const ACTIVE_STATUSES = ["Pending", "Accepted", "Processing", "Enqueued"];
const FINAL_STATUSES = ["Completed", "Failed"];

const providerAmountForCumulative = (accountingMinor, payment) => {
  if (payment.currency === payment.accounting_currency) return accountingMinor;
  if (payment.currency === "CDF" && payment.accounting_currency === "USD") {
    return multiplyMinorUnitsByRateToWhole(accountingMinor, payment.exchange_rate) * 100n;
  }
  throw new ErrorHandler("Unsupported refund currency conversion.", 400);
};

const refundFailure = (payload) => {
  const reason = payload?.rejectionReason || payload?.failureReason || payload?.data?.failureReason || {};
  return {
    failure_code: reason.rejectionCode || reason.failureCode || reason.code || null,
    failure_message: reason.rejectionMessage || reason.failureMessage || reason.message || null,
  };
};

export const ensureSellerDebtForRefund = async (tx, refund, item, payout) => {
  if (!item.seller_id || payout?.status !== "Completed") return null;
  const amountMinor = decimalToMinorUnits(refund.seller_amount);
  if (amountMinor <= 0n) return null;
  const debt = await tx.sellerDebt.upsert({
    where: { refund_id: refund.id },
    update: {},
    create: {
      seller_id: item.seller_id,
      order_id: item.order_id,
      refund_id: refund.id,
      original_amount: refund.seller_amount,
      remaining_amount: refund.seller_amount,
      currency: refund.currency,
    },
  });
  await appendLedgerEntry(tx, {
    idempotencyKey: `refund:${refund.id}:seller-debt`,
    type: "SELLER_REFUND_DEBT",
    amountMinor,
    currency: refund.currency,
    orderId: item.order_id,
    paymentId: refund.payment_id,
    sellerId: item.seller_id,
    refundId: refund.id,
    payoutId: payout.id,
    externalReference: refund.external_reference,
  });
  return debt;
};

const applyRefundAccounting = async (tx, refund) => {
  if (refund.accounting_applied) return refund;
  const payment = await tx.payment.findUnique({ where: { id: refund.payment_id } });
  const item = await tx.orderItem.findUnique({
    where: { id: refund.order_item_id },
    include: { payout: true },
  });
  if (!payment || !item) throw new ErrorHandler("Refund accounting references are invalid.", 409);

  const refundGrossMinor = decimalToMinorUnits(refund.gross_amount);
  const refundCommissionMinor = decimalToMinorUnits(refund.commission_amount);
  const refundSellerMinor = decimalToMinorUnits(refund.seller_amount);
  const feeRefundMinor = decimalToMinorUnits(refund.payment_fee_refund);
  const updatedRefundedGross = decimalToMinorUnits(payment.refunded_gross_amount) + refundGrossMinor;
  const updatedRefundedCommission = decimalToMinorUnits(payment.refunded_commission) + refundCommissionMinor;
  const updatedRefundedSeller = decimalToMinorUnits(payment.refunded_seller_amount) + refundSellerMinor;
  const updatedFeeRefund = decimalToMinorUnits(payment.payment_fee_refunded) + feeRefundMinor;

  if (updatedRefundedGross > decimalToMinorUnits(payment.gross_sales_amount)
      || decimalToMinorUnits(item.refunded_gross_amount) + refundGrossMinor > decimalToMinorUnits(item.gross_amount)) {
    throw new ErrorHandler("Completed refund exceeds the remaining sale amount.", 409);
  }
  if (updatedFeeRefund > decimalToMinorUnits(payment.payment_fee)) {
    throw new ErrorHandler("Refunded payment fees exceed recorded payment fees.", 409);
  }

  const platformNet = decimalToMinorUnits(payment.gross_commission)
    - updatedRefundedCommission - decimalToMinorUnits(payment.payment_fee) + updatedFeeRefund;
  await tx.orderItem.update({
    where: { id: item.id },
    data: {
      refunded_gross_amount: { increment: refund.gross_amount },
      refunded_commission: { increment: refund.commission_amount },
      refunded_seller_amount: { increment: refund.seller_amount },
    },
  });
  await tx.payment.update({
    where: { id: payment.id },
    data: {
      refunded_gross_amount: minorUnitsToDecimal(updatedRefundedGross),
      refunded_commission: minorUnitsToDecimal(updatedRefundedCommission),
      refunded_seller_amount: minorUnitsToDecimal(updatedRefundedSeller),
      payment_fee_refunded: minorUnitsToDecimal(updatedFeeRefund),
      platform_net_revenue: minorUnitsToDecimal(platformNet),
      accounting_status: updatedRefundedGross === decimalToMinorUnits(payment.gross_sales_amount)
        ? "Refunded" : "PartiallyRefunded",
    },
  });
  const updated = await tx.saleRefund.update({
    where: { id: refund.id },
    data: { accounting_applied: true },
  });
  await appendLedgerEntry(tx, {
    idempotencyKey: `refund:${refund.id}:completed`,
    type: "REFUND",
    amountMinor: refundGrossMinor,
    currency: refund.currency,
    orderId: item.order_id,
    paymentId: payment.id,
    sellerId: item.seller_id,
    refundId: refund.id,
    externalReference: refund.external_reference,
    metadata: {
      commissionAmount: String(refund.commission_amount),
      sellerAmount: String(refund.seller_amount),
      paymentFeeRefund: String(refund.payment_fee_refund),
    },
  });
  await ensureSellerDebtForRefund(tx, updated, item, item.payout);
  return updated;
};

export async function createRefundRequest({
  orderId,
  orderItemId,
  externalReference,
  grossAmount,
  paymentFeeRefund = "0",
  initiatedBy = null,
}) {
  if (!externalReference || externalReference.length > 255) {
    throw new ErrorHandler("A valid idempotency reference is required.", 400);
  }
  return prisma.$transaction(async (tx) => {
    const existing = await tx.saleRefund.findUnique({ where: { external_reference: externalReference } });
    if (existing) return { refund: existing, created: false };
    const payment = await tx.payment.findUnique({
      where: { order_id: orderId },
      include: { refunds: { where: { status: { not: "Failed" } } } },
    });
    if (!payment) throw new ErrorHandler("Payment not found.", 404);
    if (payment.payment_status !== "Paid") throw new ErrorHandler("Only a paid transaction can be refunded.", 409);
    const active = payment.refunds.find((refund) => ACTIVE_STATUSES.includes(refund.status));
    if (active) throw new ErrorHandler("Another refund is already in progress for this payment.", 409);
    const item = await tx.orderItem.findUnique({ where: { id: orderItemId } });
    if (!item || item.order_id !== orderId) throw new ErrorHandler("Order item not found.", 404);
    const shipping = await tx.shippingInfo.findUnique({ where: { order_id: orderId } });
    if (!shipping) throw new ErrorHandler("Shipping information is missing for this refund.", 409);

    const values = calculateCumulativeRefund({
      grossAmount,
      previousRefunded: item.refunded_gross_amount,
      commissionRate: item.commission_rate,
    });
    if (decimalToMinorUnits(item.refunded_gross_amount) + values.grossMinor > decimalToMinorUnits(item.gross_amount)) {
      throw new ErrorHandler("Refund exceeds the remaining sale amount.", 409);
    }
    const feeRefundMinor = decimalToMinorUnits(paymentFeeRefund);
    if (decimalToMinorUnits(payment.payment_fee_refunded) + feeRefundMinor > decimalToMinorUnits(payment.payment_fee)) {
      throw new ErrorHandler("Refunded payment fees exceed recorded payment fees.", 409);
    }

    const previousProviderMinor = payment.refunds.reduce(
      (total, refund) => total + decimalToMinorUnits(refund.provider_amount), 0n,
    );
    const cumulativeGrossMinor = decimalToMinorUnits(payment.refunded_gross_amount) + values.grossMinor;
    const providerCumulativeMinor = cumulativeGrossMinor === decimalToMinorUnits(payment.gross_sales_amount)
      ? decimalToMinorUnits(payment.amount)
      : providerAmountForCumulative(cumulativeGrossMinor, payment);
    const providerMinor = providerCumulativeMinor - previousProviderMinor;
    if (providerMinor <= 0n) throw new ErrorHandler("Refund amount is too small in the payment currency.", 409);
    const refund = await tx.saleRefund.create({
      data: {
        id: randomUUID(),
        external_reference: externalReference,
        payment_id: payment.id,
        order_item_id: item.id,
        gross_amount: values.grossAmount,
        commission_amount: values.commissionAmount,
        seller_amount: values.sellerAmount,
        payment_fee_refund: minorUnitsToDecimal(feeRefundMinor),
        platform_net_adjustment: minorUnitsToDecimal(feeRefundMinor - values.commissionMinor),
        currency: payment.accounting_currency,
        provider_amount: minorUnitsToDecimal(providerMinor),
        provider_currency: payment.currency,
        provider: payment.provider,
        phone: String(shipping.phone).replace(/\D/g, ""),
        initiated_by: initiatedBy,
        next_check_at: new Date(),
      },
    });
    return { refund, created: true };
  }, { isolationLevel: "Serializable" });
}

export async function transitionRefund(refundId, providerStatus, providerPayload = null) {
  const nextStatus = providerStatus === "COMPLETED" ? "Completed"
    : providerStatus === "FAILED" ? "Failed"
      : ["PROCESSING", "ENQUEUED", "ACCEPTED"].includes(providerStatus) ? providerStatus[0] + providerStatus.slice(1).toLowerCase()
        : null;
  if (!nextStatus) throw new Error(`Unsupported refund status: ${providerStatus}`);
  return prisma.$transaction(async (tx) => {
    let refund = await tx.saleRefund.findUnique({ where: { id: refundId } });
    if (!refund) return null;
    if (FINAL_STATUSES.includes(refund.status)) return { refund, changed: false };
    const data = {
      status: nextStatus,
      provider_payload: providerPayload || undefined,
      processed_at: FINAL_STATUSES.includes(nextStatus) ? new Date() : undefined,
      next_check_at: FINAL_STATUSES.includes(nextStatus) ? null : new Date(Date.now() + 60_000),
      ...(nextStatus === "Failed" ? refundFailure(providerPayload) : {}),
    };
    const claimed = await tx.saleRefund.updateMany({
      where: { id: refundId, status: { in: ACTIVE_STATUSES } },
      data,
    });
    if (claimed.count === 0) return { refund, changed: false };
    refund = await tx.saleRefund.findUnique({ where: { id: refundId } });
    if (nextStatus === "Completed") refund = await applyRefundAccounting(tx, refund);
    return { refund, changed: true };
  }, { isolationLevel: "Serializable" });
}

export async function submitRefund(input, dependencies = {}) {
  const { refund, created } = await createRefundRequest(input);
  if (!created && FINAL_STATUSES.includes(refund.status)) return { refund, changed: false };
  const getStatus = dependencies.getStatus || getPawaPayRefundStatus;
  const start = dependencies.initiate || initiateRefund;

  if (!created) {
    try {
      const statusPayload = await getStatus(refund.id);
      if (statusPayload?.status === "FOUND") {
        const status = extractPawaPayStatus(statusPayload);
        if (!matchesStoredRefund(refund, statusPayload)) throw new ErrorHandler("Refund provider data mismatch.", 502);
        if (["COMPLETED", "FAILED", "PROCESSING", "ENQUEUED"].includes(status)) {
          const result = await transitionRefund(refund.id, status, statusPayload);
          return { refund: result.refund, changed: result.changed };
        }
      }
    } catch (error) {
      financialLog("warn", "pawapay.refund.pre_retry_check_failed", { refundId: refund.id, error: error.message });
      return { refund, changed: false, uncertain: true };
    }
  }

  const result = await start({
    refundId: refund.id,
    depositId: (await prisma.payment.findUnique({
      where: { id: refund.payment_id }, select: { transaction_id: true },
    })).transaction_id,
    amount: refund.provider_amount,
    currency: refund.provider_currency,
    orderId: input.orderId,
  });
  if (result.success) {
    const transitioned = await transitionRefund(refund.id, "ACCEPTED", result.providerResponse);
    return { refund: transitioned.refund, changed: true };
  }
  if (result.definitive) {
    const transitioned = await transitionRefund(refund.id, "FAILED", result.providerResponse);
    return { refund: transitioned.refund, changed: true };
  }
  await prisma.saleRefund.update({
    where: { id: refund.id },
    data: { provider_payload: result.providerResponse || undefined, next_check_at: new Date(Date.now() + 60_000) },
  });
  return { refund, changed: created, uncertain: true };
}

export async function recordCompletedRefund(input) {
  const { refund } = await createRefundRequest(input);
  return transitionRefund(refund.id, "COMPLETED", input.providerPayload);
}
