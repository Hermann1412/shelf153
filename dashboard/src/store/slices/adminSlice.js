import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const fetchDashboardStats = createAsyncThunk(
  "admin/dashboardStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/admin/fetch/dashboard-stats");
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const getAllUsers = createAsyncThunk(
  "admin/getAllUsers",
  async (page = 1, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(
        `/admin/getallusers?page=${page}`
      );
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  "admin/deleteUser",
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.delete(`/admin/delete/${userId}`);
      toast.success(data.message);
      return userId;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const updateSellerStatus = createAsyncThunk(
  "admin/updateSellerStatus",
  async ({ userId, status }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.patch(
        `/admin/seller/${userId}/status`,
        { status }
      );
      toast.success(data.message);
      return { userId, status };
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update seller status");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const adminSlice = createSlice({
  name: "admin",
  initialState: {
    loading: false,
    totalUsers: 0,
    users: [],
    totalRevenueAllTime: 0,
    todayRevenue: 0,
    yesterdayRevenue: 0,
    totalUsersCount: 0,
    monthlySales: [],
    orderStatusCounts: {},
    topSellingProducts: [],
    lowStockProducts: 0,
    revenueGrowth: "",
    newUsersThisMonth: 0,
    currentMonthSales: 0,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.totalRevenueAllTime = action.payload.totalRevenueAllTime;
        state.todayRevenue = action.payload.todayRevenue;
        state.yesterdayRevenue = action.payload.yesterdayRevenue;
        state.totalUsersCount = action.payload.totalUsersCount;
        state.monthlySales = action.payload.monthlySales;
        state.orderStatusCounts = action.payload.orderStatusCounts;
        state.topSellingProducts = action.payload.topSellingProducts;
        state.lowStockProducts = action.payload.lowStockProducts;
        state.revenueGrowth = action.payload.revenueGrowth;
        state.newUsersThisMonth = action.payload.newUsersThisMonth;
        state.currentMonthSales = action.payload.currentMonthSales;
      })
      .addCase(fetchDashboardStats.rejected, (state) => {
        state.loading = false;
      })
      .addCase(getAllUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users;
        state.totalUsers = action.payload.totalUsers;
      })
      .addCase(getAllUsers.rejected, (state) => {
        state.loading = false;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter((u) => u.id !== action.payload);
        state.totalUsers -= 1;
      })
      .addCase(updateSellerStatus.fulfilled, (state, action) => {
        const user = state.users.find((u) => u.id === action.payload.userId);
        if (user) user.seller_status = action.payload.status;
      });
  },
});

export default adminSlice.reducer;
