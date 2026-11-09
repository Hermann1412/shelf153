import { Plus, Minus, Trash2, ArrowRight, ShoppingBag, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { removeFromCart, updateQuantity, clearCart } from "../store/slices/cartSlice";
import { categoryLabel, FREE_SHIPPING_THRESHOLD, orderTotals } from "../data/products";

const Cart = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { cart } = useSelector((state) => state.cart);
  const { subtotal, tax, shipping, total } = orderTotals(cart);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  if (cart.length === 0) {
    return (
      <div className="page">
        <div className="surface max-w-lg mx-auto px-6 py-14 text-center">
          <span className="mx-auto w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-muted-foreground" />
          </span>
          <h1 className="mt-5 text-xl font-bold text-foreground">{t("cart.empty")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("cart.emptyMessage")}</p>
          <Link to="/products" className="btn-primary btn-lg mt-6">
            {t("cart.browseProducts")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="flex items-end justify-between gap-4 mb-6">
        <h1 className="page-title">{t("cart.title", { count: cart.length })}</h1>
        <button
          onClick={() => dispatch(clearCart())}
          className="btn-ghost btn-sm text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t("cart.clearCart")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Items */}
        <ul className="lg:col-span-8 surface divide-y divide-border">
          {cart.map((item) => {
            const stock = Number(item.product.stock);
            const atMax = Number.isFinite(stock) && item.quantity >= stock;
            return (
              <li key={item.product.id} className="p-4 sm:p-5 flex gap-4">
                <Link to={`/product/${item.product.id}`} className="shrink-0">
                  <img
                    src={item.product.images?.[0]?.url || "/avatar-holder.avif"}
                    alt={item.product.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg bg-secondary"
                  />
                </Link>

                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/product/${item.product.id}`}
                        className="text-sm sm:text-base font-semibold text-foreground hover:text-primary transition-colors line-clamp-2"
                      >
                        {item.product.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {categoryLabel(item.product.category, t)} · ${Number(item.product.price).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-foreground tabular-nums shrink-0">
                      ${(Number(item.product.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-auto pt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center h-9 border border-input rounded-lg">
                      <button
                        onClick={() =>
                          dispatch(updateQuantity({ productId: item.product.id, quantity: Math.max(1, item.quantity - 1) }))
                        }
                        disabled={item.quantity <= 1}
                        aria-label="-1"
                        className="w-9 h-full flex items-center justify-center hover:bg-secondary rounded-l-lg disabled:opacity-40"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() =>
                          dispatch(updateQuantity({ productId: item.product.id, quantity: item.quantity + 1 }))
                        }
                        disabled={atMax}
                        aria-label="+1"
                        className="w-9 h-full flex items-center justify-center hover:bg-secondary rounded-r-lg disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => dispatch(removeFromCart(item.product.id))}
                      aria-label={t("cart.remove", { defaultValue: "Retirer" })}
                      className="icon-btn w-9 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Summary */}
        <aside className="lg:col-span-4 surface p-5 sm:p-6 lg:sticky lg:top-[8.5rem]">
          <h2 className="text-base font-semibold text-foreground">{t("cart.orderSummary")}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("cart.subtotal")}</dt>
              <dd className="font-medium tabular-nums">${subtotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("cart.shipping")}</dt>
              <dd className="font-medium tabular-nums">
                {shipping === 0 ? <span className="text-primary">{t("cart.free")}</span> : `$${shipping.toFixed(2)}`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("cart.tax")}</dt>
              <dd className="font-medium tabular-nums">${tax.toFixed(2)}</dd>
            </div>
            <div className="pt-3 border-t border-border flex justify-between items-baseline">
              <dt className="font-semibold">{t("cart.total")}</dt>
              <dd className="text-xl font-extrabold tabular-nums">${total.toFixed(2)}</dd>
            </div>
          </dl>

          {remaining > 0 && (
            <div className="mt-4 rounded-lg bg-accent text-accent-foreground p-3 text-xs flex gap-2">
              <Truck className="w-4 h-4 shrink-0" />
              <span>{t("cart.freeShippingRemaining", { amount: remaining.toFixed(2) })}</span>
            </div>
          )}

          <Link to="/payment" className="btn-primary btn-lg w-full mt-5">
            {t("cart.proceedToCheckout")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/products" className="btn-ghost w-full mt-2">
            {t("cart.continueShopping")}
          </Link>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
