import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { LoaderCircle, Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import {
  fetchAllOrders,
  updateOrderStatus,
  deleteOrder,
} from "../store/slices/orderSlice";

const statusColors = {
  Processing: "bg-yellow-100 text-yellow-700",
  Shipped: "bg-green-100 text-green-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const Orders = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { orders, loading } = useSelector((state) => state.order);
  const [filter, setFilter] = useState("All");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const statusLabels = {
    All: t("orders.all"),
    Processing: t("orders.processing"),
    Shipped: t("orders.shipped"),
    Delivered: t("orders.delivered"),
    Cancelled: t("orders.cancelled"),
  };

  useEffect(() => {
    dispatch(fetchAllOrders());
  }, [dispatch]);

  const filtered =
    filter === "All"
      ? orders
      : orders.filter((o) => o.order_status === filter);

  const handleStatusChange = (orderId, status) => {
    dispatch(updateOrderStatus({ orderId, status }));
  };

  const handleDelete = (orderId) => {
    setPendingDeleteId(orderId);
  };

  const confirmDelete = () => {
    dispatch(deleteOrder(pendingDeleteId));
    setPendingDeleteId(null);
  };

  return (
    <div>
      {/* Filter Tabs */}
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
                  <th className="px-6 py-3 font-medium">{t("orders.colOrderId")}</th>
                  <th className="px-6 py-3 font-medium">{t("orders.colItems")}</th>
                  <th className="px-6 py-3 font-medium">{t("orders.colTotal")}</th>
                  <th className="px-6 py-3 font-medium">{t("orders.colStatus")}</th>
                  <th className="px-6 py-3 font-medium">{t("orders.colDate")}</th>
                  <th className="px-6 py-3 font-medium">{t("orders.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {order.id?.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {t("orders.itemsCount", { count: order.order_items?.length || 0 })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      ${Number(order.total_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.order_status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value)
                        }
                        className={`px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer ${
                          statusColors[order.order_status] || ""
                        }`}
                      >
                        <option value="Processing">{t("orders.processing")}</option>
                        <option value="Shipped">{t("orders.shipped")}</option>
                        <option value="Delivered">{t("orders.delivered")}</option>
                        <option value="Cancelled">{t("orders.cancelled")}</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDeleteId}
        title={t("common.delete")}
        message={t("orders.confirmDelete")}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
};

export default Orders;
