import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import SideBar from "./components/SideBar";
import Header from "./components/Header";
const Dashboard = lazy(() => import("./components/Dashboard"));
const Products = lazy(() => import("./components/Products"));
const Orders = lazy(() => import("./components/Orders"));
const Users = lazy(() => import("./components/Users"));
const Profile = lazy(() => import("./components/Profile"));
const Chat = lazy(() => import("./components/Chat"));
const StoreProfile = lazy(() => import("./components/StoreProfile"));
const Settings = lazy(() => import("./components/Settings"));
const Payouts = lazy(() => import("./components/Payouts"));
const Finance = lazy(() => import("./components/Finance"));
const SellerProducts = lazy(() => import("./components/SellerProducts"));
const SellerOrders = lazy(() => import("./components/SellerOrders"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
import { ToastContainer } from "react-toastify";
import { getUser } from "./store/slices/authSlice";

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  const { openedComponent, viewingStore } = useSelector((state) => state.extra);
  // The main admin sees a store's seller space when one is open in the store switcher.
  const viewingAsAdmin = user?.role === "Admin" && Boolean(viewingStore);

  useEffect(() => {
    dispatch(getUser());
  }, [dispatch]);

  const renderDashboardContent = () => {
    // A plain User has no store yet — send them straight to the apply form.
    if (user?.role === "User") return <StoreProfile />;

    if (user?.role === "Seller" || viewingAsAdmin) {
      switch (openedComponent) {
        case "Products":
          return <SellerProducts />;
        case "Orders":
          return <SellerOrders />;
        case "StoreProfile":
          return <StoreProfile />;
        case "Payouts":
          return <Payouts />;
        case "Profile":
          return <Profile />;
        default:
          return <Dashboard />;
      }
    }

    switch (openedComponent) {
      case "Dashboard":
        return <Dashboard />;
      case "Products":
        return <Products />;
      case "Orders":
        return <Orders />;
      case "Users":
        return <Users />;
      case "Chat":
        return <Chat />;
      case "Settings":
        return <Settings />;
      case "Payouts":
        return <Payouts />;
      case "Finance":
        return <Finance />;
      case "Profile":
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* A store's own login link: same form, branded with the store's name and logo. */}
      <Route path="/boutique/:slug" element={<Login />} />
      <Route path="/password/forgot" element={<ForgotPassword />} />
      <Route path="/password/reset/:token" element={<ResetPassword />} />

      {/* Protected Admin Route */}
      <Route
        path="/"
        element={
          isAuthenticated &&
          ["Admin", "Seller", "User"].includes(user?.role) ? (
            <div className="flex min-h-screen bg-gray-100">
              <SideBar />
              <div className="flex-1 min-w-0 flex flex-col">
                <Header />
                <main className="flex-1 p-4 sm:p-6 min-w-0">
                  {/* Sections load on demand; keep the sidebar and header on screen meanwhile. */}
                  <Suspense
                    fallback={
                      <div className="flex justify-center py-24">
                        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    }
                  >
                    {/* Remount on store change so every screen reloads that store's data. */}
                    <div key={viewingStore?.id || "platform-admin"}>{renderDashboardContent()}</div>
                  </Suspense>
                </main>
              </div>
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
      <ToastContainer theme="dark" />
    </Router>
  );
}

export default App;
