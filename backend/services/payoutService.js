import prisma from "../database/db.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import {
  decimalToMinorUnits,
  divideMinorUnitsByRate,
  minorUnitsToDecimal,
  multiplyMinorUnitsByRateToWhole,
} from "./financialService.js";
import { appendLedgerEntry, auditFinancialAdjustment } from "./financialLedgerService.js";
import { ensureSellerDebtForRefund } from "./refundService.js";

const eligibleItemsWhere = (sellerId) => ({
  seller_id: sellerId,
  item_status: "Delivered",
  payout_id: null,
  order: { payment: { is: { payment_status: "Paid" } } },
});

export const sellerAvailableMinor = (item) =>
  decimalToMinorUnits(item.seller_net_amount) - decimalToMinorUnits(item.refunded_seller_amount || 0);

export const availableSellerMinor = (items) => items.reduce(
  (total, item) => total + sellerAvailableMinor(item),
  0n,
);

export const convertPayoutAmount = (sourceCents, currency, exchangeRate = 1) => {
  const sourceMinor = BigInt(sourceCents);
  if (currency === "USD") return minorUnitsToDecimal(sourceMinor);
  if (currency === "CDF" && Number(exchangeRate) > 0) {
    // Integer CDF amounts work with every DRC provider, including Vodacom.
    return multiplyMinorUnitsByRateToWhole(sourceMinor, exchangeRate).toString();
  }
  throw new ErrorHandler("A valid CDF exchange rate is required.", 503);
};

export async function reserveSellerEarnings({
  payoutId, sellerId, phone, provider, currency, exchangeRate = 1,
}) {
  return prisma.$transaction(async (tx) => {
    const items = await tx.orderItem.findMany({
      where: eligibleItemsWhere(sellerId),
      select: { id: true, seller_net_amount: true, refunded_seller_amount: true },
    });
    const payableItems = items.filter((item) => sellerAvailableMinor(item) > 0n);
    const sellerMinor = availableSellerMinor(payableItems);
    if (!payableItems.length || sellerMinor <= 0n) {
      throw new ErrorHandler("No delivered earnings are eligible for payout.", 409);
    }
    const debts = await tx.sellerDebt.findMany({
      where: { seller_id: sellerId, status: "Open", remaining_amount: { gt: 0 } },
      orderBy: { created_at: "asc" },
    });
    const totalDebtMinor = debts.reduce(
      (total, debt) => total + decimalToMinorUnits(debt.remaining_amount), 0n,
    );
    const recoveredMinor = sellerMinor < totalDebtMinor ? sellerMinor : totalDebtMinor;
    const payoutMinor = sellerMinor - recoveredMinor;
    const minimumMinor = decimalToMinorUnits(process.env.MIN_SELLER_PAYOUT_USD || "0");
    if (payoutMinor > 0n && payoutMinor < minimumMinor) {
      throw new ErrorHandler(`The minimum seller payout is ${minorUnitsToDecimal(minimumMinor)} USD.`, 409);
    }
    const sourceAmount = minorUnitsToDecimal(payoutMinor);
    const appliedExchangeRate = currency === "CDF" ? Number(exchangeRate) : 1;
    const payout = await tx.sellerPayout.create({
      data: {
        id: payoutId,
        seller_id: sellerId,
        amount: convertPayoutAmount(payoutMinor, currency, appliedExchangeRate),
        currency,
        source_amount: sourceAmount,
        source_currency: "USD",
        exchange_rate: appliedExchangeRate,
        seller_earnings_amount: minorUnitsToDecimal(sellerMinor),
        debt_recovered_amount: minorUnitsToDecimal(recoveredMinor),
        provider,
        phone,
      },
    });
    const reserved = await tx.orderItem.updateMany({
      where: { id: { in: payableItems.map((item) => item.id) }, payout_id: null },
      data: { payout_id: payoutId },
    });
    if (reserved.count !== payableItems.length) {
      throw new ErrorHandler("Seller earnings changed; retry the payout.", 409);
    }
    let remainingRecovery = recoveredMinor;
    for (const debt of debts) {
      if (remainingRecovery <= 0n) break;
      const debtMinor = decimalToMinorUnits(debt.remaining_amount);
      const appliedMinor = debtMinor < remainingRecovery ? debtMinor : remainingRecovery;
      await tx.sellerDebtRecovery.create({
        data: { debt_id: debt.id, payout_id: payoutId, amount: minorUnitsToDecimal(appliedMinor), currency: debt.currency },
      });
      const remainingDebt = debtMinor - appliedMinor;
      await tx.sellerDebt.update({
        where: { id: debt.id },
        data: {
          recovered_amount: { increment: minorUnitsToDecimal(appliedMinor) },
          remaining_amount: minorUnitsToDecimal(remainingDebt),
          status: remainingDebt === 0n ? "Recovered" : "Open",
        },
      });
      remainingRecovery -= appliedMinor;
    }
    return payout;
  }, { isolationLevel: "Serializable" });
}

