import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuidv4 } from "uuid";

export const applyToBecomeSeller = catchAsyncErrors(async (req, res, next) => {
  const { store_name, store_description, payout_phone } = req.body;

  if (req.user.role !== "User") {
    return next(new ErrorHandler("Only regular users can apply to become a seller.", 400));
  }
  if (!store_name) {
    return next(new ErrorHandler("Please provide a store name.", 400));
  }

  let storeLogo = null;
  if (req.files && req.files.store_logo) {
    const result = await cloudinary.uploader.upload(req.files.store_logo.tempFilePath, {
      folder: "Ecommerce_Store_Logos",
      width: 300,
      crop: "scale",
    });
    storeLogo = { public_id: result.public_id, url: result.secure_url };
  }

  await database.query(
    "INSERT INTO seller_profiles (id, user_id, store_name, store_description, store_logo, payout_phone) VALUES (?, ?, ?, ?, ?, ?)",
    [uuidv4(), req.user.id, store_name, store_description || null, storeLogo ? JSON.stringify(storeLogo) : null, payout_phone || null]
  );
  await database.query("UPDATE users SET role = 'Seller' WHERE id = ?", [req.user.id]);

  const { rows: userRows } = await database.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
  const { rows: profileRows } = await database.query("SELECT * FROM seller_profiles WHERE user_id = ?", [req.user.id]);

  res.status(201).json({
    success: true,
    message: "Your store has been created.",
    user: userRows[0],
    storeProfile: profileRows[0],
  });
});

export const getStoreProfile = catchAsyncErrors(async (req, res, next) => {
  const { rows } = await database.query("SELECT * FROM seller_profiles WHERE user_id = ?", [req.user.id]);
  if (!rows[0]) return next(new ErrorHandler("Store profile not found.", 404));
  res.status(200).json({ success: true, storeProfile: rows[0] });
});

export const updateStoreProfile = catchAsyncErrors(async (req, res, next) => {
  const { store_name, store_description, payout_phone } = req.body;
  if (!store_name) {
    return next(new ErrorHandler("Please provide a store name.", 400));
  }

  const { rows } = await database.query("SELECT * FROM seller_profiles WHERE user_id = ?", [req.user.id]);
  if (!rows[0]) return next(new ErrorHandler("Store profile not found.", 404));

  let storeLogo = rows[0].store_logo;
  if (req.files && req.files.store_logo) {
    if (storeLogo?.public_id) {
      await cloudinary.uploader.destroy(storeLogo.public_id);
    }
    const result = await cloudinary.uploader.upload(req.files.store_logo.tempFilePath, {
      folder: "Ecommerce_Store_Logos",
      width: 300,
      crop: "scale",
    });
    storeLogo = { public_id: result.public_id, url: result.secure_url };
  }

  await database.query(
    "UPDATE seller_profiles SET store_name = ?, store_description = ?, store_logo = ?, payout_phone = ? WHERE user_id = ?",
    [store_name, store_description || null, JSON.stringify(storeLogo), payout_phone || null, req.user.id]
  );

  const { rows: updated } = await database.query("SELECT * FROM seller_profiles WHERE user_id = ?", [req.user.id]);
  res.status(200).json({ success: true, message: "Store profile updated.", storeProfile: updated[0] });
});

