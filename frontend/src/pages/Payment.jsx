import { useState, useEffect } from "react";
import { ArrowLeft, Check, MapPin, Loader, Smartphone, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import PawaPayPayment from "../components/PawaPayPayment";
import { placeOrder } from "../store/slices/orderSlice";
import { toggleAuthPopup } from "../store/slices/popupSlice";
import { toast } from "react-toastify";
import { axiosInstance } from "../lib/axios";
import { orderTotals } from "../data/products";

const Payment = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cart } = useSelector((state) => state.cart);
  const { authUser, isCheckingAuth } = useSelector((state) => state.auth);
  const { isAuthPopupOpen } = useSelector((state) => state.popup);
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
    provider: "AIRTEL_COD",
    currency: "USD",
  });
  const [errors, setErrors] = useState({});
  const [paymentConfig, setPaymentConfig] = useState({ cdf_exchange_rate: null });

  useEffect(() => {
    if (cart.length === 0 && orderStep === 1) {
      navigate("/cart");
    }
  }, [cart, navigate, orderStep]);

  // Checkout needs an account. Wait for the session check (a refresh used to bounce signed-in
  // customers to the home page), then ask guests to sign in here; the page continues once they do.
  const needsSignIn = !isCheckingAuth && !authUser;
  useEffect(() => {
    if (needsSignIn && !isAuthPopupOpen) dispatch(toggleAuthPopup());
    // Only on arrival or after a sign-out, not each time the guest closes the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsSignIn, dispatch]);

  useEffect(() => {
    axiosInstance.get("/order/payment/config")
      .then(({ data }) => setPaymentConfig(data))
      .catch(() => setPaymentConfig({ currencies: ["USD"], cdf_exchange_rate: null }));
  }, []);

  const handleShippingChange = (e) => {
    setShipping({ ...shipping, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: undefined });
    }
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    if (placingOrder) return;
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

  const { subtotal, tax, shipping: shippingFee, total: usdTotal } = orderTotals(cart);
  const cdfAvailable = paymentConfig.currencies?.includes("CDF") && paymentConfig.cdf_exchange_rate;
  const selectedTotal = shipping.currency === "CDF" && cdfAvailable
    ? Math.round(usdTotal * paymentConfig.cdf_exchange_rate)
    : usdTotal;
  const formatAmount = (amount, currency) =>
    `${currency} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: currency === "CDF" ? 0 : 2,
      maximumFractionDigits: currency === "CDF" ? 0 : 2,
    })}`;

  const steps = [
    { num: 1, label: t("checkout.stepShipping") },
    { num: 2, label: t("checkout.stepProcessing") },
    { num: 3, label: t("checkout.stepPayment") },
  ];

  const providers = [
    { value: "AIRTEL_COD", label: "Airtel Money" },
    { value: "VODACOM_MPESA_COD", label: "Vodacom M-Pesa" },
    { value: "ORANGE_COD", label: "Orange Money" },
  ];

  const field = (name, label, props = {}) => (
    <div className={props.wrapperClassName}>
      <label htmlFor={`checkout-${name}`} className="field-label">{label}</label>
      <input
        id={`checkout-${name}`}
        type="text"
        name={name}
        value={shipping[name]}
        onChange={handleShippingChange}
        aria-invalid={Boolean(errors[name])}
        className={`field ${errors[name] ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
        {...props.input}
      />
      {errors[name] ? (
        <p className="mt-1.5 text-xs text-destructive">{errors[name]}</p>
      ) : props.hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{props.hint}</p>
      ) : null}
    </div>
  );

  if (isCheckingAuth) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  // Guest: the sign-in screen is open; if they close it, explain and let them reopen it.
  if (needsSignIn) {
    return (
      <div className="page">
        <div className="surface max-w-lg mx-auto px-6 py-14 text-center">
          <span className="mx-auto w-14 h-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </span>
          <h1 className="mt-5 text-xl font-bold text-foreground">
            {t("checkout.signInTitle", "Connectez-vous pour finaliser votre commande")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("checkout.signInText", "Votre panier est conservé. Un compte permet de suivre votre commande et votre paiement Mobile Money.")}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={() => dispatch(toggleAuthPopup())} className="btn-primary btn-lg">
              {t("auth.signIn")}
            </button>
            <Link to="/cart" className="btn-outline btn-lg">
              {t("checkout.backToCart")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page max-w-6xl">
      <Link
        to="/cart"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("checkout.backToCart")}
      </Link>

      <div className="mt-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="page-title">{t("checkout.title")}</h1>

        {/* Step indicator */}
        <ol className="flex items-center gap-2 text-sm">
          {steps.map((step, i) => {
            const isActive = orderStep === step.num;
            const isDone = orderStep > step.num;
            return (
              <li key={step.num} className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isDone || isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : step.num}
                </span>
                <span className={`${isActive ? "font-semibold text-foreground" : "text-muted-foreground"} ${isActive ? "" : "hidden md:inline"}`}>
                  {step.label}
                </span>
                {i < steps.length - 1 && <span className={`w-6 sm:w-10 h-px ${isDone ? "bg-primary" : "bg-border"}`} />}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Step 1 - Shipping & payment details */}
      {orderStep === 1 && (
        <form onSubmit={handleShippingSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <section className="surface p-5 sm:p-6">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {t("checkout.shippingInfo")}
              </h2>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                {field("full_name", t("checkout.fullName"), { wrapperClassName: "sm:col-span-2", input: { autoComplete: "name" } })}
                {field("address", t("checkout.address"), { wrapperClassName: "sm:col-span-2", input: { autoComplete: "street-address" } })}
                {field("city", t("checkout.city"), { input: { autoComplete: "address-level2" } })}
                {field("state", t("checkout.state"), { input: { autoComplete: "address-level1" } })}
                {field("country", t("checkout.country"), { input: { autoComplete: "country-name" } })}
                {field("pincode", t("checkout.pincode"), { input: { autoComplete: "postal-code" } })}
              </div>
            </section>

            <section className="surface p-5 sm:p-6">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                {t("checkout.mobileMoneyProvider")}
              </h2>

              <div role="radiogroup" aria-label={t("checkout.mobileMoneyProvider")} className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {providers.map((provider) => {
                  const selected = shipping.provider === provider.value;
                  return (
                    <label
                      key={provider.value}
                      className={`flex items-center gap-3 h-12 px-3.5 rounded-lg border cursor-pointer transition-colors ${
                        selected ? "border-primary bg-accent text-accent-foreground" : "border-input hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="provider"
                        value={provider.value}
                        checked={selected}
                        onChange={handleShippingChange}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          selected ? "border-primary" : "border-input"
                        }`}
                      >
                        {selected && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </span>
                      <span className="text-sm font-medium">{provider.label}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field("phone", t("checkout.phone"), {
                  hint: t("checkout.phoneHint"),
                  input: { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "243 81 234 5678" },
                })}
                <div>
                  <span className="field-label">{t("checkout.paymentCurrency")}</span>
                  <div className="grid grid-cols-2 p-1 h-11 rounded-lg bg-secondary">
                    {["USD", "CDF"].map((currency) => {
                      const disabled = currency === "CDF" && !cdfAvailable;
                      const selected = shipping.currency === currency;
                      return (
                        <button
                          key={currency}
                          type="button"
                          disabled={disabled}
                          aria-pressed={selected}
                          onClick={() => handleShippingChange({ target: { name: "currency", value: currency } })}
                          className={`rounded-md text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            selected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {currency}
                        </button>
                      );
                    })}
                  </div>
                  {!cdfAvailable && <p className="mt-1.5 text-xs text-muted-foreground">{t("checkout.cdfUnavailable")}</p>}
                </div>
              </div>
            </section>
          </div>

          {/* Order summary */}
          <aside className="lg:col-span-5 surface p-5 sm:p-6 lg:sticky lg:top-[8.5rem]">
            <h2 className="text-base font-semibold text-foreground">
              {t("checkout.orderSummary", { count: cart.length })}
            </h2>
            <ul className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-1">
              {cart.map((item) => (
                <li key={item.product.id} className="flex items-center gap-3">
                  <span className="relative shrink-0">
                    <img
                      src={item.product.images?.[0]?.url || "/avatar-holder.avif"}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover bg-secondary"
                    />
                    <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-foreground text-background text-[0.6875rem] font-bold flex items-center justify-center">
                      {item.quantity}
                    </span>
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-foreground line-clamp-2">{item.product.name}</span>
                  <span className="text-sm font-medium tabular-nums shrink-0">
                    ${(Number(item.product.price) * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 pt-4 border-t border-border space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("cart.subtotal")}</dt>
                <dd className="tabular-nums">${subtotal.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("cart.shipping")}</dt>
                <dd className="tabular-nums">
                  {shippingFee === 0 ? <span className="text-primary">{t("cart.free")}</span> : `$${shippingFee.toFixed(2)}`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("cart.tax")}</dt>
                <dd className="tabular-nums">${tax.toFixed(2)}</dd>
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-baseline">
                <dt className="font-semibold">{t("checkout.paymentTotal")}</dt>
                <dd className="text-xl font-extrabold tabular-nums">{formatAmount(selectedTotal, shipping.currency)}</dd>
              </div>
            </dl>

            <button type="submit" disabled={placingOrder} className="btn-primary btn-lg w-full mt-5">
              {placingOrder ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {t("checkout.placingOrder")}
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  {t("checkout.placeOrder")}
                </>
              )}
            </button>
            <p className="mt-3 text-xs text-center text-muted-foreground">{t("home.features.paymentDesc")}</p>
          </aside>
        </form>
      )}

      {/* Step 3 - Payment */}
      {orderStep === 3 && orderId && (
        <div className="max-w-lg mx-auto">
          <PawaPayPayment />
        </div>
      )}
    </div>
  );
};

export default Payment;
