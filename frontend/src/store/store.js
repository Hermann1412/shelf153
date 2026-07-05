import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import popupReducer from "./slices/popupSlice";
import cartReducer from "./slices/cartSlice";
import productReducer from "./slices/productSlice";
import orderReducer from "./slices/orderSlice";
import chatReducer from "./slices/chatSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    popup: popupReducer,
    cart: cartReducer,
    product: productReducer,
    order: orderReducer,
    chat: chatReducer,
  },
});
