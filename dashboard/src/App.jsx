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
  const { openedComponent } = useSelector((state) => state.extra);

  useEffect(() => {
    dispatch(getUser());
  }, [dispatch]);

  const renderDashboardContent = () => {
    // A plain User has no store yet — send them straight to the apply form.
    if (user?.role === "User") return <StoreProfile />;

    if (user?.role === "Seller") {
      switch (openedComponent) {
        case "Products":
          return <SellerProducts />;
        case "Orders":
          return <SellerOrders />;
        case "StoreProfile":
          return <StoreProfile />;
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
              <div className="flex-1 flex flex-col">
                <Header />
                <main className="flex-1 p-6 overflow-y-auto">
                  {renderDashboardContent()}
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
