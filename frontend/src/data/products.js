// Categories are not fixed: the storefront lists only those with products on sale
// (GET /product/categories), and admins or sellers create new ones by typing a name on a product.
// Products store the category as typed; these are translations for the original English names.
const CATEGORY_KEYS = {
  Electronics: "electronics",
  Fashion: "fashion",
  "Home & Garden": "homeGarden",
  Sports: "sports",
  Books: "books",
  Beauty: "beauty",
  Automotive: "automotive",
  "Kids & Baby": "kidsBaby",
};

export const categoryLabel = (name, t) => (CATEGORY_KEYS[name] ? t(`categories.${CATEGORY_KEYS[name]}`) : name);

// Mirrors the pricing in backend/controllers/orderController.js (placeNewOrder);
// keep both in sync so the cart shows exactly what checkout charges.
export const FREE_SHIPPING_THRESHOLD = 50;
const TAX_RATE = 0.18;
const SHIPPING_FEE = 2;

export const orderTotals = (cart) => {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = Math.round((subtotal + tax + shipping) * 100) / 100;
  return { subtotal, tax, shipping, total };
};
