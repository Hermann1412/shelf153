import { useEffect, useState } from "react";
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Loader,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchMyOrders } from "../store/slices/orderSlice";

const statusConfig = {
  Processing: { icon: Clock, className: "bg-warning/10 text-warning" },
  Shipped: { icon: Truck, className: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  Delivered: { icon: CheckCircle, className: "bg-accent text-accent-foreground" },
  Cancelled: { icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

const Orders = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { myOrders, fetchingOrders } = useSelector((state) => state.order);
  const { authUser } = useSelector((state) => state.auth);
  const [filter, setFilter] = useState("All");
  const statusLabels = {
    All: t("orders.all"),
    Processing: t("orders.processing"),
    Shipped: t("orders.shipped"),
    Delivered: t("orders.delivered"),
    Cancelled: t("orders.cancelled"),
  };

  useEffect(() => {
    if (!authUser) {
      navigate("/");
      return;
    }
    dispatch(fetchMyOrders());
  }, [dispatch, authUser, navigate]);

  const filtered = filter === "All" ? myOrders : myOrders.filter((o) => o.order_status === filter);

  if (fetchingOrders) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page max-w-5xl">
      <h1 className="page-title">{t("orders.title")}</h1>

      {/* Filter tabs */}
      <div className="mt-5 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto scrollbar-hide">
        {["All", "Processing", "Shipped", "Delivered", "Cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            aria-pressed={filter === status}
            className={`h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
              filter === status
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="surface px-6 py-16 text-center">
          <span className="mx-auto w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            <Package className="w-6 h-6 text-muted-foreground" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-foreground">{t("orders.noOrdersFound")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "All"
              ? t("orders.noOrdersYet")
              : t("orders.noFilterOrders", { filter: statusLabels[filter].toLowerCase() })}
          </p>
          {filter === "All" && (
            <Link to="/products" className="btn-primary mt-6">
              {t("cart.browseProducts")}
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((order) => {
            const cfg = statusConfig[order.order_status] || statusConfig.Processing;
            const StatusIcon = cfg.icon;
            return (
              <li key={order.id} className="surface overflow-hidden">
                <div className="px-5 py-4 bg-secondary/50 border-b border-border flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                  <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("orders.orderNumber", { id: "" }).trim()}</p>
                      <p className="font-semibold text-foreground font-mono">{order.id?.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("orders.date")}</p>
                      <p className="font-medium text-foreground">
                        {new Date(order.created_at).toLocaleDateString(i18n.language, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("cart.total")}</p>
                      <p className="font-semibold text-foreground tabular-nums">${Number(order.total_price).toFixed(2)}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold ${cfg.className}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                    {statusLabels[order.order_status] || order.order_status}
                  </span>
                </div>

                {order.order_items && order.order_items.length > 0 && (
                  <ul className="divide-y divide-border">
                    {order.order_items.map((item) => {
                      const itemCfg = statusConfig[item.item_status] || statusConfig.Processing;
                      return (
                        <li key={item.id || item.product_id} className="px-5 py-4 flex items-center gap-4">
                          <img
                            src={item.image || "/avatar-holder.avif"}
                            alt=""
                            className="w-14 h-14 rounded-lg object-cover bg-secondary shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {t("orders.qty", { quantity: item.quantity, price: Number(item.price).toFixed(2) })}
                            </p>
                          </div>
                          <span className={`hidden sm:inline-flex h-6 px-2 items-center rounded-full text-xs font-medium ${itemCfg.className}`}>
                            {statusLabels[item.item_status] || statusLabels.Processing}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Orders;
