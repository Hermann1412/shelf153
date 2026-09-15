import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import prisma from "../database/db.js";
import { initiatePayment } from "../utils/pawaPayPayment.js";
import {
  extractPawaPayStatus,
  getPawaPayDepositStatus,
  matchesStoredPayment,
  normalizePhoneNumber,
} from "../utils/pawaPay.js";
import { recordPaymentFee, transitionPayment } from "../services/paymentService.js";
import { randomUUID } from "crypto";
import { calculateOrderFinancials } from "../services/financialService.js";
import { getExchangeRate } from "../services/exchangeRateService.js";

const ORDER_STATUSES = ["Processing", "Shipped", "Delivered", "Cancelled"];
const publicPaymentSelect = {
  payment_type: true,
  payment_status: true,
  provider: true,
  amount: true,
  currency: true,
  source_currency: true,
  exchange_rate: true,
  processed_at: true,
  created_at: true,
};
const accountingPaymentSelect = {
  ...publicPaymentSelect,
  accounting_currency: true,
  commission_rate: true,
  gross_sales_amount: true,
  gross_commission: true,
  payment_fee: true,
  payment_fee_refunded: true,
  platform_net_revenue: true,
  seller_net_amount: true,
  refunded_gross_amount: true,
  refunded_commission: true,
  refunded_seller_amount: true,
  accounting_status: true,
};
const publicOrderItemSelect = {
  id: true,
  order_id: true,
  product_id: true,
  seller_id: true,
  quantity: true,
  price: true,
  item_status: true,
  image: true,
  title: true,
};
const orderInclude = {
  order_items: { select: publicOrderItemSelect },
  shipping_info: true,
  payment: { select: publicPaymentSelect },
};
const adminOrderInclude = {
  order_items: true,
  shipping_info: true,
  payment: { select: accountingPaymentSelect },
};
const canReadOrder = (order, user) => user.role === "Admin" || order.buyer_id === user.id;
const configuredProviders = () => new Set(
  (process.env.PAWAPAY_ALLOWED_PROVIDERS || "AIRTEL_COD,VODACOM_MPESA_COD,ORANGE_COD")
    .split(",").map((provider) => provider.trim()).filter(Boolean),
);
const configuredCurrencies = () => new Set(
  (process.env.PAWAPAY_ALLOWED_CURRENCIES || "USD,CDF")
    .split(",").map((currency) => currency.trim().toUpperCase()).filter(Boolean),
);
const cdfExchangeRate = async () => {
  const configured = await getExchangeRate("USD", "CDF");
  return configured ? Number(configured.rate) : null;
};

export const fetchPaymentConfig = async (_req, res) => {
  const configured = await getExchangeRate("USD", "CDF");
  return res.status(200).json({
    success: true,
    currencies: [...configuredCurrencies()],
    cdf_exchange_rate: configured ? Number(configured.rate) : null,
    cdf_exchange_rate_source: configured?.source || null,
  });
};

