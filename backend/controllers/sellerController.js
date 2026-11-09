import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import prisma from "../database/db.js";
import { v2 as cloudinary } from "cloudinary";
import { toPublicUser } from "../utils/publicUser.js";
import { normalizePhoneNumber } from "../utils/pawaPay.js";
import { assertImageFile } from "../utils/imageUpload.js";

const ITEM_STATUSES = ["Processing", "Shipped", "Delivered", "Cancelled"];
const payoutProviders = () => new Set(
  (process.env.PAWAPAY_PAYOUT_ALLOWED_PROVIDERS
    || process.env.PAWAPAY_ALLOWED_PROVIDERS
    || "AIRTEL_COD,VODACOM_MPESA_COD,ORANGE_COD")
    .split(",").map((value) => value.trim()).filter(Boolean),
);

const parsePayoutDestination = (phoneValue, providerValue) => {
  const phone = normalizePhoneNumber(phoneValue);
  const provider = String(providerValue || "").trim();
  if (!phone && !provider) return { payout_phone: null, payout_provider: null };
  if (!/^\d{10,15}$/.test(phone) || !payoutProviders().has(provider)) {
    throw new ErrorHandler("Provide a valid international payout phone and Mobile Money provider.", 400);
  }
  return { payout_phone: phone, payout_provider: provider };
};

// ---- Store scope ----
// Which store a seller-space request works on. A seller is always pinned to their own store,
// whatever they send. The main admin picks one with ?store=<sellerId>, or ?store=platform for
// Shelf153's own products (created by admins, sold without a seller).
const resolveStore = async (req) => {
  if (req.user.role !== "Admin") return { sellerId: req.user.id };
  const store = String(req.query.store || "");
  if (store === PLATFORM_STORE) return { platform: true };
  if (!/^[0-9a-f-]{36}$/i.test(store)) throw new ErrorHandler("Choose a store to view.", 400);
  const profile = await prisma.sellerProfile.findUnique({ where: { user_id: store }, select: { user_id: true } });
  if (!profile) throw new ErrorHandler("Store not found.", 404);
  return { sellerId: store };
};
const productScope = (scope) => (scope.platform ? { creator: { role: { not: "Seller" } } } : { created_by: scope.sellerId });
const itemScope = (scope) => (scope.platform ? { seller_id: null } : { seller_id: scope.sellerId });
// Shelf153 keeps its whole sale as commission; a seller earns its net share.
const itemRevenue = (scope) => (scope.platform
  ? (item) => Number(item.platform_commission) - Number(item.refunded_commission || 0)
  : (item) => Number(item.seller_net_amount) - Number(item.refunded_seller_amount || 0));

export const PLATFORM_STORE = "platform";
const PLATFORM_PROFILE = { store_name: "Shelf153", status: "Approved", platform: true, slug: null, store_logo: null };

// ---- Store links ----
// Each store gets a short, stable address for its own login page: /boutique/<slug>.
const slugify = (value) => String(value)
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  .slice(0, 60) || "boutique";
const RESERVED_SLUGS = new Set(["shelf153", "admin", "login", "platform"]);

const uniqueSlug = async (storeName, userId) => {
  const base = slugify(storeName);
  for (let n = 1; ; n += 1) {
    // Same numbering as the backfill in migration 20261105000000_seller_store_slug.
    const candidate = n === 1 && !RESERVED_SLUGS.has(base) ? base : `${base}-${n}`;
    const taken = await prisma.sellerProfile.findUnique({ where: { slug: candidate }, select: { user_id: true } });
    if (!taken || taken.user_id === userId) return candidate;
  }
};

// Public branding for a store's login page: name and logo only, approved stores only.
export const fetchPublicStore = catchAsyncErrors(async (req, res, next) => {
  const store = await prisma.sellerProfile.findUnique({
    where: { slug: String(req.params.slug || "").toLowerCase() },
    select: { user_id: true, store_name: true, store_logo: true, slug: true, status: true },
  });
  if (!store || store.status !== "Approved") return next(new ErrorHandler("Store not found.", 404));
  res.status(200).json({ success: true, store: { id: store.user_id, store_name: store.store_name, store_logo: store.store_logo, slug: store.slug } });
});

// Admin store switcher: Shelf153 first, then every seller store that has been approved at least once.
export const fetchStoresForAdmin = catchAsyncErrors(async (_req, res) => {
  const rows = await prisma.sellerProfile.findMany({
    where: { status: { in: ["Approved", "Suspended"] } },
    select: { user_id: true, store_name: true, store_logo: true, slug: true, status: true },
    orderBy: { store_name: "asc" },
  });
  res.status(200).json({
    success: true,
    stores: [
      { id: PLATFORM_STORE, ...PLATFORM_PROFILE },
      ...rows.map(({ user_id, ...store }) => ({ id: user_id, ...store })),
    ],
  });
});

export const fetchAllShops = catchAsyncErrors(async (req, res) => {
  const rows = await prisma.sellerProfile.findMany({
    where: { status: "Approved" },
    select: { user_id: true, store_name: true, store_logo: true },
    orderBy: { store_name: "asc" },
  });
  const shops = rows.map(({ user_id, ...rest }) => ({ id: user_id, ...rest }));
  res.status(200).json({ success: true, shops });
});

