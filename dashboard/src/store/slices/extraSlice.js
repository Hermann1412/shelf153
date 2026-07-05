import { createSlice } from "@reduxjs/toolkit";

const extraSlice = createSlice({
  name: "extra",
  initialState: {
    openedComponent: "Dashboard",
    isNavbarOpened: false,
    isViewProductModalOpened: false,
    isCreateProductModalOpened: false,
    isUpdateProductModalOpened: false,
  },
  reducers: {
    setOpenedComponent: (state, action) => {
      state.openedComponent = action.payload;
      state.isNavbarOpened = false;
    },
    toggleNavbar: (state) => {
      state.isNavbarOpened = !state.isNavbarOpened;
    },
    toggleViewProductModal: (state) => {
      state.isViewProductModalOpened = !state.isViewProductModalOpened;
    },
    toggleCreateProductModal: (state) => {
      state.isCreateProductModalOpened = !state.isCreateProductModalOpened;
    },
    toggleUpdateProductModal: (state) => {
      state.isUpdateProductModalOpened = !state.isUpdateProductModalOpened;
    },
  },
});

export const {
  setOpenedComponent,
  toggleNavbar,
  toggleViewProductModal,
  toggleCreateProductModal,
  toggleUpdateProductModal,
} = extraSlice.actions;

export default extraSlice.reducer;
