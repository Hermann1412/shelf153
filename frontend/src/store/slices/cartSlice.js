import { createSlice } from "@reduxjs/toolkit";

const loadCartFromStorage = () => {
  try {
    const cart = localStorage.getItem("cart");
    return cart ? JSON.parse(cart) : [];
  } catch {
    return [];
  }
};

const saveCartToStorage = (cart) => {
  localStorage.setItem("cart", JSON.stringify(cart));
};

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cart: loadCartFromStorage(),
  },
  reducers: {
    addToCart: (state, action) => {
      const existingItem = state.cart.find(
        (item) => item.product.id === action.payload.product.id
      );
      if (existingItem) {
        existingItem.quantity += action.payload.quantity || 1;
      } else {
        state.cart.push({
          product: action.payload.product,
          quantity: action.payload.quantity || 1,
        });
      }
      saveCartToStorage(state.cart);
    },
    removeFromCart: (state, action) => {
      state.cart = state.cart.filter(
        (item) => item.product.id !== action.payload
      );
      saveCartToStorage(state.cart);
    },
    updateQuantity: (state, action) => {
      const item = state.cart.find(
        (item) => item.product.id === action.payload.productId
      );
      if (item) {
        item.quantity = action.payload.quantity;
      }
      saveCartToStorage(state.cart);
    },
    clearCart: (state) => {
      state.cart = [];
      saveCartToStorage(state.cart);
    },
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } =
  cartSlice.actions;

export default cartSlice.reducer;
