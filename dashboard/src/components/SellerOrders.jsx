import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { LoaderCircle } from "lucide-react";
import {
  fetchSellerOrders,
  updateOrderItemStatus,
} from "../store/slices/sellerSlice";

const statusColors = {
  Processing: "bg-yellow-100 text-yellow-700",
  Shipped: "bg-green-100 text-green-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const SellerOrders = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { orderItems, loading } = useSelector((state) => state.seller);
  const [filter, setFilter] = useState("All");

  const statusLabels = {
    All: t("orders.all"),
    Processing: t("orders.processing"),
    Shipped: t("orders.shipped"),
    Delivered: t("orders.delivered"),
    Cancelled: t("orders.cancelled"),
  };

  useEffect(() => {
    dispatch(fetchSellerOrders());
  }, [dispatch]);

  const filtered =
    filter === "All"
      ? orderItems
      : orderItems.filter((i) => i.item_status === filter);

  const handleStatusChange = (itemId, status) => {
    dispatch(updateOrderItemStatus({ itemId, status }));
  };

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {["All", "Processing", "Shipped", "Delivered", "Cancelled"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === s
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 border"
              }`}
            >
              {statusLabels[s]}
            </button>
          )
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoaderCircle className="w-8 h-8 animate-spin text-green-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          {t("orders.noOrdersFound")}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">{t("orders.colItem")}</th>
                  <th className="px-6 py-3 font-medium">{t("orders.colOrderId")}</th>
                  <th className="px-6 py-3 font-medium">{t("orders.colQty")}</th>
                  <th className="px-6 py-3 font-medium">{t("products.colPrice")}</th>
                  <th className="px-6 py-3 font-medium">{t("orders.colShipTo")}</th>
                  <th className="px-6 py-3 font-medium">{t("orders.colStatus")}</th>
                  <th className="px-6 py-3 font-medium">{t("orders.colDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image || "/placeholder.png"}
                          alt={item.title}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <span className="font-medium text-gray-800 max-w-[160px] truncate">
                          {item.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {item.order_id?.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      ${Number(item.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {item.full_name
                        ? `${item.full_name}, ${item.city}, ${item.country}`
                        : t("orders.noShippingInfo")}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={item.item_status}
                        onChange={(e) =>
                          handleStatusChange(item.id, e.target.value)
                        }
                        className={`px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer ${
                          statusColors[item.item_status] || ""
                        }`}
                      >
                        <option value="Processing">{t("orders.processing")}</option>
                        <option value="Shipped">{t("orders.shipped")}</option>
                        <option value="Delivered">{t("orders.delivered")}</option>
                        <option value="Cancelled">{t("orders.cancelled")}</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(item.order_created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerOrders;
