import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";
import i18n from "../../lib/i18n";

// One key per checkout attempt: resending it (after a timeout or a refresh) returns the same order
// instead of triggering a second Mobile Money charge. Kept until the attempt ends.
const CHECKOUT_KEY = "checkoutKey";
const PENDING_ORDER_KEY = "pendingOrder";

const storage = {
  get: (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Storage unavailable (private mode): the backend's pending-order guard still applies.
    }
  },
  remove: (key) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore.
    }
  },
};

const getCheckoutKey = () => {
  let key = storage.get(CHECKOUT_KEY);
  if (!key) {
    // randomUUID only exists in secure contexts (https, localhost).
    key = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    storage.set(CHECKOUT_KEY, key);
  }
  return key;
};

const endCheckoutAttempt = () => {
  storage.remove(CHECKOUT_KEY);
  storage.remove(PENDING_ORDER_KEY);
};

const loadPendingOrder = () => {
  try {
    return JSON.parse(storage.get(PENDING_ORDER_KEY)) || null;
  } catch {
    return null;
  }
};

export const placeOrder = createAsyncThunk(
  "order/placeOrder",
  async (orderData, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/order/new", orderData, {
        headers: { "Idempotency-Key": getCheckoutKey() },
      });
      toast.success(data.message);
      return { ...data, phone: orderData.phone, provider: orderData.provider };
    } catch (error) {
      const data = error.response?.data;
      // A previous order is still waiting for PIN confirmation: show it instead of charging again.
      if (data?.code === "PAYMENT_PENDING") {
        toast.info(i18n.t("pawaPayPayment.previousPaymentPending"));
        return { ...data, phone: orderData.phone, provider: orderData.provider };
      }
      // The server answered, so no order is in flight with this key. Without an answer (timeout,
      // lost connection) the order may exist: keep the key so a retry returns it.
      if (error.response) storage.remove(CHECKOUT_KEY);
      toast.error(data?.message || i18n.t("errors.orderFailed"));
      return rejectWithValue(data?.message);
    }
  }
);

export const fetchMyOrders = createAsyncThunk(
  "order/fetchMyOrders",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/order/orders/me");
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const checkPaymentStatus = createAsyncThunk(
  "order/checkPaymentStatus",
  async (orderId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(`/order/payment/status/${orderId}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

// After a page refresh, go straight back to the payment awaiting confirmation.
const pendingOrder = loadPendingOrder();

const orderSlice = createSlice({
  name: "order",
  initialState: {
    myOrders: [],
    fetchingOrders: false,
    placingOrder: false,
    finalPrice: pendingOrder?.finalPrice ?? null,
    finalCurrency: pendingOrder?.currency || "USD",
    sourceTotalPrice: pendingOrder?.sourceTotalPrice ?? null,
    exchangeRate: pendingOrder?.exchangeRate ?? 1,
    orderStep: pendingOrder ? 3 : 1,
    orderId: pendingOrder?.orderId || "",
    paymentStatus: pendingOrder ? "Pending" : "",
    paymentPhone: pendingOrder?.phone || "",
    paymentProvider: pendingOrder?.provider || "",
  },
  reducers: {
    setOrderStep: (state, action) => {
      state.orderStep = action.payload;
    },
    resetOrder: (state) => {
      endCheckoutAttempt();
      state.orderStep = 1;
      state.orderId = "";
      state.paymentStatus = "";
      state.finalPrice = null;
      state.finalCurrency = "USD";
      state.sourceTotalPrice = null;
      state.exchangeRate = 1;
      state.paymentPhone = "";
      state.paymentProvider = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (state) => {
        state.placingOrder = true;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        const {
          orderId, total_price, currency, source_total_price, exchange_rate, paymentStatus, phone, provider,
        } = action.payload;
        state.placingOrder = false;
        state.orderId = orderId;
        state.paymentStatus = paymentStatus || "Pending";
        state.finalPrice = Number(total_price);
        state.finalCurrency = currency;
        state.sourceTotalPrice = source_total_price;
        state.exchangeRate = exchange_rate;
        state.paymentPhone = phone;
        state.paymentProvider = provider;
        state.orderStep = 3;
        if (state.paymentStatus === "Pending") {
          storage.set(PENDING_ORDER_KEY, JSON.stringify({
            orderId,
            finalPrice: state.finalPrice,
            currency,
            sourceTotalPrice: source_total_price,
            exchangeRate: exchange_rate,
            phone,
            provider,
          }));
        }
      })
      .addCase(placeOrder.rejected, (state) => {
        state.placingOrder = false;
      })
      .addCase(fetchMyOrders.pending, (state) => {
        state.fetchingOrders = true;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.fetchingOrders = false;
        state.myOrders = action.payload.myOrders;
      })
      .addCase(fetchMyOrders.rejected, (state) => {
        state.fetchingOrders = false;
      })
      .addCase(checkPaymentStatus.fulfilled, (state, action) => {
        state.paymentStatus = action.payload.paymentStatus;
        if (state.paymentStatus !== "Pending") endCheckoutAttempt();
      });
  },
});

export default orderSlice.reducer;
export const { setOrderStep, resetOrder } = orderSlice.actions;
