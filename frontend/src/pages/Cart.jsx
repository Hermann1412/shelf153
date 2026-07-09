import { Plus, Minus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { removeFromCart, updateQuantity, clearCart } from "../store/slices/cartSlice";

const Cart = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { cart } = useSelector((state) => state.cart);

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center">
        <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("cart.empty")}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t("cart.emptyMessage")}
        </p>
        <Link
          to="/products"
          className="px-6 py-3 gradient-primary text-primary-foreground rounded-lg font-semibold hover:glow-on-hover animate-smooth"
        >
          {t("cart.browseProducts")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {t("cart.title", { count: cart.length })}
          </h1>
          <button
            onClick={() => dispatch(clearCart())}
            className="text-sm text-red-400 hover:text-red-300 animate-smooth"
          >
            {t("cart.clearCart")}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="glass-panel flex flex-col sm:flex-row items-start sm:items-center gap-4"
              >
                <Link to={`/product/${item.product.id}`} className="shrink-0">
                  <img
                    src={
                      item.product.images?.[0]?.url ||
                      "/avatar-holder.avif"
                    }
                    alt={item.product.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.product.id}`}
                    className="font-semibold text-foreground hover:text-primary animate-smooth truncate block"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {item.product.category}
                  </p>
                  <p className="text-primary font-bold mt-1">
                    ${Number(item.product.price).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-border rounded-lg">
                    <button
                      onClick={() =>
                        dispatch(
                          updateQuantity({
                            productId: item.product.id,
                            quantity: Math.max(1, item.quantity - 1),
                          })
                        )
                      }
                      className="p-2 hover:bg-secondary animate-smooth"
                    >
                      <Minus className="w-3 h-3 text-foreground" />
                    </button>
                    <span className="px-3 text-foreground text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        dispatch(
                          updateQuantity({
                            productId: item.product.id,
                            quantity: item.quantity + 1,
                          })
                        )
                      }
                      className="p-2 hover:bg-secondary animate-smooth"
                    >
                      <Plus className="w-3 h-3 text-foreground" />
                    </button>
                  </div>

                  <p className="font-bold text-foreground w-20 text-right">
                    ${(Number(item.product.price) * item.quantity).toFixed(2)}
                  </p>

                  <button
                    onClick={() =>
                      dispatch(removeFromCart(item.product.id))
                    }
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg animate-smooth"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="glass-panel h-fit sticky top-24">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {t("cart.orderSummary")}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("cart.subtotal")}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("cart.shipping")}</span>
                <span>
                  {shipping === 0 ? (
                    <span className="text-green-400">{t("cart.free")}</span>
                  ) : (
                    `$${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("cart.tax")}</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between text-foreground font-bold text-base">
                <span>{t("cart.total")}</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {subtotal < 100 && (
              <p className="text-xs text-muted-foreground mt-3">
                {t("cart.freeShippingRemaining", { amount: (100 - subtotal).toFixed(2) })}
              </p>
            )}

            <Link
              to="/payment"
              className="mt-6 w-full py-3 gradient-primary text-primary-foreground rounded-lg font-semibold flex items-center justify-center gap-2 hover:glow-on-hover animate-smooth"
            >
              {t("cart.proceedToCheckout")}
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/products"
              className="mt-3 w-full py-3 bg-secondary text-foreground rounded-lg font-medium flex items-center justify-center hover:bg-accent animate-smooth"
            >
              {t("cart.continueShopping")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