export const applyToBecomeSeller = catchAsyncErrors(async (req, res, next) => {
  const { store_name, store_description, payout_phone, payout_provider } = req.body;
  if (req.user.role !== "User") return next(new ErrorHandler("Only regular users can apply to become a seller.", 400));
  if (!store_name?.trim()) return next(new ErrorHandler("Please provide a store name.", 400));
  let payoutDestination;
  try { payoutDestination = parsePayoutDestination(payout_phone, payout_provider); } catch (error) { return next(error); }

  // An application waits for an admin: the account stays a regular "User" (so it gets no seller
  // access) until updateSellerStatus approves it. A refused application can be corrected and resent.
  const existing = await prisma.sellerProfile.findUnique({ where: { user_id: req.user.id } });
  if (existing?.status === "Pending") return next(new ErrorHandler("Your store application is already awaiting review.", 409));
  if (existing && existing.status !== "Rejected") return next(new ErrorHandler("You already have a store.", 409));

  let storeLogo = existing?.store_logo || null;
  if (req.files?.store_logo) {
    try { await assertImageFile(req.files.store_logo); } catch (error) { return next(error); }
    const result = await cloudinary.uploader.upload(req.files.store_logo.tempFilePath, {
      folder: "Ecommerce_Store_Logos", width: 300, crop: "scale",
    });
    storeLogo = { public_id: result.public_id, url: result.secure_url };
  }
  const data = {
    store_name: store_name.trim(),
    store_description: store_description?.trim() || null,
    store_logo: storeLogo, ...payoutDestination,
    status: "Pending",
  };
  // The link is fixed at the first application so it never changes under the seller's customers.
  const slug = existing?.slug || await uniqueSlug(data.store_name, req.user.id);
  const storeProfile = existing
    ? await prisma.sellerProfile.update({ where: { user_id: req.user.id }, data: { ...data, slug } })
    : await prisma.sellerProfile.create({ data: { user_id: req.user.id, ...data, slug } });
  res.status(201).json({
    success: true,
    message: "Your store application has been sent. An administrator will review it.",
    user: toPublicUser(req.user),
    storeProfile,
  });
});

export const getStoreProfile = catchAsyncErrors(async (req, res, next) => {
  const scope = await resolveStore(req);
  if (scope.platform) return res.status(200).json({ success: true, storeProfile: PLATFORM_PROFILE });
  const storeProfile = await prisma.sellerProfile.findUnique({ where: { user_id: scope.sellerId } });
  if (!storeProfile) return next(new ErrorHandler("Store profile not found.", 404));
  res.status(200).json({ success: true, storeProfile });
});

export const updateStoreProfile = catchAsyncErrors(async (req, res, next) => {
  const { store_name, store_description, payout_phone, payout_provider } = req.body;
  if (!store_name?.trim()) return next(new ErrorHandler("Please provide a store name.", 400));
  let payoutDestination;
  try { payoutDestination = parsePayoutDestination(payout_phone, payout_provider); } catch (error) { return next(error); }
  const existing = await prisma.sellerProfile.findUnique({ where: { user_id: req.user.id } });
  if (!existing) return next(new ErrorHandler("Store profile not found.", 404));
  let storeLogo = existing.store_logo;
  if (req.files?.store_logo) {
    try { await assertImageFile(req.files.store_logo); } catch (error) { return next(error); }
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
      store_logo: storeLogo, ...payoutDestination,
    },
  });
  res.status(200).json({ success: true, message: "Store profile updated.", storeProfile });
});

export const fetchSellerProducts = catchAsyncErrors(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const where = productScope(await resolveStore(req));
  const [totalProducts, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: { _count: { select: { reviews: true } } }, orderBy: { created_at: "desc" }, take: 10, skip: (page - 1) * 10 }),
  ]);
  const products = rows.map(({ _count, ...product }) => ({ ...product, review_count: _count.reviews }));
  res.status(200).json({ success: true, products, totalProducts });
});

export const fetchSellerOrders = catchAsyncErrors(async (req, res) => {
  const scope = await resolveStore(req);
  const rows = await prisma.orderItem.findMany({
    where: { ...itemScope(scope), order: { paid_at: { not: null } } },
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
  // The main admin may update any store's items; a seller only their own.
  if (req.user.role !== "Admin" && item.seller_id !== req.user.id) {
    return next(new ErrorHandler("You can only update your own order items.", 403));
  }
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

  const scope = await resolveStore(req);
  const items = await prisma.orderItem.findMany({
    where: { ...itemScope(scope), order: { paid_at: { not: null } } },
    include: { order: { select: { id: true, created_at: true } }, product: { select: { id: true, name: true, images: true, category: true, ratings: true } } },
  });
  const revenueOf = itemRevenue(scope);
  const sumRevenue = (list) => list.reduce((sum, item) => sum + revenueOf(item), 0);
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
  const lowStockProducts = await prisma.product.findMany({ where: { ...productScope(scope), stock: { lte: 5 } }, select: { name: true, stock: true } });
  const uniqueOrders = new Set(items.map((item) => item.order_id));
  const newOrders = new Set(items.filter((item) => item.order.created_at >= currentMonthStart).map((item) => item.order_id));

  res.status(200).json({
    success: true, message: "Seller dashboard stats fetched successfully", totalRevenueAllTime,
    todayRevenue, yesterdayRevenue, totalOrdersCount: uniqueOrders.size, orderStatusCounts,
    monthlySales, currentMonthSales, topSellingProducts, lowStockProducts, revenueGrowth,
    newOrdersThisMonth: newOrders.size,
  });
});
