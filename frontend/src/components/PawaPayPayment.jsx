import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Smartphone, Loader, XCircle } from "lucide-react";
import { clearCart } from "../store/slices/cartSlice";
import { checkPaymentStatus, resetOrder } from "../store/slices/orderSlice";
import { toast } from "react-toastify";

const providerNames = {
  AIRTEL_COD: "Airtel Money",
  VODACOM_MPESA_COD: "Vodacom M-Pesa",
  ORANGE_COD: "Orange Money",
};

const PawaPayPayment = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    orderId,
    paymentStatus,
    finalPrice,
    finalCurrency,
    paymentPhone: phone,
    paymentProvider: provider,
  } = useSelector((state) => state.order);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!orderId || paymentStatus !== "Pending") return;
    pollRef.current = setInterval(() => dispatch(checkPaymentStatus(orderId)), 4000);
    return () => clearInterval(pollRef.current);
  }, [orderId, paymentStatus, dispatch]);

  useEffect(() => {
    if (paymentStatus === "Paid") {
      clearInterval(pollRef.current);
      toast.success(t("pawaPayPayment.paymentSuccessful"));
      dispatch(clearCart());
      dispatch(resetOrder());
      navigate("/orders");
    } else if (paymentStatus === "Failed") {
      clearInterval(pollRef.current);
      toast.error(t("pawaPayPayment.paymentFailedRetry"));
    }
  }, [paymentStatus, dispatch, navigate, t]);

  return (
    <div className="surface overflow-hidden">
      <div className="px-6 pt-8 pb-6 text-center">
        {paymentStatus === "Failed" ? (
          <span className="mx-auto w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <XCircle className="w-7 h-7" />
          </span>
        ) : (
          <span className="relative mx-auto w-14 h-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
            <Smartphone className="w-7 h-7" />
            <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" />
          </span>
        )}
        <h3 className="mt-4 text-lg font-bold text-foreground">{t("pawaPayPayment.title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{providerNames[provider] || provider}</p>
      </div>

      <div className="mx-6 px-4 py-3 rounded-lg bg-secondary flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("pawaPayPayment.totalAmount")}</span>
        <span className="text-base font-extrabold text-foreground tabular-nums">
          {finalCurrency || "USD"} {Number(finalPrice || 0).toLocaleString(undefined, {
            minimumFractionDigits: finalCurrency === "CDF" ? 0 : 2,
            maximumFractionDigits: finalCurrency === "CDF" ? 0 : 2,
          })}
        </span>
      </div>

      {paymentStatus === "Failed" ? (
        <div className="px-6 py-6 text-center">
          <p className="text-sm font-semibold text-foreground">{t("pawaPayPayment.paymentFailed")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("pawaPayPayment.tryAgainMessage")}</p>
          <button type="button" onClick={() => dispatch(resetOrder())} className="btn-primary btn-lg w-full mt-5">
            {t("pawaPayPayment.tryAgain")}
          </button>
        </div>
      ) : (
        <div className="px-6 py-6">
          <div className="flex items-start gap-3">
            <Loader className="w-5 h-5 mt-0.5 shrink-0 text-primary animate-spin" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t("pawaPayPayment.requestSentTo", { phone })}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("pawaPayPayment.instructions")}</p>
            </div>
          </div>
          <p className="mt-5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-sm font-medium text-foreground">
            {t("pawaPayPayment.doNotRetry")}
          </p>
        </div>
      )}
    </div>
  );
};

export default PawaPayPayment;
