import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { LoaderCircle, WalletCards } from "lucide-react";
import {
  fetchPayouts,
  fetchPayoutSummary,
  initiateSellerPayout,
} from "../store/slices/payoutSlice";

const Payouts = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { payouts, summaries, loading, payingSellerId } = useSelector((state) => state.payout);
  const [currencies, setCurrencies] = useState({});

  useEffect(() => {
    dispatch(fetchPayouts());
    if (user?.role === "Admin") dispatch(fetchPayoutSummary());
  }, [dispatch, user?.role]);

  const paySeller = async (sellerId) => {
    const currency = currencies[sellerId] || "USD";
    const result = await dispatch(initiateSellerPayout({ sellerId, currency }));
    if (initiateSellerPayout.fulfilled.match(result)) {
      dispatch(fetchPayoutSummary());
      dispatch(fetchPayouts());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <WalletCards className="w-7 h-7 text-green-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t("payouts.title")}</h2>
          <p className="text-sm text-gray-500">{t("payouts.subtitle")}</p>
        </div>
      </div>

      {user?.role === "Admin" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summaries.map((summary) => (
            <div key={summary.seller_id} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
              <div>
                <p className="font-semibold text-gray-800">{summary.store_name}</p>
                <p className="text-xs text-gray-500">{summary.seller_name} · {summary.seller_email}</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {currencies[summary.seller_id] || "USD"} {Number(
                  summary.eligible_amounts?.[currencies[summary.seller_id] || "USD"] ?? 0,
                ).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {summary.eligible_items} {t("payouts.deliveredItems")} · {summary.payout_provider || t("payouts.notConfigured")}
              </p>
              <select
                value={currencies[summary.seller_id] || "USD"}
                onChange={(event) => setCurrencies((current) => ({
                  ...current, [summary.seller_id]: event.target.value,
                }))}
                aria-label={t("payouts.currency")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="USD">USD</option>
                <option value="CDF" disabled={!summary.cdf_exchange_rate}>CDF</option>
              </select>
              {!summary.cdf_exchange_rate && (
                <p className="text-xs text-amber-600">{t("payouts.cdfRateMissing")}</p>
              )}
              <button
                type="button"
                disabled={!summary.eligible_amount
                  || !summary.payout_phone
                  || !summary.payout_provider
                  || ((currencies[summary.seller_id] || "USD") === "CDF" && !summary.cdf_exchange_rate)
                  || payingSellerId === summary.seller_id}
                onClick={() => paySeller(summary.seller_id)}
                className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold disabled:opacity-40"
              >
                {payingSellerId === summary.seller_id ? t("payouts.processing") : t("payouts.pay")}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><LoaderCircle className="w-7 h-7 animate-spin text-green-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3">{t("payouts.seller")}</th>
                  <th className="px-4 py-3">{t("payouts.amount")}</th>
                  <th className="px-4 py-3">{t("payouts.provider")}</th>
                  <th className="px-4 py-3">{t("payouts.status")}</th>
                  <th className="px-4 py-3">{t("payouts.date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="px-4 py-3">{payout.seller?.seller_profile?.store_name || payout.seller?.name}</td>
                    <td className="px-4 py-3 font-semibold">{payout.currency} {Number(payout.amount).toFixed(2)}</td>
                    <td className="px-4 py-3">{payout.provider}</td>
                    <td className="px-4 py-3">{payout.status}</td>
                    <td className="px-4 py-3">{new Date(payout.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!payouts.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">{t("payouts.empty")}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payouts;
