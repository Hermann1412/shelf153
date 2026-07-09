import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Smartphone, Loader, XCircle } from "lucide-react";
import { clearCart } from "../store/slices/cartSlice";
import { checkPaymentStatus, resetOrder } from "../store/slices/orderSlice";
import { toast } from "react-toastify";

const AirtelMoneyPayment = ({ phone }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { orderId, paymentStatus, finalPrice } = useSelector((state) => state.order);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!orderId || paymentStatus !== "Pending") return;

    pollRef.current = setInterval(() => {
      dispatch(checkPaymentStatus(orderId));
    }, 4000);

    return () => clearInterval(pollRef.current);
  }, [orderId, paymentStatus, dispatch]);

  useEffect(() => {
    if (paymentStatus === "Paid") {
      clearInterval(pollRef.current);
      toast.success(t("airtelPayment.paymentSuccessful"));
      dispatch(clearCart());
      dispatch(resetOrder());
      navigate("/orders");
    } else if (paymentStatus === "Failed") {
      clearInterval(pollRef.current);
      toast.error(t("airtelPayment.paymentFailedRetry"));
    }
  }, [paymentStatus, dispatch, navigate]);

  return (
    <div className="max-w-md mx-auto">
      <div className="glass-panel text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Smartphone className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">
            {t("airtelPayment.title")}
          </h3>
        </div>

        <div className="mb-6 p-4 bg-secondary rounded-lg">
          <div className="flex justify-between text-foreground">
            <span>{t("airtelPayment.totalAmount")}</span>
            <span className="font-bold text-primary">
              ${finalPrice?.toFixed(2) || "0.00"}
            </span>
          </div>
        </div>

        {paymentStatus === "Failed" ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <XCircle className="w-10 h-10 text-red-400" />
            <p className="text-foreground font-medium">{t("airtelPayment.paymentFailed")}</p>
            <p className="text-sm text-muted-foreground">
              {t("airtelPayment.tryAgainMessage")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader className="w-8 h-8 text-primary animate-spin" />
            <p className="text-foreground font-medium">
              {t("airtelPayment.requestSentTo", { phone })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("airtelPayment.instructions")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AirtelMoneyPayment;
