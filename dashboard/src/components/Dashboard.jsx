import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import MiniSummary from "./dashboard-components/MiniSummary";
import TopSellingProducts from "./dashboard-components/TopSellingProducts";
import Stats from "./dashboard-components/Stats";
import MonthlySalesChart from "./dashboard-components/MonthlySalesChart";
import OrdersChart from "./dashboard-components/OrdersChart";
import TopProductsChart from "./dashboard-components/TopProductsChart";
import { fetchDashboardStats } from "../store/slices/adminSlice";
import { fetchSellerDashboardStats } from "../store/slices/sellerSlice";

const Dashboard = () => {
  const dispatch = useDispatch();
  const isSeller = useSelector((state) => state.auth.user?.role === "Seller");

  useEffect(() => {
    dispatch(isSeller ? fetchSellerDashboardStats() : fetchDashboardStats());
  }, [dispatch, isSeller]);

  return (
    <div className="space-y-6">
      <MiniSummary />
      <Stats />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlySalesChart />
        <OrdersChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsChart />
        <TopSellingProducts />
      </div>
    </div>
  );
};

export default Dashboard;
