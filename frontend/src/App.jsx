import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastContainer } from "react-toastify";
import { lazy, Suspense, useEffect } from "react";
import { useDispatch } from "react-redux";
import { getUser } from "./store/slices/authSlice";
import { fetchAllProducts } from "./store/slices/productSlice";

// Layout Components
import Navbar from "./components/Layout/Navbar";
import Sidebar from "./components/Layout/Sidebar";
import SearchOverlay from "./components/Layout/SearchOverlay";
import CartSidebar from "./components/Layout/CartSidebar";
import ProfilePanel from "./components/Layout/ProfilePanel";
import LoginModal from "./components/Layout/LoginModal";
import Footer from "./components/Layout/Footer";
import ChatWidget from "./components/Chat/ChatWidget";

// Pages
const Index = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Orders = lazy(() => import("./pages/Orders"));
const Payment = lazy(() => import("./pages/Payment"));
const About = lazy(() => import("./pages/About"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AppContent = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getUser());
    dispatch(fetchAllProducts());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar />
      <SearchOverlay />
      <CartSidebar />
      <ProfilePanel />
      <LoginModal />
      <ChatWidget />
      <Suspense fallback={<div className="min-h-screen pt-32 text-center text-muted-foreground">Loading…</div>}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/password/reset/:token" element={<Index />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <>
      <ThemeProvider>
        <BrowserRouter>
          <AppContent />
          <ToastContainer />
        </BrowserRouter>
      </ThemeProvider>
    </>
  );
};

export default App;
