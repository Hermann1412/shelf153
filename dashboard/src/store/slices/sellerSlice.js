import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";
import { getUser } from "./authSlice";

export const applyToBecomeSeller = createAsyncThunk(
  "seller/apply",
  async (formData, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await axiosInstance.post("/seller/apply", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(data.message);
      dispatch(getUser());
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to apply as seller");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchStoreProfile = createAsyncThunk(
  "seller/fetchStoreProfile",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/seller/store-profile");
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const updateStoreProfile = createAsyncThunk(
  "seller/updateStoreProfile",
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put("/seller/store-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(data.message);
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update store profile");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchSellerProducts = createAsyncThunk(
  "seller/fetchProducts",
  async (page = 1, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(`/seller/products?page=${page}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchSellerOrders = createAsyncThunk(
  "seller/fetchOrders",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/seller/orders");
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const updateOrderItemStatus = createAsyncThunk(
  "seller/updateOrderItemStatus",
  async ({ itemId, status }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put(
        `/seller/order-item/${itemId}/status`,
        { status }
      );
      toast.success(data.message);
      return data.orderItem;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update order item");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchSellerDashboardStats = createAsyncThunk(
  "seller/dashboardStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/seller/dashboard-stats");
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const sellerSlice = createSlice({
  name: "seller",
  initialState: {
    loading: false,
    storeProfile: null,
    storeProfileNotFound: false,
    products: [],
    totalProducts: 0,
    orderItems: [],
    // Same field names as adminSlice so chart components can be reused across roles.
    totalRevenueAllTime: 0,
    todayRevenue: 0,
    yesterdayRevenue: 0,
    totalOrdersCount: 0,
    monthlySales: [],
    orderStatusCounts: {},
    topSellingProducts: [],
    lowStockProducts: 0,
    revenueGrowth: "",
    newOrdersThisMonth: 0,
    currentMonthSales: 0,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(applyToBecomeSeller.fulfilled, (state, action) => {
        state.storeProfile = action.payload.storeProfile;
        state.storeProfileNotFound = false;
      })
      .addCase(fetchStoreProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStoreProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.storeProfile = action.payload.storeProfile;
        state.storeProfileNotFound = false;
      })
      .addCase(fetchStoreProfile.rejected, (state) => {
        state.loading = false;
        state.storeProfileNotFound = true;
      })
      .addCase(updateStoreProfile.fulfilled, (state, action) => {
        state.storeProfile = action.payload.storeProfile;
      })
      .addCase(fetchSellerProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSellerProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products;
        state.totalProducts = action.payload.totalProducts;
      })
      .addCase(fetchSellerProducts.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchSellerOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSellerOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orderItems = action.payload.orderItems;
      })
      .addCase(fetchSellerOrders.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateOrderItemStatus.fulfilled, (state, action) => {
        const idx = state.orderItems.findIndex((i) => i.id === action.payload.id);
        if (idx !== -1) {
          state.orderItems[idx] = { ...state.orderItems[idx], ...action.payload };
        }
      })
      .addCase(fetchSellerDashboardStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSellerDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.totalRevenueAllTime = action.payload.totalRevenueAllTime;
        state.todayRevenue = action.payload.todayRevenue;
        state.yesterdayRevenue = action.payload.yesterdayRevenue;
        state.totalOrdersCount = action.payload.totalOrdersCount;
        state.monthlySales = action.payload.monthlySales;
        state.orderStatusCounts = action.payload.orderStatusCounts;
        state.topSellingProducts = action.payload.topSellingProducts;
        state.lowStockProducts = action.payload.lowStockProducts;
        state.revenueGrowth = action.payload.revenueGrowth;
        state.newOrdersThisMonth = action.payload.newOrdersThisMonth;
        state.currentMonthSales = action.payload.currentMonthSales;
      })
      .addCase(fetchSellerDashboardStats.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default sellerSlice.reducer;
