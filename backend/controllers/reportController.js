import prisma from "../database/db.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { sendEmail } from "../utils/sendEmail.js";
import { buildMonthlyOverview, buildSellerReport, parsePeriod } from "../services/reportService.js";

const money = (value) => `$${Number(value).toFixed(2)}`;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const monthLabel = (period) => new Date(`${period}-01T00:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

const reportEmail = (report) => {
  const rows = report.top_products.map((p) => `<tr><td style="padding:6px 0">${escapeHtml(p.name)}</td><td align="right">${p.quantity}</td><td align="right">${money(p.gross)}</td></tr>`).join("");
  const t = report.totals;
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
    <h2 style="color:#1c7d44">Shelf153 · Rapport de ${escapeHtml(monthLabel(report.period))}</h2>
    <p>Bonjour ${escapeHtml(report.owner_name)},</p>
    <p>Voici le récapitulatif des ventes de <strong>${escapeHtml(report.store_name)}</strong>.</p>
    <table style="width:100%;border-collapse:collapse">
      <tr><td>Articles vendus</td><td align="right">${t.items}</td></tr>
      <tr><td>Commandes</td><td align="right">${t.orders}</td></tr>
      <tr><td>Ventes brutes</td><td align="right">${money(t.gross)}</td></tr>
      <tr><td>Commission Shelf153</td><td align="right">- ${money(t.commission)}</td></tr>
      <tr><td>Remboursements</td><td align="right">- ${money(t.refunds)}</td></tr>
      <tr><td style="padding-top:8px"><strong>Votre gain</strong></td><td align="right" style="padding-top:8px"><strong>${money(t.net)}</strong></td></tr>
    </table>
    ${rows ? `<h3 style="margin-top:24px">Produits les plus vendus</h3><table style="width:100%;border-collapse:collapse"><tr><th align="left">Produit</th><th align="right">Qté</th><th align="right">Ventes</th></tr>${rows}</table>` : ""}
    <p style="color:#666;font-size:13px;margin-top:24px">Ce rapport est aussi disponible dans votre espace vendeur.</p>
    <p style="color:#999;font-size:12px">Shelf153 est un produit Tinkli.</p>
  </div>`;
};

// Stores the snapshot (seller sees it in their space) and emails it when email is configured.
const sendReport = async (sellerId, period, adminId) => {
  const report = await buildSellerReport(sellerId, period);
  let emailed = false;
  if (process.env.SMTP_MAIL && !String(process.env.SMTP_MAIL).startsWith("PASTE_")) {
    try {
      await sendEmail({ email: report.email, subject: `Votre rapport de ventes · ${monthLabel(period)}`, message: reportEmail(report) });
      emailed = true;
    } catch (error) {
      console.error(`report email to ${report.email} failed:`, error.message);
    }
  }
  const saved = await prisma.sellerReport.upsert({
    where: { seller_id_period: { seller_id: sellerId, period } },
    update: { data: report, emailed, sent_at: new Date(), sent_by: adminId },
    create: { seller_id: sellerId, period, data: report, emailed, sent_by: adminId },
  });
  return { seller_id: sellerId, store_name: report.store_name, sent_at: saved.sent_at, emailed };
};

// Admin: ranking of every store for a month.
export const fetchMonthlyOverview = catchAsyncErrors(async (req, res) => {
  res.status(200).json({ success: true, ...(await buildMonthlyOverview(req.query.month)) });
});

// Admin: one store's detailed report (not saved).
export const fetchSellerReport = catchAsyncErrors(async (req, res) => {
  res.status(200).json({ success: true, report: await buildSellerReport(req.params.sellerId, req.query.month) });
});

export const sendSellerReport = catchAsyncErrors(async (req, res) => {
  const { period } = parsePeriod(req.body?.month);
  const result = await sendReport(req.params.sellerId, period, req.user.id);
  res.status(200).json({ success: true, message: `Report sent to ${result.store_name}.`, result });
});

// Admin: send the month's report to every store that sold something.
export const sendAllReports = catchAsyncErrors(async (req, res) => {
  const { period } = parsePeriod(req.body?.month);
  const overview = await buildMonthlyOverview(period);
  const results = [];
  for (const shop of overview.shops.filter((s) => s.items > 0)) {
    results.push(await sendReport(shop.seller_id, period, req.user.id));
  }
  res.status(200).json({ success: true, message: `${results.length} report(s) sent.`, results });
});

// Seller: reports the main admin has sent them, newest month first.
export const fetchMyReports = catchAsyncErrors(async (req, res) => {
  const reports = await prisma.sellerReport.findMany({
    where: { seller_id: req.user.id },
    orderBy: { period: "desc" },
    select: { id: true, period: true, data: true, sent_at: true },
  });
  res.status(200).json({ success: true, reports });
});
