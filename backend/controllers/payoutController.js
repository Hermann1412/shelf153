import { randomUUID } from "crypto";
import prisma from "../database/db.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { initiatePayout } from "../utils/pawaPayPayout.js";
import {
  extractPawaPayStatus,
  getPawaPayPayoutStatus,
  matchesStoredPayout,
  normalizePhoneNumber,
} from "../utils/pawaPay.js";
import {
  convertPayoutAmount,
  availableSellerMinor,
  sellerAvailableMinor,
  reserveSellerEarnings,
  transitionSellerPayout,
  recordPayoutFee,
} from "../services/payoutService.js";
import { decimalToMinorUnits } from "../services/financialService.js";
import { getExchangeRate } from "../services/exchangeRateService.js";

const publicPayoutSelect = {
  id: true,
  seller_id: true,
  amount: true,
  currency: true,
  source_amount: true,
  source_currency: true,
  exchange_rate: true,
  seller_earnings_amount: true,
  debt_recovered_amount: true,
  payout_fee: true,
  provider: true,
  phone: true,
  status: true,
  processed_at: true,
  created_at: true,
  seller: { select: { name: true, seller_profile: { select: { store_name: true } } } },
  _count: { select: { items: true } },
};

const allowedProviders = () => new Set(
  (process.env.PAWAPAY_PAYOUT_ALLOWED_PROVIDERS
    || process.env.PAWAPAY_ALLOWED_PROVIDERS
    || "AIRTEL_COD,VODACOM_MPESA_COD,ORANGE_COD")
    .split(",").map((value) => value.trim()).filter(Boolean),
);

const allowedCurrencies = () => new Set(
  (process.env.PAWAPAY_PAYOUT_ALLOWED_CURRENCIES || "USD,CDF")
    .split(",").map((value) => value.trim().toUpperCase()).filter(Boolean),
);

const cdfExchangeRate = async () => {
  const configured = await getExchangeRate("USD", "CDF");
  return configured ? Number(configured.rate) : null;
};

const eligibleItemsWhere = (sellerId) => ({
  seller_id: sellerId,
  item_status: "Delivered",
  payout_id: null,
  order: { payment: { is: { payment_status: "Paid" } } },
});

