import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Smartphone, Loader, XCircle } from "lucide-react";
import { clearCart } from "../store/slices/cartSlice";
import { checkPaymentStatus, resetOrder } from "../store/slices/orderSlice";
import { toast } from "react-toastify";

const AirtelMoneyPayment = ({ phone }) => {
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
      toast.success("Payment successful!");
      dispatch(clearCart());
      dispatch(resetOrder());
      navigate("/orders");
    } else if (paymentStatus === "Failed") {
      clearInterval(pollRef.current);
      toast.error("Payment failed. Please try again.");
    }
  }, [paymentStatus, dispatch, navigate]);

  return (
    <div className="max-w-md mx-auto">
      <div className="glass-panel text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Smartphone className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">
            Airtel Money Payment
          </h3>
        </div>

        <div className="mb-6 p-4 bg-secondary rounded-lg">
          <div className="flex justify-between text-foreground">
            <span>Total Amount</span>
            <span className="font-bold text-primary">
              ${finalPrice?.toFixed(2) || "0.00"}
            </span>
          </div>
        </div>

        {paymentStatus === "Failed" ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <XCircle className="w-10 h-10 text-red-400" />
            <p className="text-foreground font-medium">Payment failed</p>
            <p className="text-sm text-muted-foreground">
              Please go back and place the order again.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader className="w-8 h-8 text-primary animate-spin" />
            <p className="text-foreground font-medium">
              Payment request sent to {phone}
            </p>
            <p className="text-sm text-muted-foreground">
              Enter your Airtel Money PIN on your phone to confirm the payment.
              This page will update automatically once payment is confirmed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AirtelMoneyPayment;
