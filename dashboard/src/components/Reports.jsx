import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { CheckCircle2, Download, FileBarChart, LoaderCircle, Send, Trophy, X } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import ConfirmDialog from "./ConfirmDialog";

const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Month-end view for the main admin: who sold what, what Shelf153 earned, what each shop is owed,
// and a frozen report sent to each shop.
const Reports = () => {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(currentMonth());
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(null); // seller id, "all", or null
  const [confirmAll, setConfirmAll] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(`/admin/reports?month=${month}`);
      setOverview(data);
    } catch (error) {
      toast.error(error.response?.data?.message || t("reports.loadFailed", "Impossible de charger le rapport."));
    } finally {
      setLoading(false);
    }
  }, [month, t]);

  useEffect(() => {
    load();
  }, [load]);

  const sendOne = async (sellerId) => {
    setSending(sellerId);
    try {
      const { data } = await axiosInstance.post(`/admin/reports/${sellerId}/send`, { month });
      toast.success(data.result?.emailed
        ? t("reports.sentEmailed", "Rapport envoyé (espace vendeur + e-mail).")
        : t("reports.sent", "Rapport envoyé dans l'espace du vendeur."));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || t("reports.sendFailed", "Envoi impossible."));
    } finally {
      setSending(null);
    }
  };

  const sendAll = async () => {
    setConfirmAll(false);
    setSending("all");
    try {
      const { data } = await axiosInstance.post("/admin/reports/send-all", { month });
      toast.success(t("reports.sentAll", { count: data.results?.length || 0, defaultValue: "{{count}} rapport(s) envoyé(s)." }));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || t("reports.sendFailed", "Envoi impossible."));
    } finally {
      setSending(null);
    }
  };

  const openDetail = async (shop) => {
    setDetail({ loading: true, store_name: shop.store_name });
    try {
      const { data } = await axiosInstance.get(`/admin/reports/${shop.seller_id}?month=${month}`);
      setDetail(data.report);
    } catch (error) {
      setDetail(null);
      toast.error(error.response?.data?.message || t("reports.loadFailed", "Impossible de charger le rapport."));
    }
  };

  const exportCsv = () => {
    if (!overview) return;
    const header = ["Rank", "Store", "Email", "Items", "Orders", "Gross", "Commission", "Refunds", "Net owed", "Top product", "Report sent"];
    const rows = overview.shops.map((shop, index) => [
      index + 1, shop.store_name, shop.email, shop.items, shop.orders, shop.gross, shop.commission,
      shop.refunds, shop.net, shop.top_product || "", shop.report_sent_at || "",
    ]);
    if (overview.platform) {
      const p = overview.platform;
      rows.push(["-", "Shelf153", "", p.items, p.orders, p.gross, p.commission, p.refunds, "", "", ""]);
    }
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `shelf153-report-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const shops = overview?.shops || [];
  const topGross = Math.max(...shops.map((shop) => shop.gross), 0);
  const sellingShops = shops.filter((shop) => shop.items > 0).length;
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString(i18n.language, { month: "long", year: "numeric" });

  const cards = overview
    ? [
        { label: t("reports.totalSales", "Ventes totales"), value: money(overview.totals.gross) },
        { label: t("reports.commission", "Commission Shelf153"), value: money(overview.totals.commission), accent: true },
        { label: t("reports.owed", "À reverser aux boutiques"), value: money(overview.totals.owed_to_sellers) },
        { label: t("reports.activeShops", "Boutiques actives"), value: overview.totals.active_shops },
        { label: t("reports.platformSales", "Ventes Shelf153 (en propre)"), value: money(overview.platform?.gross) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileBarChart className="w-7 h-7 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t("reports.title", "Rapports mensuels")}</h2>
            <p className="text-sm text-gray-500">
              {t("reports.subtitle", "Classement des boutiques, gains et rapports à envoyer en fin de mois.")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={month}
            max={currentMonth()}
            onChange={(event) => event.target.value && setMonth(event.target.value)}
            aria-label={t("reports.month", "Mois")}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={exportCsv}
            disabled={!overview}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            type="button"
            onClick={() => setConfirmAll(true)}
            disabled={!sellingShops || sending !== null}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {sending === "all" ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {t("reports.sendAll", "Envoyer à toutes")}
          </button>
        </div>
      </div>

      {loading && !overview ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : overview && (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            {cards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={`mt-1 text-xl font-bold ${card.accent ? "text-green-600" : "text-gray-800"}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 capitalize">
                {t("reports.ranking", "Classement")} · {monthLabel}
              </h3>
              {loading && <LoaderCircle className="w-4 h-4 animate-spin text-gray-400" />}
            </div>
            {shops.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-500">{t("reports.noShops", "Aucune boutique pour le moment.")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">{t("reports.shop", "Boutique")}</th>
                      <th className="px-4 py-3 text-right">{t("reports.items", "Articles")}</th>
                      <th className="px-4 py-3 text-right">{t("reports.orders", "Commandes")}</th>
                      <th className="px-4 py-3 text-right">{t("reports.gross", "Ventes")}</th>
                      <th className="px-4 py-3 text-right">{t("reports.commissionShort", "Commission")}</th>
                      <th className="px-4 py-3 text-right">{t("reports.net", "Net dû")}</th>
                      <th className="px-4 py-3">{t("reports.report", "Rapport")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {shops.map((shop, index) => (
                      <tr key={shop.seller_id} className={shop.items ? "" : "text-gray-400"}>
                        <td className="px-4 py-3 font-semibold">
                          {index === 0 && shop.items > 0 ? <Trophy className="w-4 h-4 text-amber-500" /> : index + 1}
                        </td>
                        <td className="px-4 py-3 min-w-[12rem]">
                          <button
                            type="button"
                            onClick={() => openDetail(shop)}
                            className="font-medium text-gray-800 hover:text-green-600 text-left"
                          >
                            {shop.store_name}
                          </button>
                          {shop.top_product && (
                            <p className="text-xs text-gray-500 truncate max-w-[16rem]">
                              {t("reports.bestSeller", "Meilleure vente")} : {shop.top_product}
                            </p>
                          )}
                          <div className="mt-1 h-1.5 w-full max-w-[12rem] bg-gray-100 rounded-full">
                            <div
                              className="h-1.5 bg-green-500 rounded-full"
                              style={{ width: `${topGross ? (shop.gross / topGross) * 100 : 0}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{shop.items}</td>
                        <td className="px-4 py-3 text-right">{shop.orders}</td>
                        <td className="px-4 py-3 text-right font-medium">{money(shop.gross)}</td>
                        <td className="px-4 py-3 text-right text-green-600">{money(shop.commission)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{money(shop.net)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {shop.report_sent_at && (
                            <span className="inline-flex items-center gap-1 mr-2 text-xs text-green-700" title={new Date(shop.report_sent_at).toLocaleString()}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {t("reports.sentOn", "Envoyé")}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => sendOne(shop.seller_id)}
                            disabled={!shop.items || sending !== null}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-green-600 text-green-700 rounded-lg text-xs font-medium hover:bg-green-50 disabled:opacity-40"
                          >
                            {sending === shop.seller_id ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            {shop.report_sent_at ? t("reports.resend", "Renvoyer") : t("reports.send", "Envoyer")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-xl shadow-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{detail.store_name}</h3>
                <p className="text-sm text-gray-500 capitalize">{monthLabel}{detail.email ? ` · ${detail.email}` : ""}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} aria-label={t("aria.close")} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {detail.loading ? (
              <div className="flex justify-center py-8"><LoaderCircle className="w-6 h-6 animate-spin text-green-600" /></div>
            ) : (
              <ReportBody report={detail} />
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAll}
        danger={false}
        title={t("reports.confirmTitle", "Envoyer les rapports ?")}
        message={t("reports.confirmMessage", {
          count: sellingShops,
          month: monthLabel,
          defaultValue: "Le rapport de {{month}} sera envoyé aux {{count}} boutique(s) ayant vendu ce mois-ci.",
        })}
        onConfirm={sendAll}
        onCancel={() => setConfirmAll(false)}
      />
    </div>
  );
};

// Shared by the admin detail view and the seller's own reports.
export const ReportBody = ({ report }) => {
  const { t } = useTranslation();
  const totals = report.totals || {};
  const rows = [
    [t("reports.items", "Articles"), totals.items],
    [t("reports.orders", "Commandes"), totals.orders],
    [t("reports.gross", "Ventes"), money(totals.gross)],
    [t("reports.commissionShort", "Commission"), `− ${money(totals.commission)}`],
    ...(Number(totals.refunds) ? [[t("reports.refunds", "Remboursements"), `− ${money(totals.refunds)}`]] : []),
  ];
  return (
    <div className="space-y-4">
      <dl className="divide-y text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between py-2">
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-800">{value}</dd>
          </div>
        ))}
        <div className="flex justify-between py-2">
          <dt className="font-semibold text-gray-800">{t("reports.net", "Net dû")}</dt>
          <dd className="text-lg font-bold text-green-600">{money(totals.net)}</dd>
        </div>
      </dl>
      {report.top_products?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">{t("reports.topProducts", "Produits les plus vendus")}</h4>
          <ul className="text-sm divide-y">
            {report.top_products.map((product) => (
              <li key={product.name} className="flex justify-between gap-4 py-1.5">
                <span className="truncate text-gray-700">{product.name}</span>
                <span className="shrink-0 text-gray-500">{product.quantity} · {money(product.gross)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Reports;
