import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  XAxis,
  YAxis,
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const MonthlySalesChart = () => {
  const { t } = useTranslation();
  const { monthlySales } = useSelector((state) =>
    state.auth.user?.role === "Seller" ? state.seller : state.admin
  );

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <h3 className="font-semibold mb-4 text-gray-800">{t("stats.monthlySales")}</h3>
      {monthlySales.length === 0 ? (
        <p className="text-gray-400 text-center py-10">{t("stats.noSalesData")}</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthlySales}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [`$${Number(value).toFixed(2)}`, t("stats.sales")]}
            />
            <Line
              type="monotone"
              dataKey="totalsales"
              stroke="#25D366"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default MonthlySalesChart;
