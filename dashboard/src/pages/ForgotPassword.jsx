import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { forgotPassword } from "../store/slices/authSlice";
import { LoaderCircle } from "lucide-react";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isAuthenticated, loading, user } = useSelector(
    (state) => state.auth
  );
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  if (isAuthenticated && user?.role === "Admin") {
    return <Navigate to="/" replace />;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return setError(t("validation.required"));
    if (!emailRegex.test(email)) return setError(t("validation.emailInvalid"));
    setError("");
    dispatch(forgotPassword(email));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {t("forgotPassword.title")}
        </h1>
        <p className="text-center text-gray-500 mb-6 text-sm">
          {t("forgotPassword.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("forgotPassword.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                error ? "border-red-400 focus:ring-red-400" : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder={t("forgotPassword.emailPlaceholder")}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoaderCircle className="w-5 h-5 animate-spin" />
                {t("forgotPassword.sending")}
              </>
            ) : (
              t("forgotPassword.sendResetLink")
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link to="/login" className="text-green-600 hover:underline">
            {t("forgotPassword.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
