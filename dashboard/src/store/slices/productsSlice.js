import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";
import { toggleCreateProductModal, toggleUpdateProductModal } from "./extraSlice";

export const fetchAllProducts = createAsyncThunk(
  "product/fetchAll",
  async (page = 1, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(`/product?page=${page}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const createNewProduct = createAsyncThunk(
  "product/create",
  async (formData, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await axiosInstance.post(
        "/product/admin/create",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toast.success(data.message);
      dispatch(toggleCreateProductModal());
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create product");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const updateProduct = createAsyncThunk(
  "product/update",
  async ({ productData, productId }, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await axiosInstance.put(
        `/product/admin/update/${productId}`,
        productData
      );
      toast.success(data.message);
      dispatch(toggleUpdateProductModal());
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update product");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const deleteProduct = createAsyncThunk(
  "product/delete",
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.delete(
        `/product/admin/delete/${productId}`
      );
      toast.success(data.message);
      return productId;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete product");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const productSlice = createSlice({
  name: "product",
  initialState: {
    loading: false,
    products: [],
    totalProducts: 0,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products;
        state.totalProducts = action.payload.totalProducts;
      })
      .addCase(fetchAllProducts.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createNewProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(createNewProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products.unshift(action.payload.product);
        state.totalProducts += 1;
      })
      .addCase(createNewProduct.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.products.findIndex(
          (p) => p.id === action.payload.updatedProduct.id
        );
        if (idx !== -1) {
          state.products[idx] = action.payload.updatedProduct;
        }
      })
      .addCase(updateProduct.rejected, (state) => {
        state.loading = false;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter((p) => p.id !== action.payload);
        state.totalProducts -= 1;
      });
  },
});

export default productSlice.reducer;
