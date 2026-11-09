// The main admin can open any store's seller space. While a store is open, every seller-space
// request carries ?store=<sellerId|platform>; the backend ignores it for real sellers.

export const PLATFORM_STORE = "platform";

// Seller-space screens are shown to sellers, and to the admin while a store is open.
export const selectSellerMode = (state) =>
  state.auth.user?.role === "Seller" || Boolean(state.extra?.viewingStore);

// Appends the open store to a seller-space URL, e.g. withStore("/seller/orders", getState).
export const withStore = (url, getState) => {
  const storeId = getState().extra?.viewingStore?.id;
  if (!storeId) return url;
  return `${url}${url.includes("?") ? "&" : "?"}store=${encodeURIComponent(storeId)}`;
};

// Public address of a store's own login page.
export const storeLoginUrl = (slug) => `${window.location.origin}/boutique/${slug}`;
