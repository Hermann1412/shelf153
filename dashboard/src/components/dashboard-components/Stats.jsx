import React from "react";
import { formatNumber } from "../../lib/helper";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

const Stats = () => {
  const { t } = useTranslation();
  const { todayRevenue, yesterdayRevenue, currentMonthSales } = useSelector(
    (state) => (state.auth.user?.role === "Seller" ? state.seller : state.admin)
  );

  const cards = [
    { label: t("stats.todayRevenue"), value: todayRevenue },
    { label: t("stats.yesterdayRevenue"), value: yesterdayRevenue },
    { label: t("stats.thisMonthSales"), value: currentMonthSales },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl shadow-sm p-5"
        >
          <p className="text-sm text-gray-500 mb-1">{card.label}</p>
          <p className="text-2xl font-bold text-gray-800">
            ${formatNumber(card.value)}
          </p>
        </div>
      ))}
    </div>
  );
};

export default Stats;
