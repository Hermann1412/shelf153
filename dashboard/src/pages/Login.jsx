import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login } from "../store/slices/authSlice";
import { LoaderCircle, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isAuthenticated, loading, user } = useSelector(
    (state) => state.auth
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  if (isAuthenticated && user?.role === "Admin") {
    return <Navigate to="/" replace />;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!email.trim()) next.email = t("validation.required");
    else if (!emailRegex.test(email)) next.email = t("validation.emailInvalid");
    if (!password) next.password = t("validation.required");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    dispatch(login({ email, password }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {t("login.adminLogin")}
        </h1>
        <p className="text-center text-gray-500 mb-6 text-sm">
          {t("login.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("login.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                errors.email ? "border-red-400 focus:ring-red-400" : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder={t("login.emailPlaceholder")}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("login.password")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  errors.password ? "border-red-400 focus:ring-red-400" : "border-gray-300 focus:ring-green-500"
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoaderCircle className="w-5 h-5 animate-spin" />
                {t("login.signingIn")}
              </>
            ) : (
              t("login.signIn")
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link
            to="/password/forgot"
            className="text-green-600 hover:underline"
          >
            {t("login.forgotPassword")}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
