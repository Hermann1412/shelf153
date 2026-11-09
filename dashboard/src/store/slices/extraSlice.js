import { createSlice } from "@reduxjs/toolkit";

// The store the main admin has opened ({ id, store_name, slug }), kept for the browser session
// so a page refresh does not drop the admin back to the platform view.
const VIEWING_STORE_KEY = "viewingStore";

const loadViewingStore = () => {
  try {
    return JSON.parse(sessionStorage.getItem(VIEWING_STORE_KEY)) || null;
  } catch {
    return null;
  }
};

const saveViewingStore = (store) => {
  try {
    if (store) sessionStorage.setItem(VIEWING_STORE_KEY, JSON.stringify(store));
    else sessionStorage.removeItem(VIEWING_STORE_KEY);
  } catch {
    // Storage unavailable: the choice simply lasts until the next reload.
  }
};

const extraSlice = createSlice({
  name: "extra",
  initialState: {
    openedComponent: "Dashboard",
    isNavbarOpened: false,
    isViewProductModalOpened: false,
    isCreateProductModalOpened: false,
    isUpdateProductModalOpened: false,
    viewingStore: loadViewingStore(),
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
    // Opening a store (or going back to the platform with null) always starts on its dashboard.
    setViewingStore: (state, action) => {
      const store = action.payload
        ? { id: action.payload.id, store_name: action.payload.store_name, slug: action.payload.slug || null }
        : null;
      state.viewingStore = store;
      state.openedComponent = "Dashboard";
      state.isNavbarOpened = false;
      saveViewingStore(store);
    },
  },
});

export const {
  setOpenedComponent,
  toggleNavbar,
  toggleViewProductModal,
  toggleCreateProductModal,
  toggleUpdateProductModal,
  setViewingStore,
} = extraSlice.actions;

export default extraSlice.reducer;
