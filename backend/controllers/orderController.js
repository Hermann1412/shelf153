import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import prisma from "../database/db.js";
import { initiatePayment } from "../utils/pawaPayPayment.js";
import { extractPawaPayStatus, getPawaPayDepositStatus, normalizePhoneNumber } from "../utils/pawaPay.js";
import { transitionPayment } from "../services/paymentService.js";
import { randomUUID } from "crypto";

const ORDER_STATUSES = ["Processing", "Shipped", "Delivered", "Cancelled"];
const orderInclude = { order_items: true, shipping_info: true, payment: true };
const canReadOrder = (order, user) => user.role === "Admin" || order.buyer_id === user.id;
const configuredProviders = () => new Set(
  (process.env.PAWAPAY_ALLOWED_PROVIDERS || "AIRTEL_COD,VODACOM_MPESA_COD,ORANGE_COD")
    .split(",").map((provider) => provider.trim()).filter(Boolean),
);

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

export const placeNewOrder = catchAsyncErrors(async (req, res, next) => {
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
  const currency = process.env.PAWAPAY_CURRENCY || "USD";
  if (!configuredProviders().has(provider)) return next(new ErrorHandler("Unsupported Mobile Money provider.", 400));
  if (!/^\d{10,15}$/.test(normalizePhoneNumber(phone))) {
    return next(new ErrorHandler("Phone number must use international format, for example 243XXXXXXXXX.", 400));
  }

  const products = await prisma.product.findMany({ where: { id: { in: items.map((item) => item.productId) } } });
  if (products.length !== items.length) return next(new ErrorHandler("One or more products no longer exist.", 404));
  const pricedItems = items.map((item) => ({
    product: products.find((product) => product.id === item.productId),
    quantity: item.quantity,
  }));
  const subtotal = pricedItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const tax_price = Math.round(subtotal * 0.18 * 100) / 100;
  const shipping_price = subtotal >= 50 ? 0 : 2;
  const total_price = Math.round((subtotal + tax_price + shipping_price) * 100) / 100;

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
          create: pricedItems.map(({ product, quantity }) => ({
            product_id: product.id,
            seller_id: product.created_by,
            quantity,
            price: product.price,
            image: product.images?.[0]?.url || "",
            title: product.name,
          })),
        },
        shipping_info: { create: { full_name, state, city, country, address, pincode, phone } },
        payment: { create: { transaction_id: orderId, provider, currency } },
      },
      include: { payment: true },
    });
  }, { isolationLevel: "Serializable" });

  const paymentResponse = await initiatePayment(order.id, total_price, phone, provider, currency);
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
      total_price,
    });
  }

  res.status(201).json({
    success: true,
    message: "Order placed. Please confirm the Mobile Money request sent by pawaPay.",
    orderId: order.id,
    transactionId: paymentResponse.transactionId,
    total_price,
  });
});

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
      const providerStatus = extractPawaPayStatus(providerPayload);
      if (providerStatus === "COMPLETED") status = "Paid";
      if (providerStatus === "FAILED") status = "Failed";
      if (status !== "Pending") await transitionPayment(payment.order_id, status, providerPayload);
    } catch (error) {
      console.error("pawaPay status check failed:", error.response?.data || error.message);
    }
  }
  res.status(200).json({ success: true, paymentStatus: status });
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
    where: { paid_at: { not: null } }, include: orderInclude, orderBy: { created_at: "desc" },
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
  const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
  if (!order) return next(new ErrorHandler("Invalid order ID.", 404));
  if (order.stock_reserved) await transitionPayment(order.id, "Failed", { reason: "admin_deletion" });
  await prisma.order.delete({ where: { id: order.id } });
  res.status(200).json({ success: true, message: "Order deleted.", order });
});
