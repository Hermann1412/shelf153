import { createSlice } from "@reduxjs/toolkit";

const popupSlice = createSlice({
  name: "popup",
  initialState: {
    isAuthPopupOpen: false,
    isSidebarOpen: false,
    isSearchBarOpen: false,
    isCartOpen: false,
    isProfilePanelOpen: false,
  },
  reducers: {
    toggleAuthPopup: (state) => {
      state.isAuthPopupOpen = !state.isAuthPopupOpen;
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    toggleSearchBar: (state) => {
      state.isSearchBarOpen = !state.isSearchBarOpen;
    },
    toggleCart: (state) => {
      state.isCartOpen = !state.isCartOpen;
    },
    toggleProfilePanel: (state) => {
      state.isProfilePanelOpen = !state.isProfilePanelOpen;
    },
    closeAll: (state) => {
      state.isAuthPopupOpen = false;
      state.isSidebarOpen = false;
      state.isSearchBarOpen = false;
      state.isCartOpen = false;
      state.isProfilePanelOpen = false;
    },
  },
});

export const {
  toggleAuthPopup,
  toggleSidebar,
  toggleSearchBar,
  toggleCart,
  toggleProfilePanel,
  closeAll,
} = popupSlice.actions;
export default popupSlice.reducer;
