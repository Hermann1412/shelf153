import prisma from "../database/db.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { createExchangeRate, getExchangeRate } from "../services/exchangeRateService.js";
import { recordPaymentFee } from "../services/paymentService.js";
import { recordPayoutFee } from "../services/payoutService.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";

export const fetchFinanceOperations = catchAsyncErrors(async (_req, res) => {
  const [refunds, payouts, debts, ledger, adjustments, rates, activeRate] = await Promise.all([
    prisma.saleRefund.findMany({ orderBy: { created_at: "desc" }, take: 200 }),
    prisma.sellerPayout.findMany({ orderBy: { created_at: "desc" }, take: 200 }),
    prisma.sellerDebt.findMany({
      include: { recoveries: { orderBy: { created_at: "asc" } } },
      orderBy: { created_at: "desc" }, take: 200,
    }),
    prisma.financialLedgerEntry.findMany({ orderBy: { created_at: "desc" }, take: 500 }),
    prisma.financialAdjustmentAudit.findMany({ orderBy: { created_at: "desc" }, take: 200 }),
    prisma.exchangeRate.findMany({ orderBy: [{ effective_at: "desc" }, { created_at: "desc" }], take: 100 }),
    getExchangeRate("USD", "CDF"),
  ]);
  res.status(200).json({ success: true, refunds, payouts, debts, ledger, adjustments, rates, activeRate });
});

export const addExchangeRate = catchAsyncErrors(async (req, res) => {
  const rate = await createExchangeRate({
    sourceCurrency: req.body?.sourceCurrency || "USD",
    destinationCurrency: req.body?.destinationCurrency || "CDF",
    rate: String(req.body?.rate || ""),
    effectiveAt: req.body?.effectiveAt,
    createdBy: req.user.id,
  });
  res.status(201).json({ success: true, rate });
});

export const importProviderFees = catchAsyncErrors(async (req, res, next) => {
  const entries = req.body?.entries;
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 500) {
    return next(new ErrorHandler("Provide between 1 and 500 fee entries.", 400));
  }
  const results = [];
  for (const entry of entries) {
    const reference = String(entry?.reference || "").trim();
    const amount = String(entry?.amount || "").trim();
    const currency = String(entry?.currency || "USD").toUpperCase();
    const reason = String(entry?.reason || `pawaPay fee import ${reference}`).trim();
    if (!reference || reference.length > 255 || !/^\d+(\.\d{1,2})?$/.test(amount)
        || !["USD", "CDF"].includes(currency) || !["payment", "payout"].includes(entry?.kind)) {
      return next(new ErrorHandler("Invalid provider fee import entry.", 400));
    }
    const options = { adminUserId: req.user.id, reason, source: "Import", externalReference: reference };
    const result = entry.kind === "payment"
      ? await recordPaymentFee(String(entry.orderId || ""), amount, currency, options)
      : await recordPayoutFee(String(entry.payoutId || ""), amount, currency, options);
    results.push({ reference, changed: result.changed });
  }
  res.status(200).json({ success: true, results });
});
