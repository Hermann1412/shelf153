import prisma from "../database/db.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import {
  decimalToMinorUnits,
  divideMinorUnitsByRate,
  minorUnitsToDecimal,
} from "./financialService.js";
import { appendLedgerEntry, auditFinancialAdjustment } from "./financialLedgerService.js";
import { recordCompletedRefund } from "./refundService.js";

export async function transitionPayment(orderId, nextStatus, providerPayload = null) {
  if (!["Paid", "Failed"].includes(nextStatus)) {
    throw new Error(`Unsupported payment status: ${nextStatus}`);
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { order_id: orderId },
      include: { order: { include: { order_items: true } } },
    });
    if (!payment) return null;
    if (payment.payment_status !== "Pending") return { payment, changed: false };

    const claimed = await tx.payment.updateMany({
      where: { order_id: orderId, payment_status: "Pending" },
      data: {
        payment_status: nextStatus,
        accounting_status: nextStatus === "Paid" ? "Final" : "Void",
        provider_payload: providerPayload,
        processed_at: new Date(),
      },
    });
    if (claimed.count === 0) return { payment, changed: false };

    if (nextStatus === "Paid") {
      await tx.order.update({
        where: { id: orderId },
        data: { paid_at: new Date(), stock_reserved: false },
      });
      await appendLedgerEntry(tx, {
        idempotencyKey: `payment:${payment.id}:sale`, type: "SALE",
        amountMinor: decimalToMinorUnits(payment.gross_sales_amount), currency: payment.accounting_currency,
        orderId, paymentId: payment.id,
      });
      await appendLedgerEntry(tx, {
        idempotencyKey: `payment:${payment.id}:commission`, type: "PLATFORM_COMMISSION",
        amountMinor: decimalToMinorUnits(payment.gross_commission), currency: payment.accounting_currency,
        orderId, paymentId: payment.id,
      });
      for (const item of payment.order.order_items) {
        if (!item.seller_id) continue;
        await appendLedgerEntry(tx, {
          idempotencyKey: `item:${item.id}:seller-payable`, type: "SELLER_PAYABLE",
          amountMinor: decimalToMinorUnits(item.seller_net_amount), currency: payment.accounting_currency,
          orderId, paymentId: payment.id, sellerId: item.seller_id,
        });
      }
    } else if (payment.order.stock_reserved) {
      for (const item of payment.order.order_items) {
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.order.update({ where: { id: orderId }, data: { stock_reserved: false } });
    }

    return { payment: { ...payment, payment_status: nextStatus }, changed: true };
  }, { isolationLevel: "Serializable" });
}

const feeInAccountingMinor = (payment, feeAmount, feeCurrency) => {
  const feeMinor = decimalToMinorUnits(feeAmount);
  if (feeCurrency === payment.accounting_currency) return feeMinor;
  if (feeCurrency === "CDF" && payment.accounting_currency === "USD") {
    return divideMinorUnitsByRate(feeMinor, payment.exchange_rate);
  }
  throw new ErrorHandler("Unsupported payment fee currency conversion.", 400);
};

export async function recordPaymentFee(orderId, feeAmount, feeCurrency = "USD", {
  adminUserId = null, reason = "Payment fee reconciliation", source = "Admin", externalReference = null,
} = {}) {
  return prisma.$transaction(async (tx) => {
    if (externalReference) {
      const imported = await tx.financialAdjustmentAudit.findUnique({ where: { external_reference: externalReference } });
      if (imported) return { payment: await tx.payment.findUnique({ where: { order_id: orderId } }), changed: false };
    }
    const payment = await tx.payment.findUnique({ where: { order_id: orderId } });
    if (!payment) throw new ErrorHandler("Payment not found.", 404);
    if (payment.payment_status !== "Paid") throw new ErrorHandler("Only paid transactions can receive a payment fee.", 409);
    const feeMinor = feeInAccountingMinor(payment, feeAmount, feeCurrency.toUpperCase());
    const commissionMinor = decimalToMinorUnits(payment.gross_commission)
      - decimalToMinorUnits(payment.refunded_commission);
    const refundedFeeMinor = decimalToMinorUnits(payment.payment_fee_refunded);
    const platformNetMinor = commissionMinor - feeMinor + refundedFeeMinor;
    const changed = decimalToMinorUnits(payment.payment_fee) !== feeMinor;
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        payment_fee: minorUnitsToDecimal(feeMinor),
        platform_net_revenue: minorUnitsToDecimal(platformNetMinor),
      },
    });
    if (changed) {
      const audit = await auditFinancialAdjustment(tx, {
        entityType: "Payment", entityId: payment.id, field: "payment_fee",
        previousValue: payment.payment_fee, newValue: minorUnitsToDecimal(feeMinor),
        currency: payment.accounting_currency, reason, source, adminUserId, externalReference,
      });
      await appendLedgerEntry(tx, {
        idempotencyKey: `audit:${audit.id}`,
        type: "PAYMENT_FEE",
        amountMinor: feeMinor - decimalToMinorUnits(payment.payment_fee),
        currency: payment.accounting_currency,
        orderId: payment.order_id, paymentId: payment.id,
        source, adminUserId,
        metadata: { reason, resultingFee: minorUnitsToDecimal(feeMinor) },
      });
    }
    return { payment: updated, changed };
  }, { isolationLevel: "Serializable" });
}

export async function recordSaleRefund({
  orderId,
  orderItemId,
  externalReference,
  grossAmount,
  paymentFeeRefund = "0",
  providerPayload = null,
}) {
  return recordCompletedRefund({
    orderId, orderItemId, externalReference, grossAmount, paymentFeeRefund, providerPayload,
  });
}
