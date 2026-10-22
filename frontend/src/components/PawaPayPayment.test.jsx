// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import PawaPayPayment from "./PawaPayPayment";

const dispatch = vi.fn();
const navigate = vi.fn();
let orderState = {
  orderId: "order-1", paymentStatus: "Pending", finalPrice: 12.5, finalCurrency: "USD",
  paymentPhone: "243812345678", paymentProvider: "AIRTEL_COD",
};

vi.mock("react-redux", () => ({
  useDispatch: () => dispatch,
  useSelector: (selector) => selector({ order: orderState }),
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, values) => values?.phone ? `${key}:${values.phone}` : key,
  }),
}));
vi.mock("../store/slices/cartSlice", () => ({ clearCart: () => ({ type: "cart/clear" }) }));
vi.mock("../store/slices/orderSlice", () => ({
  checkPaymentStatus: (id) => ({ type: "order/check", payload: id }),
  resetOrder: () => ({ type: "order/reset" }),
}));

describe("PawaPayPayment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    dispatch.mockClear();
    navigate.mockClear();
    orderState = {
  orderId: "order-1", paymentStatus: "Pending", finalPrice: 12.5, finalCurrency: "USD",
  paymentPhone: "243812345678", paymentProvider: "AIRTEL_COD",
};
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test("shows the selected operator, amount and destination phone", () => {
    render(<PawaPayPayment />);
    expect(screen.getByText("Airtel Money")).toBeInTheDocument();
    expect(screen.getByText(/USD 12[.,]50/)).toBeInTheDocument();
    expect(screen.getByText("pawaPayPayment.requestSentTo:243812345678")).toBeInTheDocument();
    expect(screen.getByText("pawaPayPayment.doNotRetry")).toBeInTheDocument();
  });

  test("polls the protected payment status endpoint", () => {
    render(<PawaPayPayment />);
    vi.advanceTimersByTime(4_000);
    expect(dispatch).toHaveBeenCalledWith({ type: "order/check", payload: "order-1" });
  });

  test("shows the exact CDF amount requested by the backend", () => {
    orderState = { ...orderState, finalPrice: 38640, finalCurrency: "CDF", paymentProvider: "VODACOM_MPESA_COD" };
    render(<PawaPayPayment />);
    expect(screen.getByText(/CDF 38[,.\s]640/)).toBeInTheDocument();
  });

  test("offers a fresh checkout attempt after a failed payment", () => {
    orderState = { ...orderState, paymentStatus: "Failed" };
    render(<PawaPayPayment />);
    fireEvent.click(screen.getByText("pawaPayPayment.tryAgain"));
    expect(dispatch).toHaveBeenCalledWith({ type: "order/reset" });
  });
});
