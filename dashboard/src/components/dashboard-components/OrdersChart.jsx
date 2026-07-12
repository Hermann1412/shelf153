import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from "recharts";

const OrdersChart = () => {
  const { t } = useTranslation();
  const { orderStatusCounts } = useSelector((state) =>
    state.auth.user?.role === "Seller" ? state.seller : state.admin
  );

  const statusColors = {
    Processing: "#facc15", // yellow
    Shipped: "#128C7E", // WhatsApp teal
    Delivered: "#25D366", // WhatsApp green
    Cancelled: "#ef4444", // red
  };
  const orderStatusData = Object.keys(orderStatusCounts).map((status) => ({
    status,
    count: parseInt(orderStatusCounts[status]),
  }));

  return (
    <>
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h3 className="font-semibold mb-2">{t("stats.orderStatus")}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={orderStatusData}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {orderStatusData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={statusColors[entry.status] || "#ccc"} // fallback color
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default OrdersChart;
