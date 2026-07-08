import { useState, useEffect } from "react";
import { X, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useParams } from "react-router-dom";
import { toggleAuthPopup } from "../../store/slices/popupSlice";
import {
  login,
  register,
  forgotPassword,
  resetPassword,
} from "../../store/slices/authSlice";

const LoginModal = () => {
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const dispatch = useDispatch();
  const { isAuthPopupOpen } = useSelector((state) => state.popup);
  const { isLoggingIn, isSigningUp, isRequestingForToken, authUser } =
    useSelector((state) => state.auth);
  const location = useLocation();

  // Check for reset token in URL
  const resetTokenMatch = location.pathname.match(
    /\/password\/reset\/(.+)/
  );

  useEffect(() => {
    if (resetTokenMatch) {
      setMode("reset");
    }
  }, [location.pathname]);

  useEffect(() => {
    if (authUser && isAuthPopupOpen) {
      dispatch(toggleAuthPopup());
    }
  }, [authUser]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "login") {
      dispatch(login({ email: formData.email, password: formData.password }));
    } else if (mode === "register") {
      dispatch(
        register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        })
      );
    } else if (mode === "forgot") {
      dispatch(
        forgotPassword({
          email: formData.email,
          frontendUrl: window.location.origin,
        })
      );
    } else if (mode === "reset" && resetTokenMatch) {
      dispatch(
        resetPassword({
          token: resetTokenMatch[1],
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        })
      );
    }
  };

  if (!isAuthPopupOpen && !resetTokenMatch) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={() => !resetTokenMatch && dispatch(toggleAuthPopup())}
      >
        <div
          className="w-full max-w-md bg-background border border-border rounded-2xl p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {mode === "login"
                ? "Welcome Back"
                : mode === "register"
                ? "Create Account"
                : mode === "forgot"
                ? "Forgot Password"
                : "Reset Password"}
            </h2>
            <button
              onClick={() =>
                resetTokenMatch
                  ? (window.location.href = "/")
                  : dispatch(toggleAuthPopup())
              }
              className="p-2 hover:bg-secondary rounded-lg"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            )}

            {mode !== "reset" && (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            )}

            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full pl-10 pr-10 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            )}

            {mode === "reset" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full pl-10 pr-10 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || isSigningUp || isRequestingForToken}
              className="w-full py-3 gradient-primary text-primary-foreground rounded-lg font-semibold hover:glow-on-hover animate-smooth disabled:opacity-50"
            >
              {isLoggingIn || isSigningUp || isRequestingForToken
                ? "Please wait..."
                : mode === "login"
                ? "Sign In"
                : mode === "register"
                ? "Sign Up"
                : mode === "forgot"
                ? "Send Reset Link"
                : "Reset Password"}
            </button>
          </form>

          {mode !== "reset" && (
            <div className="mt-4 text-center text-sm text-muted-foreground space-y-2">
              {mode === "login" && (
                <>
                  <button
                    onClick={() => setMode("forgot")}
                    className="text-primary hover:underline block mx-auto"
                  >
                    Forgot Password?
                  </button>
                  <p>
                    Don't have an account?{" "}
                    <button
                      onClick={() => setMode("register")}
                      className="text-primary hover:underline"
                    >
                      Sign Up
                    </button>
                  </p>
                </>
              )}
              {mode === "register" && (
                <p>
                  Already have an account?{" "}
                  <button
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              )}
              {mode === "forgot" && (
                <button
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline"
                >
                  Back to Login
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LoginModal;
