import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";
import i18n from "../../lib/i18n";

export const fetchSiteSettings = createAsyncThunk(
  "settings/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/settings");
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const updateSiteSettings = createAsyncThunk(
  "settings/update",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.patch("/settings", payload);
      toast.success(data.message);
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || i18n.t("errors.updateSettingsFailed"));
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    loading: false,
    settings: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSiteSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload.settings;
      })
      .addCase(fetchSiteSettings.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateSiteSettings.fulfilled, (state, action) => {
        state.settings = action.payload.settings;
      });
  },
});

export default settingsSlice.reducer;