const parseItems = (orderedItems) => {
  const raw = Array.isArray(orderedItems) ? orderedItems : JSON.parse(orderedItems || "[]");
  const quantities = new Map();
  for (const item of raw) {
    const productId = item?.product?.id;
    const quantity = Number(item?.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      throw new ErrorHandler("Every item must have a product and a positive integer quantity.", 400);
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
};

export const createPlaceNewOrderHandler = ({ startPayment = initiatePayment } = {}) => async (req, res, next) => {
  const { full_name, state, city, country, address, pincode, phone } = req.body;
  if (![full_name, state, city, country, address, pincode, phone].every((value) => typeof value === "string" && value.trim())) {
    return next(new ErrorHandler("Please provide complete shipping details.", 400));
  }

  let items;
  try {
    items = parseItems(req.body.orderedItems);
  } catch (error) {
    return next(error instanceof ErrorHandler ? error : new ErrorHandler("Invalid cart payload.", 400));
  }
  if (items.length === 0) return next(new ErrorHandler("No items in cart.", 400));
  const provider = req.body.provider || process.env.PAWAPAY_DEFAULT_PROVIDER || "AIRTEL_COD";
  const currency = String(req.body.currency || process.env.PAWAPAY_CURRENCY || "USD").toUpperCase();
  if (!configuredProviders().has(provider)) return next(new ErrorHandler("Unsupported Mobile Money provider.", 400));
  if (!configuredCurrencies().has(currency)) return next(new ErrorHandler("Payment currency must be USD or CDF.", 400));
  const exchangeRate = currency === "CDF" ? await cdfExchangeRate() : 1;
  if (!exchangeRate) {
    return next(new ErrorHandler("CDF payments are temporarily unavailable because the exchange rate is not configured.", 503));
  }
  if (!/^\d{10,15}$/.test(normalizePhoneNumber(phone))) {
    return next(new ErrorHandler("Phone number must use international format, for example 243XXXXXXXXX.", 400));
  }

  const products = await prisma.product.findMany({ where: { id: { in: items.map((item) => item.productId) } } });
  if (products.length !== items.length) return next(new ErrorHandler("One or more products no longer exist.", 404));
  const pricedItems = items.map((item) => ({
    product: products.find((product) => product.id === item.productId),
    quantity: item.quantity,
  }));
  let financials;
  try {
    financials = calculateOrderFinancials(pricedItems);
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
  const subtotal = Number(financials.grossSalesAmount);
  const tax_price = Math.round(subtotal * 0.18 * 100) / 100;
  const shipping_price = subtotal >= 50 ? 0 : 2;
  const total_price = Math.round((subtotal + tax_price + shipping_price) * 100) / 100;
  const paymentAmount = currency === "CDF" ? Math.round(total_price * exchangeRate) : total_price;

  const orderId = randomUUID();
  const order = await prisma.$transaction(async (tx) => {
    for (const item of pricedItems) {
      const reserved = await tx.product.updateMany({
        where: { id: item.product.id, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (reserved.count !== 1) throw new ErrorHandler(`Only limited stock is available for ${item.product.name}.`, 409);
    }

    return tx.order.create({
      data: {
        id: orderId,
        buyer_id: req.user.id,
        total_price,
        tax_price,
        shipping_price,
        order_items: {
          create: pricedItems.map(({ product, quantity }, index) => ({
            product_id: product.id,
            seller_id: product.created_by,
            quantity,
            price: product.price,
            image: product.images?.[0]?.url || "",
            title: product.name,
            gross_amount: financials.lines[index].grossAmount,
            commission_rate: financials.lines[index].commissionRate,
            platform_commission: financials.lines[index].commissionAmount,
            seller_net_amount: financials.lines[index].sellerAmount,
          })),
        },
        shipping_info: { create: { full_name, state, city, country, address, pincode, phone } },
        payment: {
          create: {
            transaction_id: orderId,
            provider,
            amount: paymentAmount,
            currency,
            source_currency: "USD",
            exchange_rate: exchangeRate,
            accounting_currency: "USD",
            commission_rate: financials.commissionRate,
            gross_sales_amount: financials.grossSalesAmount,
            gross_commission: financials.grossCommission,
            platform_net_revenue: financials.grossCommission,
            seller_net_amount: financials.sellerNetAmount,
          },
        },
      },
      include: { payment: true },
    });
  }, { isolationLevel: "Serializable" });

  const paymentResponse = await startPayment(order.id, paymentAmount, phone, provider, currency);
  if (!paymentResponse.success) {
    if (paymentResponse.definitive) {
      await transitionPayment(order.id, "Failed", paymentResponse.providerResponse || { reason: "initiation_rejected" });
      return next(new ErrorHandler("Payment was rejected. Reserved stock was released.", 502));
    }
    return res.status(202).json({
      success: true,
      message: "Payment confirmation is delayed. Status verification will continue.",
      orderId: order.id,
      transactionId: order.id,
      total_price: paymentAmount,
      currency,
      source_total_price: total_price,
      exchange_rate: exchangeRate,
    });
  }

  res.status(201).json({
    success: true,
    message: "Order placed. Please confirm the Mobile Money request sent by pawaPay.",
    orderId: order.id,
    transactionId: paymentResponse.transactionId,
    total_price: paymentAmount,
    currency,
    source_total_price: total_price,
    exchange_rate: exchangeRate,
  });
};

export const placeNewOrder = catchAsyncErrors(createPlaceNewOrderHandler());

export const checkPaymentStatus = catchAsyncErrors(async (req, res, next) => {
  const payment = await prisma.payment.findUnique({
    where: { order_id: req.params.orderId },
    include: { order: { select: { buyer_id: true } } },
  });
  if (!payment) return next(new ErrorHandler("Payment not found.", 404));
  if (req.user.role !== "Admin" && payment.order.buyer_id !== req.user.id) return next(new ErrorHandler("Access denied.", 403));

  let status = payment.payment_status;
  if (status === "Pending") {
    try {
      const providerPayload = await getPawaPayDepositStatus(payment.transaction_id);
      await prisma.payment.updateMany({
        where: { id: payment.id, payment_status: "Pending" },
        data: { last_checked_at: new Date(), check_attempts: { increment: 1 } },
      });
      const providerStatus = extractPawaPayStatus(providerPayload);
      if (["COMPLETED", "FAILED"].includes(providerStatus) && !matchesStoredPayment(payment, providerPayload)) {
        return next(new ErrorHandler("Payment provider data did not match this order.", 502));
      }
      if (providerStatus === "COMPLETED") status = "Paid";
      if (providerStatus === "FAILED") status = "Failed";
      if (status !== "Pending") await transitionPayment(payment.order_id, status, providerPayload);
    } catch (error) {
      console.error("pawaPay status check failed:", error.response?.data || error.message);
    }
  }
  res.status(200).json({ success: true, paymentStatus: status });
});

export const updatePaymentFee = catchAsyncErrors(async (req, res, next) => {
  const fee = String(req.body?.fee ?? "").trim();
  const currency = String(req.body?.currency || "USD").toUpperCase();
  const reason = String(req.body?.reason || "Payment fee reconciliation").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(fee) || !["USD", "CDF"].includes(currency) || reason.length < 3) {
    return next(new ErrorHandler("Provide a valid non-negative payment fee, currency and audit reason.", 400));
  }
  const result = await recordPaymentFee(req.params.orderId, fee, currency, {
    adminUserId: req.user.id,
    reason,
  });
  res.status(200).json({
    success: true,
    changed: result.changed,
    payment: {
      payment_fee: result.payment.payment_fee,
      accounting_currency: result.payment.accounting_currency,
      platform_net_revenue: result.payment.platform_net_revenue,
    },
  });
});

export const fetchSingleOrder = catchAsyncErrors(async (req, res, next) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.orderId }, include: orderInclude });
  if (!order) return next(new ErrorHandler("Order not found.", 404));
  if (!canReadOrder(order, req.user)) return next(new ErrorHandler("Access denied.", 403));
  res.status(200).json({ success: true, message: "Order fetched.", orders: order });
});

export const fetchMyOrders = catchAsyncErrors(async (req, res) => {
  const myOrders = await prisma.order.findMany({
    where: { buyer_id: req.user.id, paid_at: { not: null } }, include: orderInclude, orderBy: { created_at: "desc" },
  });
  res.status(200).json({ success: true, message: "All your orders are fetched.", myOrders });
});

export const fetchAllOrders = catchAsyncErrors(async (_req, res) => {
  const orders = await prisma.order.findMany({
    where: { paid_at: { not: null } }, include: adminOrderInclude, orderBy: { created_at: "desc" },
  });
  res.status(200).json({ success: true, message: "All orders fetched.", orders });
});

export const updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
  if (!ORDER_STATUSES.includes(req.body.status)) return next(new ErrorHandler("Provide a valid status for order.", 400));
  const existing = await prisma.order.findUnique({ where: { id: req.params.orderId }, select: { id: true } });
  if (!existing) return next(new ErrorHandler("Invalid order ID.", 404));
  const updatedOrder = await prisma.order.update({ where: { id: existing.id }, data: { order_status: req.body.status } });
  res.status(200).json({ success: true, message: "Order status updated.", updatedOrder });
});

export const deleteOrder = catchAsyncErrors(async (req, res, next) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.orderId },
    include: { payment: true, order_items: { include: { refunds: { select: { id: true } } } } },
  });
  if (!order) return next(new ErrorHandler("Invalid order ID.", 404));
  if (order.payment?.payment_status === "Paid"
      || order.order_items.some((item) => item.payout_id || item.refunds.length > 0)) {
    return next(new ErrorHandler("A financially posted order cannot be deleted; cancel or refund it instead.", 409));
  }
  if (order.stock_reserved) await transitionPayment(order.id, "Failed", { reason: "admin_deletion" });
  await prisma.order.delete({ where: { id: order.id } });
  res.status(200).json({ success: true, message: "Order deleted.", order });
});
