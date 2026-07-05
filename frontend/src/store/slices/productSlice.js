import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const fetchAllProducts = createAsyncThunk(
  "product/fetchAll",
  async (queryString = "", { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(`/product?${queryString}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchSingleProduct = createAsyncThunk(
  "product/fetchSingle",
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(
        `/product/singleProduct/${productId}`
      );
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const postProductReview = createAsyncThunk(
  "product/postReview",
  async ({ productId, rating, comment }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put(
        `/product/post-new/review/${productId}`,
        { rating, comment }
      );
      toast.success(data.message);
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post review");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const deleteProductReview = createAsyncThunk(
  "product/deleteReview",
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.delete(
        `/product/delete/review/${productId}`
      );
      toast.success(data.message);
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete review");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchAIProducts = createAsyncThunk(
  "product/aiSearch",
  async (userPrompt, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/product/ai-search", {
        userPrompt,
      });
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "AI search failed");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const productSlice = createSlice({
  name: "product",
  initialState: {
    loading: false,
    products: [],
    productDetails: null,
    totalProducts: 0,
    topRatedProducts: [],
    newProducts: [],
    aiSearching: false,
    aiProducts: [],
    isReviewDeleting: false,
    isPostingReview: false,
    productReviews: [],
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products;
        state.totalProducts = action.payload.totalProducts;
        state.newProducts = action.payload.newProducts || [];
        state.topRatedProducts = action.payload.topRatedProducts || [];
      })
      .addCase(fetchAllProducts.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchSingleProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSingleProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.productDetails = action.payload.product;
        state.productReviews = action.payload.product?.reviews || [];
      })
      .addCase(fetchSingleProduct.rejected, (state) => {
        state.loading = false;
      })
      .addCase(postProductReview.pending, (state) => {
        state.isPostingReview = true;
      })
      .addCase(postProductReview.fulfilled, (state, action) => {
        state.isPostingReview = false;
      })
      .addCase(postProductReview.rejected, (state) => {
        state.isPostingReview = false;
      })
      .addCase(deleteProductReview.pending, (state) => {
        state.isReviewDeleting = true;
      })
      .addCase(deleteProductReview.fulfilled, (state) => {
        state.isReviewDeleting = false;
      })
      .addCase(deleteProductReview.rejected, (state) => {
        state.isReviewDeleting = false;
      })
      .addCase(fetchAIProducts.pending, (state) => {
        state.aiSearching = true;
      })
      .addCase(fetchAIProducts.fulfilled, (state, action) => {
        state.aiSearching = false;
        state.aiProducts = action.payload.products || [];
      })
      .addCase(fetchAIProducts.rejected, (state) => {
        state.aiSearching = false;
      });
  },
});

export default productSlice.reducer;
