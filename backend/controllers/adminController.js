import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import { v2 as cloudinary } from "cloudinary";

export const getAllUsers = catchAsyncErrors(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * 10;

  const { rows: countRows } = await database.query(
    "SELECT COUNT(*) AS count FROM users WHERE role IN ('User', 'Seller')"
  );
  const totalUsers = parseInt(countRows[0].count) || 0;

  const { rows: users } = await database.query(
    `SELECT u.*, sp.store_name, sp.status AS seller_status
     FROM users u
     LEFT JOIN seller_profiles sp ON sp.user_id = u.id
     WHERE u.role IN ('User', 'Seller')
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [10, offset]
  );

  res.status(200).json({ success: true, totalUsers, currentPage: page, users });
});

export const updateSellerStatus = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["Approved", "Suspended"].includes(status)) {
    return next(new ErrorHandler("Provide a valid status.", 400));
  }

  const { rows } = await database.query("SELECT * FROM seller_profiles WHERE user_id = ?", [id]);
  if (rows.length === 0) return next(new ErrorHandler("Seller profile not found.", 404));

  await database.query("UPDATE seller_profiles SET status = ? WHERE user_id = ?", [status, id]);
  const { rows: updated } = await database.query("SELECT * FROM seller_profiles WHERE user_id = ?", [id]);

  res.status(200).json({ success: true, message: `Seller ${status.toLowerCase()}.`, storeProfile: updated[0] });
});

export const deleteUser = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const { rows } = await database.query("SELECT * FROM users WHERE id = ?", [id]);
  if (rows.length === 0) {
    return next(new ErrorHandler("User not found", 404));
  }
  const user = rows[0];

  await database.query("DELETE FROM users WHERE id = ?", [id]);

  if (user.avatar?.public_id) {
    await cloudinary.uploader.destroy(user.avatar.public_id);
  }

  res.status(200).json({ success: true, message: "User deleted successfully" });
});

export const dashboardStats = catchAsyncErrors(async (req, res) => {
  const today = new Date();
  const todayDate = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().split("T")[0];

  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const { rows: revAll } = await database.query(
    "SELECT SUM(total_price) AS sum FROM orders WHERE paid_at IS NOT NULL"
  );
  const totalRevenueAllTime = parseFloat(revAll[0].sum) || 0;

  const { rows: usersCount } = await database.query(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'User'"
  );
  const totalUsersCount = parseInt(usersCount[0].count) || 0;

  const { rows: statusRows } = await database.query(
    "SELECT order_status, COUNT(*) AS count FROM orders WHERE paid_at IS NOT NULL GROUP BY order_status"
  );
  const orderStatusCounts = { Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 };
  statusRows.forEach((row) => {
    orderStatusCounts[row.order_status] = parseInt(row.count);
  });

  const { rows: todayRev } = await database.query(
    "SELECT SUM(total_price) AS sum FROM orders WHERE DATE(created_at) = ? AND paid_at IS NOT NULL",
    [todayDate]
  );
  const todayRevenue = parseFloat(todayRev[0].sum) || 0;

  const { rows: yestRev } = await database.query(
    "SELECT SUM(total_price) AS sum FROM orders WHERE DATE(created_at) = ? AND paid_at IS NOT NULL",
    [yesterdayDate]
  );
  const yesterdayRevenue = parseFloat(yestRev[0].sum) || 0;

  const { rows: monthlyRows } = await database.query(
    `SELECT DATE_FORMAT(created_at, '%b %Y') AS month,
            DATE_FORMAT(created_at, '%Y-%m-01') AS date,
            SUM(total_price) AS totalsales
     FROM orders WHERE paid_at IS NOT NULL
     GROUP BY month, date
     ORDER BY date ASC`
  );
  const monthlySales = monthlyRows.map((row) => ({
    month: row.month,
    totalsales: parseFloat(row.totalsales) || 0,
  }));

  const { rows: topRows } = await database.query(
    `SELECT p.name,
            JSON_UNQUOTE(JSON_EXTRACT(p.images, '$[0].url')) AS image,
            p.category,
            p.ratings,
            SUM(oi.quantity) AS total_sold
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     JOIN orders o ON o.id = oi.order_id
     WHERE o.paid_at IS NOT NULL
     GROUP BY p.id, p.name, p.images, p.category, p.ratings
     ORDER BY total_sold DESC
     LIMIT 5`
  );
  const topSellingProducts = topRows;

  const { rows: curMonthRows } = await database.query(
    "SELECT SUM(total_price) AS total FROM orders WHERE paid_at IS NOT NULL AND created_at BETWEEN ? AND ?",
    [currentMonthStart, currentMonthEnd]
  );
  const currentMonthSales = parseFloat(curMonthRows[0].total) || 0;

  const { rows: lowStockRows } = await database.query(
    "SELECT name, stock FROM products WHERE stock <= 5"
  );
  const lowStockProducts = lowStockRows;

  const { rows: lastMonthRows } = await database.query(
    "SELECT SUM(total_price) AS total FROM orders WHERE paid_at IS NOT NULL AND created_at BETWEEN ? AND ?",
    [previousMonthStart, previousMonthEnd]
  );
  const lastMonthRevenue = parseFloat(lastMonthRows[0].total) || 0;

  let revenueGrowth = "0%";
  if (lastMonthRevenue > 0) {
    const growthRate = ((currentMonthSales - lastMonthRevenue) / lastMonthRevenue) * 100;
    revenueGrowth = `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(2)}%`;
  }

  const { rows: newUsersRows } = await database.query(
    "SELECT COUNT(*) AS count FROM users WHERE created_at >= ? AND role = 'User'",
    [currentMonthStart]
  );
  const newUsersThisMonth = parseInt(newUsersRows[0].count) || 0;

  res.status(200).json({
    success: true,
    message: "Dashboard Stats Fetched Successfully",
    totalRevenueAllTime,
    todayRevenue,
    yesterdayRevenue,
    totalUsersCount,
    orderStatusCounts,
    monthlySales,
    currentMonthSales,
    topSellingProducts,
    lowStockProducts,
    revenueGrowth,
    newUsersThisMonth,
  });
});
