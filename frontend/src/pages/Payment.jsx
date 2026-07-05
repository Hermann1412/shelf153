import { useState, useEffect } from "react";
import { ArrowLeft, Check, MapPin, CreditCard, Loader } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AirtelMoneyPayment from "../components/AirtelMoneyPayment";
import { placeOrder, setOrderStep } from "../store/slices/orderSlice";
import { toast } from "react-toastify";

const Payment = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cart } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { orderStep, placingOrder, orderId } = useSelector(
    (state) => state.order
  );

  const [shipping, setShipping] = useState({
    full_name: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    phone: "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
    if (cart.length === 0 && orderStep === 1) {
      navigate("/cart");
    }
  }, [isAuthenticated, cart, navigate, orderStep]);

  const handleShippingChange = (e) => {
    setShipping({ ...shipping, [e.target.name]: e.target.value });
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    const empty = Object.values(shipping).some((v) => !v.trim());
    if (empty) {
      toast.error("Please fill in all shipping fields");
      return;
    }

    dispatch(
      placeOrder({
        ...shipping,
        orderedItems: cart,
      })
    );
  };

  const steps = [
    { num: 1, label: "Shipping", icon: MapPin },
    { num: 2, label: "Processing", icon: Loader },
    { num: 3, label: "Payment", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Back Link */}
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary animate-smooth mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {steps.map((step, i) => {
            const StepIcon = step.icon;
            const isActive = orderStep === step.num;
            const isDone = orderStep > step.num;
            return (
              <div key={step.num} className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium animate-smooth ${
                    isDone
                      ? "bg-green-400/20 text-green-400"
                      : isActive
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <StepIcon
                      className={`w-4 h-4 ${
                        step.num === 2 && isActive ? "animate-spin" : ""
                      }`}
                    />
                  )}
                  {step.label}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 ${
                      isDone ? "bg-green-400" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1 - Shipping Form */}
        {orderStep === 1 && (
          <form onSubmit={handleShippingSubmit} className="glass-panel space-y-4">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Shipping Information
            </h2>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={shipping.full_name}
                onChange={handleShippingChange}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={shipping.address}
                onChange={handleShippingChange}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={shipping.city}
                  onChange={handleShippingChange}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={shipping.state}
                  onChange={handleShippingChange}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={shipping.country}
                  onChange={handleShippingChange}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={shipping.pincode}
                  onChange={handleShippingChange}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Phone
              </label>
              <input
                type="text"
                name="phone"
                value={shipping.phone}
                onChange={handleShippingChange}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {/* Order Summary */}
            <div className="border-t border-border pt-4 mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Order Summary ({cart.length} items)
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between text-sm text-muted-foreground"
                  >
                    <span>
                      {item.product.name} × {item.quantity}
                    </span>
                    <span>
                      ${(Number(item.product.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={placingOrder}
              className="w-full py-3 gradient-primary text-primary-foreground rounded-lg font-semibold hover:glow-on-hover animate-smooth disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {placingOrder ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Placing Order...
                </>
              ) : (
                "Place Order & Proceed to Payment"
              )}
            </button>
          </form>
        )}

        {/* Step 3 - Payment */}
        {orderStep === 3 && orderId && (
          <AirtelMoneyPayment phone={shipping.phone} />
        )}
      </div>
    </div>
  );
};

export default Payment;