export async function transitionSellerPayout(payoutId, nextStatus, providerPayload = null) {
  if (!["Completed", "Failed"].includes(nextStatus)) {
    throw new Error(`Unsupported payout status: ${nextStatus}`);
  }
  return prisma.$transaction(async (tx) => {
    const payout = await tx.sellerPayout.findUnique({
      where: { id: payoutId },
      include: { items: { include: { refunds: { where: { status: "Completed" } } } } },
    });
    if (!payout) return null;
    if (payout.status !== "Pending") return { payout, changed: false };
    const claimed = await tx.sellerPayout.updateMany({
      where: { id: payoutId, status: "Pending" },
      data: { status: nextStatus, provider_payload: providerPayload, processed_at: new Date() },
    });
    if (claimed.count === 0) return { payout, changed: false };
    if (nextStatus === "Failed") {
      await tx.orderItem.updateMany({ where: { payout_id: payoutId }, data: { payout_id: null } });
      const recoveries = await tx.sellerDebtRecovery.findMany({ where: { payout_id: payoutId } });
      for (const recovery of recoveries) {
        const debt = await tx.sellerDebt.findUnique({ where: { id: recovery.debt_id } });
        if (!debt) continue;
        const restored = decimalToMinorUnits(debt.remaining_amount) + decimalToMinorUnits(recovery.amount);
        await tx.sellerDebt.update({
          where: { id: debt.id },
          data: {
            recovered_amount: { decrement: recovery.amount },
            remaining_amount: minorUnitsToDecimal(restored),
            status: "Open",
          },
        });
      }
      await tx.sellerDebtRecovery.deleteMany({ where: { payout_id: payoutId } });
    } else {
      await appendLedgerEntry(tx, {
        idempotencyKey: `payout:${payoutId}:completed`, type: "PAYOUT",
        amountMinor: decimalToMinorUnits(payout.source_amount), currency: payout.source_currency,
        sellerId: payout.seller_id, payoutId,
      });
      const recoveries = await tx.sellerDebtRecovery.findMany({ where: { payout_id: payoutId } });
      for (const recovery of recoveries) {
        await appendLedgerEntry(tx, {
          idempotencyKey: `payout:${payoutId}:debt:${recovery.debt_id}`,
          type: "DEBT_RECOVERY", amountMinor: decimalToMinorUnits(recovery.amount), currency: recovery.currency,
          sellerId: payout.seller_id, payoutId, metadata: { debtId: recovery.debt_id },
        });
      }
      for (const item of payout.items) {
        for (const refund of item.refunds) await ensureSellerDebtForRefund(tx, refund, item, { ...payout, status: "Completed" });
      }
    }
    return { payout: { ...payout, status: nextStatus }, changed: true };
  }, { isolationLevel: "Serializable" });
}

export async function recordPayoutFee(payoutId, feeAmount, feeCurrency = "USD", {
  adminUserId = null, reason = "Payout fee reconciliation", source = "Admin", externalReference = null,
} = {}) {
  return prisma.$transaction(async (tx) => {
    if (externalReference) {
      const imported = await tx.financialAdjustmentAudit.findUnique({ where: { external_reference: externalReference } });
      if (imported) return { payout: await tx.sellerPayout.findUnique({ where: { id: payoutId } }), changed: false };
    }
    const payout = await tx.sellerPayout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new ErrorHandler("Payout not found.", 404);
    if (payout.status !== "Completed") throw new ErrorHandler("Only completed payouts can receive a fee.", 409);
    let feeMinor = decimalToMinorUnits(feeAmount);
    const normalizedCurrency = feeCurrency.toUpperCase();
    if (normalizedCurrency !== payout.source_currency) {
      if (normalizedCurrency === "CDF" && payout.source_currency === "USD") {
        feeMinor = divideMinorUnitsByRate(feeMinor, payout.exchange_rate);
      } else throw new ErrorHandler("Unsupported payout fee currency conversion.", 400);
    }
    const previousMinor = decimalToMinorUnits(payout.payout_fee);
    const changed = feeMinor !== previousMinor;
    const updated = await tx.sellerPayout.update({
      where: { id: payoutId }, data: { payout_fee: minorUnitsToDecimal(feeMinor) },
    });
    if (changed) {
      const audit = await auditFinancialAdjustment(tx, {
        entityType: "SellerPayout", entityId: payoutId, field: "payout_fee",
        previousValue: payout.payout_fee, newValue: minorUnitsToDecimal(feeMinor),
        currency: payout.source_currency, reason, source, adminUserId, externalReference,
      });
      await appendLedgerEntry(tx, {
        idempotencyKey: `audit:${audit.id}`,
        type: "PAYOUT_FEE", amountMinor: feeMinor - previousMinor, currency: payout.source_currency,
        sellerId: payout.seller_id, payoutId, source, adminUserId, metadata: { reason },
      });
    }
    return { payout: updated, changed };
  }, { isolationLevel: "Serializable" });
}
