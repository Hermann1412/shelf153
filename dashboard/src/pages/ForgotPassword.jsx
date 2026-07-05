import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { forgotPassword } from "../store/slices/authSlice";
import { LoaderCircle } from "lucide-react";

const ForgotPassword = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, user } = useSelector(
    (state) => state.auth
  );
  const [email, setEmail] = useState("");

  if (isAuthenticated && user?.role === "Admin") {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(forgotPassword(email));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Forgot Password
        </h1>
        <p className="text-center text-gray-500 mb-6 text-sm">
          Enter your email to receive a reset link
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoaderCircle className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link to="/login" className="text-blue-600 hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