export const fetchPayoutSummary = catchAsyncErrors(async (_req, res) => {
  const profiles = await prisma.sellerProfile.findMany({
    where: { status: "Approved" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { store_name: "asc" },
  });
  const summaries = await Promise.all(profiles.map(async (profile) => {
    const items = await prisma.orderItem.findMany({
      where: eligibleItemsWhere(profile.user_id),
      select: { seller_net_amount: true, refunded_seller_amount: true },
    });
    const sourceMinor = availableSellerMinor(items);
    const debts = await prisma.sellerDebt.findMany({
      where: { seller_id: profile.user_id, status: "Open" },
      select: { remaining_amount: true },
    });
    const debtMinor = debts.reduce(
      (total, debt) => total + decimalToMinorUnits(debt.remaining_amount), 0n,
    );
    const payableMinor = sourceMinor > debtMinor ? sourceMinor - debtMinor : 0n;
    const eligibleItemCount = items.filter((item) => sellerAvailableMinor(item) > 0n).length;
    const rate = await cdfExchangeRate();
    return {
      seller_id: profile.user_id,
      seller_name: profile.user.name,
      seller_email: profile.user.email,
      store_name: profile.store_name,
      payout_phone: profile.payout_phone,
      payout_provider: profile.payout_provider,
      eligible_amount: Number(payableMinor) / 100,
      gross_eligible_amount: Number(sourceMinor) / 100,
      seller_debt: Number(debtMinor) / 100,
      eligible_amounts: {
        USD: convertPayoutAmount(payableMinor, "USD"),
        CDF: rate ? convertPayoutAmount(payableMinor, "CDF", rate) : null,
      },
      cdf_exchange_rate: rate,
      eligible_items: eligibleItemCount,
    };
  }));
  res.status(200).json({ success: true, summaries });
});

export const fetchPayouts = catchAsyncErrors(async (req, res) => {
  const where = req.user.role === "Seller" ? { seller_id: req.user.id } : {};
  const payouts = await prisma.sellerPayout.findMany({
    where, select: publicPayoutSelect, orderBy: { created_at: "desc" }, take: 100,
  });
  res.status(200).json({ success: true, payouts });
});

export const createSellerPayout = catchAsyncErrors(async (req, res, next) => {
  const profile = await prisma.sellerProfile.findUnique({
    where: { user_id: req.params.sellerId },
    include: { user: { select: { role: true } } },
  });
  if (!profile || profile.user.role !== "Seller" || profile.status !== "Approved") {
    return next(new ErrorHandler("Approved seller not found.", 404));
  }
  const phone = normalizePhoneNumber(profile.payout_phone);
  const provider = profile.payout_provider;
  const currency = String(req.body?.currency || process.env.PAWAPAY_PAYOUT_CURRENCY || "USD").toUpperCase();
  if (!allowedCurrencies().has(currency)) {
    return next(new ErrorHandler("Payout currency must be USD or CDF.", 400));
  }
  const exchangeRate = currency === "CDF" ? await cdfExchangeRate() : 1;
  if (!exchangeRate) {
    return next(new ErrorHandler("PAWAPAY_CDF_PER_USD must be configured before a CDF payout.", 503));
  }
  if (!/^\d{10,15}$/.test(phone) || !allowedProviders().has(provider)) {
    return next(new ErrorHandler("The seller must configure a valid payout phone and provider.", 409));
  }

  const payout = await reserveSellerEarnings({
    payoutId: randomUUID(), sellerId: profile.user_id, currency, exchangeRate, provider, phone,
  });

  if (Number(payout.source_amount) === 0) {
    await transitionSellerPayout(payout.id, "Completed", { reason: "debt_only_settlement" });
    return res.status(201).json({
      success: true,
      message: "Seller earnings were applied to outstanding refund debt; no external payout was sent.",
      payout: { ...payout, status: "Completed" },
    });
  }

  const result = await initiatePayout({
    payoutId: payout.id,
    sellerId: payout.seller_id,
    amount: payout.amount,
    phone: payout.phone,
    provider: payout.provider,
    currency: payout.currency,
  });
  await prisma.sellerPayout.update({
    where: { id: payout.id }, data: { provider_payload: result.providerResponse || undefined },
  });
  if (!result.success && result.definitive) {
    await transitionSellerPayout(payout.id, "Failed", result.providerResponse);
    return next(new ErrorHandler("pawaPay rejected the seller payout.", 502));
  }
  const statusCode = result.success ? 201 : 202;
  res.status(statusCode).json({
    success: true,
    message: result.success ? "Seller payout accepted by pawaPay." : "Payout status is uncertain and will be reconciled.",
    payout: {
      id: payout.id,
      amount: payout.amount,
      currency,
      source_amount: payout.source_amount,
      source_currency: payout.source_currency,
      exchange_rate: payout.exchange_rate,
      provider,
      phone,
      status: "Pending",
    },
  });
});

export const checkPayoutStatus = catchAsyncErrors(async (req, res, next) => {
  const payout = await prisma.sellerPayout.findUnique({ where: { id: req.params.payoutId } });
  if (!payout) return next(new ErrorHandler("Payout not found.", 404));
  if (req.user.role !== "Admin" && payout.seller_id !== req.user.id) {
    return next(new ErrorHandler("Access denied.", 403));
  }
  let status = payout.status;
  if (status === "Pending") {
    try {
      const payload = await getPawaPayPayoutStatus(payout.id);
      await prisma.sellerPayout.updateMany({
        where: { id: payout.id, status: "Pending" },
        data: { last_checked_at: new Date(), check_attempts: { increment: 1 } },
      });
      const providerStatus = extractPawaPayStatus(payload);
      if (["COMPLETED", "FAILED"].includes(providerStatus) && !matchesStoredPayout(payout, payload)) {
        return next(new ErrorHandler("Payout provider data did not match the request.", 502));
      }
      if (providerStatus === "COMPLETED" || providerStatus === "FAILED") {
        status = providerStatus === "COMPLETED" ? "Completed" : "Failed";
        await transitionSellerPayout(payout.id, status, payload);
      }
    } catch (error) {
      console.error("pawaPay payout status check failed:", error.response?.data || error.message);
    }
  }
  res.status(200).json({ success: true, payoutStatus: status });
});

export const updatePayoutFee = catchAsyncErrors(async (req, res, next) => {
  const fee = String(req.body?.fee ?? "").trim();
  const currency = String(req.body?.currency || "USD").toUpperCase();
  const reason = String(req.body?.reason || "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(fee) || !["USD", "CDF"].includes(currency) || reason.length < 3) {
    return next(new ErrorHandler("Provide a valid fee and an audit reason.", 400));
  }
  const result = await recordPayoutFee(req.params.payoutId, fee, currency, {
    adminUserId: req.user.id,
    reason,
  });
  res.status(200).json({ success: true, changed: result.changed, payout: result.payout });
});

export { publicPayoutSelect };
