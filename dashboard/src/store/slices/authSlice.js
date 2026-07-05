import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/auth/login", {
        email,
        password,
      });
      toast.success(data.message);
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const getUser = createAsyncThunk(
  "auth/getUser",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/auth/me");
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/auth/logout");
      toast.success(data.message);
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (email, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/auth/password/forgot", {
        email,
      });
      toast.success(data.message);
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, password, confirmPassword }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put(
        `/auth/password/reset/${token}`,
        { password, confirmPassword }
      );
      toast.success(data.message);
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    loading: false,
    user: null,
    isAuthenticated: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state) => {
        state.loading = false;
      })
      .addCase(getUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(getUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(resetPassword.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default authSlice.reducer;
