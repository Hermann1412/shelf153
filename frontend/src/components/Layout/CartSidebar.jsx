import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toggleCart } from "../../store/slices/popupSlice";
import { removeFromCart, updateQuantity } from "../../store/slices/cartSlice";
import { orderTotals } from "../../data/products";

const CartSidebar = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isCartOpen } = useSelector((state) => state.popup);
  const { cart } = useSelector((state) => state.cart);
  const { subtotal } = orderTotals(cart);
  const close = () => dispatch(toggleCart());

  if (!isCartOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={close} />
      <aside className="fixed top-0 right-0 h-full w-[24rem] max-w-full bg-card border-l border-border z-50 flex flex-col animate-slide-in-right">
        <div className="h-16 px-5 flex items-center justify-between border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">
            {t("cart.sidebarTitle", { count: cart.length })}
          </h2>
          <button onClick={close} aria-label={t("aria.close")} className="icon-btn -mr-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <span className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-muted-foreground" />
            </span>
            <p className="mt-4 text-sm font-medium text-foreground">{t("cart.empty")}</p>
            <Link to="/products" onClick={close} className="btn-outline mt-5">
              {t("cart.browseProducts")}
            </Link>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-border">
            {cart.map((item) => {
              const stock = Number(item.product.stock);
              return (
                <li key={item.product.id} className="flex gap-3 px-5 py-4">
                  <img
                    src={item.product.images?.[0]?.url || "/avatar-holder.avif"}
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded-lg bg-secondary shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-foreground line-clamp-2">{item.product.name}</h3>
                      <button
                        onClick={() => dispatch(removeFromCart(item.product.id))}
                        aria-label={t("cart.remove", { defaultValue: "Retirer" })}
                        className="-mt-1 -mr-1 w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center h-8 border border-input rounded-lg">
                        <button
                          onClick={() =>
                            dispatch(updateQuantity({ productId: item.product.id, quantity: item.quantity - 1 }))
                          }
                          disabled={item.quantity <= 1}
                          aria-label="-1"
                          className="w-8 h-full flex items-center justify-center hover:bg-secondary rounded-l-lg disabled:opacity-40"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                        <button
                          onClick={() =>
                            dispatch(updateQuantity({ productId: item.product.id, quantity: item.quantity + 1 }))
                          }
                          disabled={Number.isFinite(stock) && item.quantity >= stock}
                          aria-label="+1"
                          className="w-8 h-full flex items-center justify-center hover:bg-secondary rounded-r-lg disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">
                        ${(Number(item.product.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {cart.length > 0 && (
          <div className="p-5 border-t border-border space-y-3 shrink-0">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("cart.subtotal")}</span>
              <span className="font-semibold tabular-nums">${subtotal.toFixed(2)}</span>
            </div>
            <Link to="/payment" onClick={close} className="btn-primary btn-lg w-full">
              {t("cart.proceedToCheckout")}
            </Link>
            <Link to="/cart" onClick={close} className="btn-outline w-full">
              {t("cart.viewCart")}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
};

export default CartSidebar;
