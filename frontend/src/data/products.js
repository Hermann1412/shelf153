export const categories = [
  {
    id: "1",
    name: "Electronics",
    key: "electronics",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300",
  },
  {
    id: "2",
    name: "Fashion",
    key: "fashion",
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=300",
  },
  {
    id: "3",
    name: "Home & Garden",
    key: "homeGarden",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300",
  },
  {
    id: "4",
    name: "Sports",
    key: "sports",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300",
  },
  {
    id: "5",
    name: "Books",
    key: "books",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300",
  },
  {
    id: "6",
    name: "Beauty",
    key: "beauty",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300",
  },
  {
    id: "7",
    name: "Automotive",
    key: "automotive",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=300",
  },
  {
    id: "8",
    name: "Kids & Baby",
    key: "kidsBaby",
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=300",
  },
];

// Products store the English category name; show the translated label when we know it.
export const categoryLabel = (name, t) => {
  const category = categories.find((entry) => entry.name === name);
  return category ? t(`categories.${category.key}`) : name;
};

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
