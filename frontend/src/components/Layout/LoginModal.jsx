import { useState, useEffect } from "react";
import { X, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toggleAuthPopup } from "../../store/slices/popupSlice";
import {
  login,
  register,
  forgotPassword,
  resetPassword,
} from "../../store/slices/authSlice";

const LoginModal = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
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
    setErrors({});
  }, [mode]);

  useEffect(() => {
    if (authUser && isAuthPopupOpen) {
      dispatch(toggleAuthPopup());
    }
  }, [authUser]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    const next = {};
    if (mode !== "reset") {
      if (!formData.email.trim()) next.email = t("validation.required");
      else if (!emailRegex.test(formData.email)) next.email = t("validation.emailInvalid");
    }
    if (mode === "register" && !formData.name.trim()) {
      next.name = t("validation.required");
    }
    if (mode !== "forgot") {
      if (!formData.password) next.password = t("validation.required");
      else if (formData.password.length < 8 || formData.password.length > 16) {
        next.password = t("validation.passwordLength");
      }
    }
    if (mode === "reset") {
      if (!formData.confirmPassword) next.confirmPassword = t("validation.required");
      else if (formData.password !== formData.confirmPassword) {
        next.confirmPassword = t("validation.passwordMismatch");
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
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
                ? t("auth.welcomeBack")
                : mode === "register"
                ? t("auth.createAccount")
                : mode === "forgot"
                ? t("auth.forgotPassword")
                : t("auth.resetPassword")}
            </h2>
            <button
              onClick={() =>
                resetTokenMatch
                  ? (window.location.href = "/")
                  : dispatch(toggleAuthPopup())
              }
              aria-label={t("aria.close")}
              className="p-2 hover:bg-secondary rounded-lg"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t("auth.fullName")}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full pl-10 pr-4 py-3 bg-secondary border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 ${
                      errors.name ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-destructive mt-1 ml-1">{errors.name}</p>
                )}
              </div>
            )}

            {mode !== "reset" && (
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder={t("auth.email")}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={`w-full pl-10 pr-4 py-3 bg-secondary border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 ${
                      errors.email ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive mt-1 ml-1">{errors.email}</p>
                )}
              </div>
            )}

            {mode !== "forgot" && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.password")}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className={`w-full pl-10 pr-10 py-3 bg-secondary border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 ${
                      errors.password ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
                    }`}
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
                {errors.password && (
                  <p className="text-xs text-destructive mt-1 ml-1">{errors.password}</p>
                )}
              </div>
            )}

            {mode === "reset" && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("auth.confirmPassword")}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className={`w-full pl-10 pr-10 py-3 bg-secondary border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 ${
                      errors.confirmPassword ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
                    }`}
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
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive mt-1 ml-1">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || isSigningUp || isRequestingForToken}
              className="w-full py-3 gradient-primary text-primary-foreground rounded-lg font-semibold hover:glow-on-hover animate-smooth disabled:opacity-50"
            >
              {isLoggingIn || isSigningUp || isRequestingForToken
                ? t("auth.pleaseWait")
                : mode === "login"
                ? t("auth.signIn")
                : mode === "register"
                ? t("auth.signUp")
                : mode === "forgot"
                ? t("auth.sendResetLink")
                : t("auth.resetPassword")}
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
                    {t("auth.forgotPasswordLink")}
                  </button>
                  <p>
                    {t("auth.noAccount")}{" "}
                    <button
                      onClick={() => setMode("register")}
                      className="text-primary hover:underline"
                    >
                      {t("auth.signUp")}
                    </button>
                  </p>
                </>
              )}
              {mode === "register" && (
                <p>
                  {t("auth.haveAccount")}{" "}
                  <button
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline"
                  >
                    {t("auth.signIn")}
                  </button>
                </p>
              )}
              {mode === "forgot" && (
                <button
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline"
                >
                  {t("auth.backToLogin")}
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
