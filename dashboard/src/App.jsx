import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import SideBar from "./components/SideBar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import Products from "./components/Products";
import Orders from "./components/Orders";
import Users from "./components/Users";
import Profile from "./components/Profile";
import Chat from "./components/Chat";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/password/forgot" element={<ForgotPassword />} />
      <Route path="/password/reset/:token" element={<ResetPassword />} />

      {/* Protected Admin Route */}
      <Route
        path="/"
        element={
          isAuthenticated && user?.role === "Admin" ? (
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
