import { useSelector } from "react-redux";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

const TopProductsChart = () => {
  const { topSellingProducts } = useSelector((state) => state.admin);

  const data = topSellingProducts.map((p) => ({
    name: p.name?.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
    total_sold: parseInt(p.total_sold),
  }));

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <h3 className="font-semibold mb-4 text-gray-800">
        Top Selling Products
      </h3>
      {data.length === 0 ? (
        <p className="text-gray-400 text-center py-10">No data yet</p>
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
