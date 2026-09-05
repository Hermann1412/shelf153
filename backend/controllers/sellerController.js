import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import prisma from "../database/db.js";
import { v2 as cloudinary } from "cloudinary";
import { toPublicUser } from "../utils/publicUser.js";

const ITEM_STATUSES = ["Processing", "Shipped", "Delivered", "Cancelled"];
const sumRevenue = (items) => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

export const applyToBecomeSeller = catchAsyncErrors(async (req, res, next) => {
  const { store_name, store_description, payout_phone } = req.body;
  if (req.user.role !== "User") return next(new ErrorHandler("Only regular users can apply to become a seller.", 400));
  if (!store_name?.trim()) return next(new ErrorHandler("Please provide a store name.", 400));

  let storeLogo = null;
  if (req.files?.store_logo) {
    const result = await cloudinary.uploader.upload(req.files.store_logo.tempFilePath, {
      folder: "Ecommerce_Store_Logos", width: 300, crop: "scale",
    });
    storeLogo = { public_id: result.public_id, url: result.secure_url };
  }
  const { user, storeProfile } = await prisma.$transaction(async (tx) => {
    const storeProfile = await tx.sellerProfile.create({
      data: {
        user_id: req.user.id, store_name: store_name.trim(),
        store_description: store_description?.trim() || null,
        store_logo: storeLogo, payout_phone: payout_phone?.trim() || null,
      },
    });
    const user = await tx.user.update({ where: { id: req.user.id }, data: { role: "Seller" } });
    return { user, storeProfile };
  });
  res.status(201).json({ success: true, message: "Your store has been created.", user: toPublicUser(user), storeProfile });
});

export const getStoreProfile = catchAsyncErrors(async (req, res, next) => {
  const storeProfile = await prisma.sellerProfile.findUnique({ where: { user_id: req.user.id } });
  if (!storeProfile) return next(new ErrorHandler("Store profile not found.", 404));
  res.status(200).json({ success: true, storeProfile });
});

export const updateStoreProfile = catchAsyncErrors(async (req, res, next) => {
  const { store_name, store_description, payout_phone } = req.body;
  if (!store_name?.trim()) return next(new ErrorHandler("Please provide a store name.", 400));
  const existing = await prisma.sellerProfile.findUnique({ where: { user_id: req.user.id } });
  if (!existing) return next(new ErrorHandler("Store profile not found.", 404));
  let storeLogo = existing.store_logo;
  if (req.files?.store_logo) {
    const result = await cloudinary.uploader.upload(req.files.store_logo.tempFilePath, {
      folder: "Ecommerce_Store_Logos", width: 300, crop: "scale",
    });
    if (storeLogo?.public_id) await cloudinary.uploader.destroy(storeLogo.public_id);
    storeLogo = { public_id: result.public_id, url: result.secure_url };
  }
  const storeProfile = await prisma.sellerProfile.update({
    where: { user_id: req.user.id },
    data: {
      store_name: store_name.trim(), store_description: store_description?.trim() || null,
      store_logo: storeLogo, payout_phone: payout_phone?.trim() || null,
    },
  });
  res.status(200).json({ success: true, message: "Store profile updated.", storeProfile });
});

export const fetchSellerProducts = catchAsyncErrors(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const where = { created_by: req.user.id };
  const [totalProducts, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: { _count: { select: { reviews: true } } }, orderBy: { created_at: "desc" }, take: 10, skip: (page - 1) * 10 }),
  ]);
  const products = rows.map(({ _count, ...product }) => ({ ...product, review_count: _count.reviews }));
  res.status(200).json({ success: true, products, totalProducts });
});

export const fetchSellerOrders = catchAsyncErrors(async (req, res) => {
  const rows = await prisma.orderItem.findMany({
    where: { seller_id: req.user.id, order: { paid_at: { not: null } } },
    include: { order: { select: { created_at: true, paid_at: true, shipping_info: true } } },
    orderBy: { order: { created_at: "desc" } },
  });
  const orderItems = rows.map(({ order, ...item }) => ({
    ...item, order_created_at: order.created_at, paid_at: order.paid_at, ...(order.shipping_info || {}),
  }));
  res.status(200).json({ success: true, orderItems });
});

