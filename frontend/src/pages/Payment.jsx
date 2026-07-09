import { useState, useEffect } from "react";
import { ArrowLeft, Check, MapPin, CreditCard, Loader } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import AirtelMoneyPayment from "../components/AirtelMoneyPayment";
import { placeOrder, setOrderStep } from "../store/slices/orderSlice";
import { toast } from "react-toastify";

const Payment = () => {
  const { t } = useTranslation();
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
  const [errors, setErrors] = useState({});

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
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: undefined });
    }
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    Object.entries(shipping).forEach(([key, value]) => {
      if (!value.trim()) nextErrors[key] = t("validation.required");
    });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error(t("checkout.fillAllFields"));
      return;
    }

    dispatch(
      placeOrder({
        ...shipping,
        orderedItems: cart,
      })
    );
  };

  const fieldClass = (name) =>
    `w-full px-4 py-2 bg-secondary border rounded-lg text-foreground focus:outline-none focus:ring-2 ${
      errors[name] ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
    }`;

  const steps = [
    { num: 1, label: t("checkout.stepShipping"), icon: MapPin },
    { num: 2, label: t("checkout.stepProcessing"), icon: Loader },
    { num: 3, label: t("checkout.stepPayment"), icon: CreditCard },
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
          {t("checkout.backToCart")}
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">{t("checkout.title")}</h1>

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
              {t("checkout.shippingInfo")}
            </h2>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                {t("checkout.fullName")}
              </label>
              <input
                type="text"
                name="full_name"
                value={shipping.full_name}
                onChange={handleShippingChange}
                className={fieldClass("full_name")}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive mt-1">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                {t("checkout.address")}
              </label>
              <input
                type="text"
                name="address"
                value={shipping.address}
                onChange={handleShippingChange}
                className={fieldClass("address")}
              />
              {errors.address && (
                <p className="text-xs text-destructive mt-1">{errors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  {t("checkout.city")}
                </label>
                <input
                  type="text"
                  name="city"
                  value={shipping.city}
                  onChange={handleShippingChange}
                  className={fieldClass("city")}
                />
                {errors.city && (
                  <p className="text-xs text-destructive mt-1">{errors.city}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  {t("checkout.state")}
                </label>
                <input
                  type="text"
                  name="state"
                  value={shipping.state}
                  onChange={handleShippingChange}
                  className={fieldClass("state")}
                />
                {errors.state && (
                  <p className="text-xs text-destructive mt-1">{errors.state}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  {t("checkout.country")}
                </label>
                <input
                  type="text"
                  name="country"
                  value={shipping.country}
                  onChange={handleShippingChange}
                  className={fieldClass("country")}
                />
                {errors.country && (
                  <p className="text-xs text-destructive mt-1">{errors.country}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  {t("checkout.pincode")}
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={shipping.pincode}
                  onChange={handleShippingChange}
                  className={fieldClass("pincode")}
                />
                {errors.pincode && (
                  <p className="text-xs text-destructive mt-1">{errors.pincode}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                {t("checkout.phone")}
              </label>
              <input
                type="text"
                name="phone"
                value={shipping.phone}
                onChange={handleShippingChange}
                className={fieldClass("phone")}
              />
              {errors.phone && (
                <p className="text-xs text-destructive mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Order Summary */}
            <div className="border-t border-border pt-4 mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {t("checkout.orderSummary", { count: cart.length })}
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
                  {t("checkout.placingOrder")}
                </>
              ) : (
                t("checkout.placeOrder")
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