export const fetchSellerProducts = catchAsyncErrors(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const { rows: countRows } = await database.query(
    "SELECT COUNT(*) AS count FROM products WHERE created_by = ?",
    [req.user.id]
  );
  const totalProducts = parseInt(countRows[0].count) || 0;

  const { rows: products } = await database.query(
    `SELECT p.*, COUNT(r.id) AS review_count
     FROM products p
     LEFT JOIN reviews r ON p.id = r.product_id
     WHERE p.created_by = ?
     GROUP BY p.id
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user.id, limit, offset]
  );

  res.status(200).json({ success: true, products, totalProducts });
});

export const fetchSellerOrders = catchAsyncErrors(async (req, res) => {
  const { rows: items } = await database.query(
    `SELECT oi.*, o.created_at AS order_created_at, o.paid_at,
            si.full_name, si.address, si.city, si.state, si.country, si.pincode, si.phone
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN shipping_info si ON si.order_id = o.id
     WHERE oi.seller_id = ? AND o.paid_at IS NOT NULL
     ORDER BY o.created_at DESC`,
    [req.user.id]
  );

  res.status(200).json({ success: true, orderItems: items });
});

export const updateOrderItemStatus = catchAsyncErrors(async (req, res, next) => {
  const { itemId } = req.params;
  const { status } = req.body;
  if (!status) return next(new ErrorHandler("Provide a valid status.", 400));

  const { rows } = await database.query("SELECT * FROM order_items WHERE id = ?", [itemId]);
  if (rows.length === 0) return next(new ErrorHandler("Order item not found.", 404));
  if (rows[0].seller_id !== req.user.id) {
    return next(new ErrorHandler("You can only update your own order items.", 403));
  }

  await database.query("UPDATE order_items SET item_status = ? WHERE id = ?", [status, itemId]);
  const { rows: updated } = await database.query("SELECT * FROM order_items WHERE id = ?", [itemId]);

  res.status(200).json({ success: true, message: "Order item status updated.", orderItem: updated[0] });
});

export const sellerDashboardStats = catchAsyncErrors(async (req, res) => {
  const sellerId = req.user.id;
  const today = new Date();
  const todayDate = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().split("T")[0];

  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const revenueQuery = (whereExtra, params) => database.query(
    `SELECT SUM(oi.price * oi.quantity) AS sum
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.seller_id = ? AND o.paid_at IS NOT NULL ${whereExtra}`,
    [sellerId, ...params]
  );

  const { rows: revAll } = await revenueQuery("", []);
  const totalRevenueAllTime = parseFloat(revAll[0].sum) || 0;

  const { rows: todayRev } = await revenueQuery("AND DATE(o.created_at) = ?", [todayDate]);
  const todayRevenue = parseFloat(todayRev[0].sum) || 0;

  const { rows: yestRev } = await revenueQuery("AND DATE(o.created_at) = ?", [yesterdayDate]);
  const yesterdayRevenue = parseFloat(yestRev[0].sum) || 0;

  const { rows: curMonthRows } = await revenueQuery("AND o.created_at BETWEEN ? AND ?", [currentMonthStart, currentMonthEnd]);
  const currentMonthSales = parseFloat(curMonthRows[0].sum) || 0;

  const { rows: lastMonthRows } = await revenueQuery("AND o.created_at BETWEEN ? AND ?", [previousMonthStart, previousMonthEnd]);
  const lastMonthRevenue = parseFloat(lastMonthRows[0].sum) || 0;

  let revenueGrowth = "0%";
  if (lastMonthRevenue > 0) {
    const growthRate = ((currentMonthSales - lastMonthRevenue) / lastMonthRevenue) * 100;
    revenueGrowth = `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(2)}%`;
  }

  const { rows: statusRows } = await database.query(
    `SELECT oi.item_status AS order_status, COUNT(*) AS count
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.seller_id = ? AND o.paid_at IS NOT NULL
     GROUP BY oi.item_status`,
    [sellerId]
  );
  const orderStatusCounts = { Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 };
  statusRows.forEach((row) => {
    orderStatusCounts[row.order_status] = parseInt(row.count);
  });

  const { rows: monthlyRows } = await database.query(
    `SELECT DATE_FORMAT(o.created_at, '%b %Y') AS month,
            DATE_FORMAT(o.created_at, '%Y-%m-01') AS date,
            SUM(oi.price * oi.quantity) AS totalsales
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.seller_id = ? AND o.paid_at IS NOT NULL
     GROUP BY month, date
     ORDER BY date ASC`,
    [sellerId]
  );
  const monthlySales = monthlyRows.map((row) => ({
    month: row.month,
    totalsales: parseFloat(row.totalsales) || 0,
  }));

  const { rows: topSellingProducts } = await database.query(
    `SELECT p.name,
            JSON_UNQUOTE(JSON_EXTRACT(p.images, '$[0].url')) AS image,
            p.category,
            p.ratings,
            SUM(oi.quantity) AS total_sold
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.seller_id = ? AND o.paid_at IS NOT NULL
     GROUP BY p.id, p.name, p.images, p.category, p.ratings
     ORDER BY total_sold DESC
     LIMIT 5`,
    [sellerId]
  );

  const { rows: lowStockProducts } = await database.query(
    "SELECT name, stock FROM products WHERE created_by = ? AND stock <= 5",
    [sellerId]
  );

  const { rows: totalOrdersRows } = await database.query(
    `SELECT COUNT(DISTINCT oi.order_id) AS count
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.seller_id = ? AND o.paid_at IS NOT NULL`,
    [sellerId]
  );
  const totalOrdersCount = parseInt(totalOrdersRows[0].count) || 0;

  const { rows: newOrdersRows } = await database.query(
    `SELECT COUNT(DISTINCT oi.order_id) AS count
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.seller_id = ? AND o.paid_at IS NOT NULL AND o.created_at >= ?`,
    [sellerId, currentMonthStart]
  );
  const newOrdersThisMonth = parseInt(newOrdersRows[0].count) || 0;

  res.status(200).json({
    success: true,
    message: "Seller dashboard stats fetched successfully",
    totalRevenueAllTime,
    todayRevenue,
    yesterdayRevenue,
    totalOrdersCount,
    orderStatusCounts,
    monthlySales,
    currentMonthSales,
    topSellingProducts,
    lowStockProducts,
    revenueGrowth,
    newOrdersThisMonth,
  });
});
