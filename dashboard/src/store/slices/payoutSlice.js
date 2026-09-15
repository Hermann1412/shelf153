import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";

export const fetchPayouts = createAsyncThunk("payout/fetch", async (_, { rejectWithValue }) => {
  try {
    return (await axiosInstance.get("/payout")).data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const fetchPayoutSummary = createAsyncThunk("payout/summary", async (_, { rejectWithValue }) => {
  try {
    return (await axiosInstance.get("/payout/summary")).data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const initiateSellerPayout = createAsyncThunk(
  "payout/initiate",
  async ({ sellerId, currency }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(`/payout/seller/${sellerId}`, { currency });
      toast.success(data.message);
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Payout failed.");
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

const payoutSlice = createSlice({
  name: "payout",
  initialState: { payouts: [], summaries: [], loading: false, payingSellerId: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayouts.pending, (state) => { state.loading = true; })
      .addCase(fetchPayouts.fulfilled, (state, action) => {
        state.loading = false;
        state.payouts = action.payload.payouts;
      })
      .addCase(fetchPayouts.rejected, (state) => { state.loading = false; })
      .addCase(fetchPayoutSummary.fulfilled, (state, action) => {
        state.summaries = action.payload.summaries;
      })
      .addCase(initiateSellerPayout.pending, (state, action) => {
        state.payingSellerId = action.meta.arg.sellerId;
      })
      .addCase(initiateSellerPayout.fulfilled, (state, action) => {
        state.payingSellerId = null;
        state.payouts.unshift(action.payload.payout);
      })
      .addCase(initiateSellerPayout.rejected, (state) => { state.payingSellerId = null; });
  },
});

export default payoutSlice.reducer;
