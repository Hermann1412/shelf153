import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPassword } from "../store/slices/authSlice";
import { LoaderCircle, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { token } = useParams();
  const { isAuthenticated, loading, user } = useSelector(
    (state) => state.auth
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  if (isAuthenticated && user?.role === "Admin") {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!password) next.password = t("validation.required");
    else if (password.length < 8 || password.length > 16) next.password = t("validation.passwordLength");
    if (!confirmPassword) next.confirmPassword = t("validation.required");
    else if (password !== confirmPassword) next.confirmPassword = t("validation.passwordMismatch");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    dispatch(resetPassword({ token, password, confirmPassword }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {t("resetPassword.title")}
        </h1>
        <p className="text-center text-gray-500 mb-6 text-sm">
          {t("resetPassword.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("resetPassword.newPassword")}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("resetPassword.confirmPassword")}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  errors.confirmPassword ? "border-red-400 focus:ring-red-400" : "border-gray-300 focus:ring-green-500"
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoaderCircle className="w-5 h-5 animate-spin" />
                {t("resetPassword.resetting")}
              </>
            ) : (
              t("resetPassword.resetPassword")
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
