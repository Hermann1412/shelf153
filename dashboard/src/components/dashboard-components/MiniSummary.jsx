import React from "react";
import {
  Wallet,
  PackageCheck,
  TrendingUp,
  AlertTriangle,
  BarChart4,
  UserPlus,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { formatNumber } from "../../lib/helper";

const MiniSummary = () => {
  const { t } = useTranslation();
  const isSeller = useSelector((state) => state.auth.user?.role === "Seller");
  const {
    totalRevenueAllTime,
    totalUsersCount,
    totalOrdersCount,
    orderStatusCounts,
    lowStockProducts,
    revenueGrowth,
    newUsersThisMonth,
    newOrdersThisMonth,
  } = useSelector((state) => (isSeller ? state.seller : state.admin));

  const totalOrders = Object.values(orderStatusCounts).reduce(
    (a, b) => a + b,
    0
  );

  const cards = [
    {
      label: t("stats.totalRevenue"),
      value: `$${formatNumber(totalRevenueAllTime)}`,
      icon: Wallet,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: t("stats.totalOrders"),
      value: formatNumber(isSeller ? totalOrdersCount : totalOrders),
      icon: PackageCheck,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    isSeller
      ? null
      : {
          label: t("stats.totalUsers"),
          value: formatNumber(totalUsersCount),
          icon: UserPlus,
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
    {
      label: t("stats.revenueGrowth"),
      value: revenueGrowth || "0%",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: isSeller ? t("stats.newOrdersMonth") : t("stats.newUsersMonth"),
      value: formatNumber(isSeller ? newOrdersThisMonth : newUsersThisMonth),
      icon: BarChart4,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: t("stats.lowStockItems"),
      value: Array.isArray(lowStockProducts)
        ? lowStockProducts.length
        : lowStockProducts,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ].filter(Boolean);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
          >
            <div className={`p-3 rounded-lg ${card.bg}`}>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-lg font-bold text-gray-800">{card.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MiniSummary;
