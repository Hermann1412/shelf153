import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, FileBarChart, LoaderCircle } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { ReportBody } from "./Reports";

// The monthly reports the main admin has sent to this shop, newest first.
const SellerReports = () => {
  const { t, i18n } = useTranslation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    axiosInstance
      .get("/seller/reports")
      .then(({ data }) => {
        setReports(data.reports || []);
        setOpenId(data.reports?.[0]?.id || null);
      })
      .catch((err) => setError(err.response?.data?.message || t("reports.loadFailed", "Impossible de charger le rapport.")))
      .finally(() => setLoading(false));
  }, [t]);

  const monthLabel = (period) =>
    new Date(`${period}-01T00:00:00`).toLocaleDateString(i18n.language, { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileBarChart className="w-7 h-7 text-green-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t("reports.myTitle", "Mes rapports mensuels")}</h2>
          <p className="text-sm text-gray-500">
            {t("reports.mySubtitle", "Chaque fin de mois, Shelf153 vous envoie le bilan de vos ventes et le montant qui vous revient.")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoaderCircle className="w-8 h-8 animate-spin text-green-600" /></div>
      ) : error ? (
        <p className="bg-white rounded-xl shadow-sm p-8 text-center text-sm text-red-600">{error}</p>
      ) : reports.length === 0 ? (
        <p className="bg-white rounded-xl shadow-sm p-8 text-center text-sm text-gray-500">
          {t("reports.noneYet", "Aucun rapport reçu pour l'instant. Votre premier bilan arrivera à la fin du mois.")}
        </p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const open = openId === report.id;
            return (
              <div key={report.id} className="bg-white rounded-xl shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : report.id)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <div>
                    <p className="font-semibold text-gray-800 capitalize">{monthLabel(report.period)}</p>
                    <p className="text-xs text-gray-500">
                      {t("reports.receivedOn", "Reçu le")} {new Date(report.sent_at).toLocaleDateString(i18n.language)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-green-600">
                      ${Number(report.data?.totals?.net || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {open && (
                  <div className="px-5 pb-5 border-t pt-4">
                    <ReportBody report={report.data || {}} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SellerReports;