export const updateOrderItemStatus = catchAsyncErrors(async (req, res, next) => {
  if (!ITEM_STATUSES.includes(req.body.status)) return next(new ErrorHandler("Provide a valid status.", 400));
  const item = await prisma.orderItem.findUnique({ where: { id: req.params.itemId } });
  if (!item) return next(new ErrorHandler("Order item not found.", 404));
  if (item.seller_id !== req.user.id) return next(new ErrorHandler("You can only update your own order items.", 403));
  const orderItem = await prisma.orderItem.update({ where: { id: item.id }, data: { item_status: req.body.status } });
  res.status(200).json({ success: true, message: "Order item status updated.", orderItem });
});

export const sellerDashboardStats = catchAsyncErrors(async (req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const items = await prisma.orderItem.findMany({
    where: { seller_id: req.user.id, order: { paid_at: { not: null } } },
    include: { order: { select: { id: true, created_at: true } }, product: { select: { id: true, name: true, images: true, category: true, ratings: true } } },
  });
  const inRange = (item, start, end) => item.order.created_at >= start && item.order.created_at < end;
  const totalRevenueAllTime = sumRevenue(items);
  const todayRevenue = sumRevenue(items.filter((item) => inRange(item, today, tomorrow)));
  const yesterdayRevenue = sumRevenue(items.filter((item) => inRange(item, yesterday, today)));
  const currentMonthSales = sumRevenue(items.filter((item) => inRange(item, currentMonthStart, nextMonthStart)));
  const lastMonthRevenue = sumRevenue(items.filter((item) => inRange(item, previousMonthStart, currentMonthStart)));
  const revenueGrowth = lastMonthRevenue > 0 ? `${currentMonthSales >= lastMonthRevenue ? "+" : ""}${(((currentMonthSales - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(2)}%` : "0%";

  const orderStatusCounts = { Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 };
  const months = new Map(); const productTotals = new Map();
  for (const item of items) {
    orderStatusCounts[item.item_status] = (orderStatusCounts[item.item_status] || 0) + 1;
    const key = `${item.order.created_at.getFullYear()}-${String(item.order.created_at.getMonth() + 1).padStart(2, "0")}`;
    months.set(key, (months.get(key) || 0) + Number(item.price) * item.quantity);
    productTotals.set(item.product_id, (productTotals.get(item.product_id) || 0) + item.quantity);
  }
  const monthlySales = [...months].sort(([a], [b]) => a.localeCompare(b)).map(([key, totalsales]) => ({
    month: new Date(`${key}-01T00:00:00Z`).toLocaleString("en", { month: "short", year: "numeric", timeZone: "UTC" }), totalsales,
  }));
  const topSellingProducts = [...productTotals].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, total_sold]) => {
    const product = items.find((item) => item.product_id === id)?.product;
    return { name: product?.name, image: product?.images?.[0]?.url, category: product?.category, ratings: product?.ratings, total_sold };
  });
  const lowStockProducts = await prisma.product.findMany({ where: { created_by: req.user.id, stock: { lte: 5 } }, select: { name: true, stock: true } });
  const uniqueOrders = new Set(items.map((item) => item.order_id));
  const newOrders = new Set(items.filter((item) => item.order.created_at >= currentMonthStart).map((item) => item.order_id));

  res.status(200).json({
    success: true, message: "Seller dashboard stats fetched successfully", totalRevenueAllTime,
    todayRevenue, yesterdayRevenue, totalOrdersCount: uniqueOrders.size, orderStatusCounts,
    monthlySales, currentMonthSales, topSellingProducts, lowStockProducts, revenueGrowth,
    newOrdersThisMonth: newOrders.size,
  });
});
