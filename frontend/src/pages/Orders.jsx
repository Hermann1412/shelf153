import React, { useEffect, useState } from "react";
import {
  Filter,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Loader,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchMyOrders } from "../store/slices/orderSlice";

const statusConfig = {
  Processing: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  Shipped: { icon: Truck, color: "text-blue-400", bg: "bg-blue-400/10" },
  Delivered: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10" },
  Cancelled: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
};

const Orders = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { myOrders, fetchingOrders } = useSelector((state) => state.order);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    dispatch(fetchMyOrders());
  }, [dispatch, isAuthenticated, navigate]);

  const filtered =
    filter === "All"
      ? myOrders
      : myOrders.filter((o) => o.order_status === filter);

  if (fetchingOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-foreground mb-8">My Orders</h1>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {["All", "Processing", "Shipped", "Delivered", "Cancelled"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap animate-smooth ${
                  filter === status
                    ? "gradient-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No orders found
            </h2>
            <p className="text-muted-foreground">
              {filter === "All"
                ? "You haven't placed any orders yet."
                : `No ${filter.toLowerCase()} orders.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const cfg = statusConfig[order.order_status] || statusConfig.Processing;
              const StatusIcon = cfg.icon;
              return (
                <div key={order.id} className="glass-panel">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Order #{order.id?.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${cfg.color} ${cfg.bg}`}
                      >
                        <StatusIcon className="w-4 h-4" />
                        {order.order_status}
                      </span>
                      <p className="text-lg font-bold text-foreground">
                        ${Number(order.total_price).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border flex gap-3 overflow-x-auto">
                      {order.order_items.map((item, i) => {
                        const itemCfg =
                          statusConfig[item.item_status] || statusConfig.Processing;
                        const ItemStatusIcon = itemCfg.icon;
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 shrink-0"
                          >
                            <img
                              src={item.image || "/avatar-holder.avif"}
                              alt={item.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div>
                              <p className="text-sm text-foreground font-medium">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity} × ${Number(item.price).toFixed(2)}
                              </p>
                              <span
                                className={`inline-flex items-center gap-1 mt-1 text-xs ${itemCfg.color}`}
                              >
                                <ItemStatusIcon className="w-3 h-3" />
                                {item.item_status || "Processing"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
