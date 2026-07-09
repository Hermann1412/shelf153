import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";

const TopSellingProducts = () => {
  const { t } = useTranslation();
  const { topSellingProducts } = useSelector((state) =>
    state.auth.user?.role === "Seller" ? state.seller : state.admin
  );

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <h3 className="font-semibold mb-4 text-gray-800">
        {t("stats.top5BestSellers")}
      </h3>
      {topSellingProducts.length === 0 ? (
        <p className="text-gray-400 text-center py-10">{t("stats.noDataYet")}</p>
      ) : (
        <div className="space-y-3">
          {topSellingProducts.map((product, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-sm font-bold text-gray-400 w-6">
                #{i + 1}
              </span>
              <img
                src={product.image || "/placeholder.png"}
                alt={product.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {product.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{product.category}</span>
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    {product.ratings}
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold text-green-600">
                {product.total_sold} {t("stats.sold")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopSellingProducts;
