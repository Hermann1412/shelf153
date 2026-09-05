import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import prisma from "../database/db.js";
import { v2 as cloudinary } from "cloudinary";
import { PUBLIC_USER_SELECT } from "../utils/publicUser.js";

const sum = (values) => values.reduce((total, value) => total + Number(value || 0), 0);
const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const getAllUsers = catchAsyncErrors(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const where = { role: { in: ["User", "Seller"] } };
  const [totalUsers, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { ...PUBLIC_USER_SELECT, seller_profile: { select: { store_name: true, status: true } } },
      orderBy: { created_at: "desc" }, take: 10, skip: (page - 1) * 10,
    }),
  ]);
  const users = rows.map(({ seller_profile, ...user }) => ({
    ...user, store_name: seller_profile?.store_name || null, seller_status: seller_profile?.status || null,
  }));
  res.status(200).json({ success: true, totalUsers, currentPage: page, users });
});

export const updateSellerStatus = catchAsyncErrors(async (req, res, next) => {
  if (!["Approved", "Suspended"].includes(req.body.status)) return next(new ErrorHandler("Provide a valid status.", 400));
  const existing = await prisma.sellerProfile.findUnique({ where: { user_id: req.params.id }, select: { id: true } });
  if (!existing) return next(new ErrorHandler("Seller profile not found.", 404));
  const storeProfile = await prisma.sellerProfile.update({ where: { user_id: req.params.id }, data: { status: req.body.status } });
  res.status(200).json({ success: true, message: `Seller ${req.body.status.toLowerCase()}.`, storeProfile });
});

export const deleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, avatar: true } });
  if (!user) return next(new ErrorHandler("User not found", 404));
  await prisma.user.delete({ where: { id: user.id } });
  if (user.avatar?.public_id) await cloudinary.uploader.destroy(user.avatar.public_id);
  res.status(200).json({ success: true, message: "User deleted successfully" });
});

export const dashboardStats = catchAsyncErrors(async (_req, res) => {
  const now = new Date();
  const today = dayStart(now);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const paidOrders = await prisma.order.findMany({
    where: { paid_at: { not: null } }, select: { total_price: true, created_at: true, order_status: true },
  });
  const totalUsersCount = await prisma.user.count({ where: { role: "User" } });
  const totalRevenueAllTime = sum(paidOrders.map((order) => order.total_price));
  const inRange = (order, start, end) => order.created_at >= start && order.created_at < end;
  const todayRevenue = sum(paidOrders.filter((order) => inRange(order, today, tomorrow)).map((order) => order.total_price));
  const yesterdayRevenue = sum(paidOrders.filter((order) => inRange(order, yesterday, today)).map((order) => order.total_price));
  const currentMonthSales = sum(paidOrders.filter((order) => inRange(order, currentMonthStart, nextMonthStart)).map((order) => order.total_price));
  const lastMonthRevenue = sum(paidOrders.filter((order) => inRange(order, previousMonthStart, currentMonthStart)).map((order) => order.total_price));

  const orderStatusCounts = { Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 };
  for (const order of paidOrders) orderStatusCounts[order.order_status] = (orderStatusCounts[order.order_status] || 0) + 1;
  const monthlyMap = new Map();
  for (const order of paidOrders) {
    const key = `${order.created_at.getFullYear()}-${String(order.created_at.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(order.total_price));
  }
  const monthlySales = [...monthlyMap].sort(([a], [b]) => a.localeCompare(b)).map(([key, totalsales]) => ({
    month: new Date(`${key}-01T00:00:00Z`).toLocaleString("en", { month: "short", year: "numeric", timeZone: "UTC" }), totalsales,
  }));

  const grouped = await prisma.orderItem.groupBy({
    by: ["product_id"], where: { order: { paid_at: { not: null } } }, _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } }, take: 5,
  });
  const productRows = await prisma.product.findMany({ where: { id: { in: grouped.map((row) => row.product_id) } } });
  const topSellingProducts = grouped.map((row) => {
    const product = productRows.find((item) => item.id === row.product_id);
    return { name: product?.name, image: product?.images?.[0]?.url, category: product?.category, ratings: product?.ratings, total_sold: row._sum.quantity || 0 };
  });
  const lowStockProducts = await prisma.product.findMany({ where: { stock: { lte: 5 } }, select: { name: true, stock: true } });
  const newUsersThisMonth = await prisma.user.count({ where: { role: "User", created_at: { gte: currentMonthStart } } });
  const revenueGrowth = lastMonthRevenue > 0 ? `${currentMonthSales >= lastMonthRevenue ? "+" : ""}${(((currentMonthSales - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(2)}%` : "0%";

  res.status(200).json({
    success: true, message: "Dashboard Stats Fetched Successfully", totalRevenueAllTime, todayRevenue,
    yesterdayRevenue, totalUsersCount, orderStatusCounts, monthlySales, currentMonthSales,
    topSellingProducts, lowStockProducts, revenueGrowth, newUsersThisMonth,
  });
});
