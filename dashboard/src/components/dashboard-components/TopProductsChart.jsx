import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = ["#25D366", "#128C7E", "#f59e0b", "#ef4444", "#8b5cf6"];

const TopProductsChart = () => {
  const { t } = useTranslation();
  const { topSellingProducts } = useSelector((state) =>
    state.auth.user?.role === "Seller" ? state.seller : state.admin
  );

  const data = topSellingProducts.map((p) => ({
    name: p.name?.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
    total_sold: parseInt(p.total_sold),
  }));

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <h3 className="font-semibold mb-4 text-gray-800">
        {t("stats.topSellingProducts")}
      </h3>
      {data.length === 0 ? (
        <p className="text-gray-400 text-center py-10">{t("stats.noDataYet")}</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="total_sold" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default TopProductsChart;
