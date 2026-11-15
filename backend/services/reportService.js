import prisma from "../database/db.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";

// Monthly sales per store, from paid orders. Amounts are in the accounting currency (USD).
// "net" is what the store earned (after Shelf153's commission and refunds); for Shelf153's own
// products there is no seller, so its line is reported separately as platform sales.

export const PLATFORM_ID = "platform";

const round = (value) => Math.round(value * 100) / 100;

export const parsePeriod = (value) => {
  const period = String(value || "");
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) throw new ErrorHandler("Provide a month as YYYY-MM.", 400);
  const start = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  const end = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1));
  return { period, start, end };
};

const emptyTotals = () => ({ items: 0, orders: 0, gross: 0, commission: 0, refunds: 0, net: 0 });

const summarize = (items, platform) => {
  const totals = emptyTotals();
  const orderIds = new Set();
  const products = new Map();
  for (const item of items) {
    const gross = Number(item.gross_amount);
    const refunded = Number(item.refunded_gross_amount || 0);
    const commission = Number(item.platform_commission) - Number(item.refunded_commission || 0);
    const net = platform ? commission : Number(item.seller_net_amount) - Number(item.refunded_seller_amount || 0);
    totals.items += item.quantity;
    totals.gross += gross;
    totals.refunds += refunded;
    totals.commission += commission;
    totals.net += net;
    orderIds.add(item.order_id);
    const product = products.get(item.product_id) || { name: item.title, quantity: 0, gross: 0 };
    product.quantity += item.quantity;
    product.gross += gross;
    products.set(item.product_id, product);
  }
  totals.orders = orderIds.size;
  for (const key of ["gross", "commission", "refunds", "net"]) totals[key] = round(totals[key]);
  const topProducts = [...products.values()]
    .sort((a, b) => b.quantity - a.quantity || b.gross - a.gross)
    .slice(0, 10)
    .map((product) => ({ ...product, gross: round(product.gross) }));
  return { totals, topProducts };
};

const paidItemsInPeriod = (start, end, where = {}) => prisma.orderItem.findMany({
  where: { ...where, order: { paid_at: { gte: start, lt: end } } },
  select: {
    order_id: true, product_id: true, seller_id: true, title: true, quantity: true,
    gross_amount: true, platform_commission: true, seller_net_amount: true,
    refunded_gross_amount: true, refunded_commission: true, refunded_seller_amount: true,
  },
});

// Ranking of every store (and Shelf153) for one month, best sales first.
export const buildMonthlyOverview = async (periodValue) => {
  const { period, start, end } = parsePeriod(periodValue);
  const [items, stores, reports] = await Promise.all([
    paidItemsInPeriod(start, end),
    prisma.sellerProfile.findMany({
      where: { status: { in: ["Approved", "Suspended"] } },
      select: { user_id: true, store_name: true, status: true, user: { select: { email: true } } },
    }),
    prisma.sellerReport.findMany({ where: { period }, select: { seller_id: true, sent_at: true, emailed: true } }),
  ]);
  const sentBySeller = new Map(reports.map((report) => [report.seller_id, report]));
  const bySeller = new Map();
  for (const item of items) {
    const key = item.seller_id || PLATFORM_ID;
    if (!bySeller.has(key)) bySeller.set(key, []);
    bySeller.get(key).push(item);
  }

  const shops = stores.map((store) => {
    const { totals, topProducts } = summarize(bySeller.get(store.user_id) || [], false);
    const report = sentBySeller.get(store.user_id);
    return {
      seller_id: store.user_id, store_name: store.store_name, email: store.user.email, status: store.status,
      ...totals, top_product: topProducts[0]?.name || null,
      report_sent_at: report?.sent_at || null, report_emailed: report?.emailed || false,
    };
  }).sort((a, b) => b.gross - a.gross || b.items - a.items || a.store_name.localeCompare(b.store_name));

  const platform = summarize(bySeller.get(PLATFORM_ID) || [], true).totals;
  const marketplace = shops.reduce((sum, shop) => {
    for (const key of Object.keys(sum)) sum[key] += shop[key];
    return sum;
  }, emptyTotals());
  for (const key of ["gross", "commission", "refunds", "net"]) marketplace[key] = round(marketplace[key]);

  return {
    period, shops, platform: { store_name: "Shelf153", ...platform },
    totals: {
      gross: round(marketplace.gross + platform.gross),
      commission: round(marketplace.commission + platform.commission),
      owed_to_sellers: marketplace.net,
      items: marketplace.items + platform.items,
      active_shops: shops.filter((shop) => shop.items > 0).length,
    },
  };
};

// One store's report for one month: totals plus its best-selling products.
export const buildSellerReport = async (sellerId, periodValue) => {
  const { period, start, end } = parsePeriod(periodValue);
  const store = await prisma.sellerProfile.findUnique({
    where: { user_id: sellerId },
    select: { user_id: true, store_name: true, user: { select: { email: true, name: true } } },
  });
  if (!store) throw new ErrorHandler("Store not found.", 404);
  const items = await paidItemsInPeriod(start, end, { seller_id: sellerId });
  const { totals, topProducts } = summarize(items, false);
  return {
    period, seller_id: store.user_id, store_name: store.store_name,
    owner_name: store.user.name, email: store.user.email,
    totals, top_products: topProducts, generated_at: new Date().toISOString(),
  };
};
