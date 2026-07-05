import { X, Plus, Minus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toggleCart } from "../../store/slices/popupSlice";
import {
  removeFromCart,
  updateQuantity,
} from "../../store/slices/cartSlice";

const CartSidebar = () => {
  const dispatch = useDispatch();
  const { isCartOpen } = useSelector((state) => state.popup);
  const { cart } = useSelector((state) => state.cart);

  const subtotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  if (!isCartOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => dispatch(toggleCart())}
      />
      <div className="fixed top-0 right-0 h-full w-96 max-w-full bg-background border-l border-border z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Cart ({cart.length})
          </h2>
          <button
            onClick={() => dispatch(toggleCart())}
            className="p-2 hover:bg-secondary rounded-lg"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Your cart is empty
            </p>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex gap-3 p-3 bg-secondary rounded-lg"
              >
                <img
                  src={item.product.images?.[0]?.url || "/avatar-holder.avif"}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {item.product.name}
                  </h3>
                  <p className="text-sm text-primary font-semibold">
                    ${Number(item.product.price).toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() =>
                        item.quantity > 1 &&
                        dispatch(
                          updateQuantity({
                            productId: item.product.id,
                            quantity: item.quantity - 1,
                          })
                        )
                      }
                      className="p-1 hover:bg-background rounded"
                    >
                      <Minus className="w-3 h-3 text-foreground" />
                    </button>
                    <span className="text-sm text-foreground w-6 text-center">
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
                      className="p-1 hover:bg-background rounded"
                    >
                      <Plus className="w-3 h-3 text-foreground" />
                    </button>
                    <button
                      onClick={() =>
                        dispatch(removeFromCart(item.product.id))
                      }
                      className="ml-auto p-1 hover:bg-destructive/20 rounded text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex justify-between text-foreground font-semibold">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <Link
              to="/cart"
              onClick={() => dispatch(toggleCart())}
              className="block w-full text-center py-3 gradient-primary text-primary-foreground rounded-lg font-semibold hover:glow-on-hover animate-smooth"
            >
              View Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;
