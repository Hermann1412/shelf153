import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";
import i18n from "../../lib/i18n";

export const placeOrder = createAsyncThunk(
  "order/placeOrder",
  async (orderData, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/order/new", orderData);
      toast.success(data.message);
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || i18n.t("errors.orderFailed"));
      return rejectWithValue(error.response?.data?.message);
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

const orderSlice = createSlice({
  name: "order",
  initialState: {
    myOrders: [],
    fetchingOrders: false,
    placingOrder: false,
    finalPrice: null,
    orderStep: 1,
    orderId: "",
    paymentStatus: "",
  },
  reducers: {
    setOrderStep: (state, action) => {
      state.orderStep = action.payload;
    },
    resetOrder: (state) => {
      state.orderStep = 1;
      state.orderId = "";
      state.paymentStatus = "";
      state.finalPrice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (state) => {
        state.placingOrder = true;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.placingOrder = false;
        state.orderId = action.payload.orderId;
        state.paymentStatus = "Pending";
        state.finalPrice = action.payload.total_price;
        state.orderStep = 3;
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
      });
  },
});

export default orderSlice.reducer;
export const { setOrderStep, resetOrder } = orderSlice.actions;
