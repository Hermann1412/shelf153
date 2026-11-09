import { useState, useEffect } from "react";
import { X, Mail, Lock, User, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { ShelfMark } from "./Logo";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
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
  const resetToken = location.pathname.match(/\/password\/reset\/(.+)/)?.[1];

  useEffect(() => {
    if (resetToken) {
      setMode("reset");
    }
  }, [resetToken]);

  useEffect(() => {
    setErrors({});
  }, [mode]);

  useEffect(() => {
    if (authUser && isAuthPopupOpen) {
      dispatch(toggleAuthPopup());
    }
  }, [authUser, dispatch, isAuthPopupOpen]);

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
      else if (formData.password.length < 8 || formData.password.length > 64) {
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
      dispatch(forgotPassword({ email: formData.email }));
    } else if (mode === "reset" && resetToken) {
      dispatch(
        resetPassword({
          token: resetToken,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        })
      );
    }
  };

  if (!isAuthPopupOpen && !resetToken) return null;

  const close = () => (resetToken ? (window.location.href = "/") : dispatch(toggleAuthPopup()));
  const busy = isLoggingIn || isSigningUp || isRequestingForToken;
  const title = mode === "login"
    ? t("auth.welcomeBack")
    : mode === "register"
    ? t("auth.createAccount")
    : mode === "forgot"
    ? t("auth.forgotPassword")
    : t("auth.resetPassword");

  const inputClass = (hasError) =>
    `field h-12 pl-10 ${hasError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`;

  const fieldError = (key) =>
    errors[key] && <p className="mt-1.5 text-xs text-destructive">{errors[key]}</p>;

  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto animate-fade-in-up" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="min-h-full grid lg:grid-cols-2">
        {/* Brand panel: Shelf153 logo in the middle */}
        <aside className="relative overflow-hidden bg-gradient-to-br from-green-800 via-green-700 to-emerald-600 text-white px-6 py-10 sm:py-14 flex flex-col items-center justify-center text-center">
          <span className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/5" aria-hidden="true" />
          <span className="absolute -left-20 -bottom-24 w-72 h-72 rounded-full bg-white/5" aria-hidden="true" />
          <div className="relative flex flex-col items-center">
            <span className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white text-green-700 flex items-center justify-center shadow-lg">
              <ShelfMark className="w-11 h-11 sm:w-14 sm:h-14" />
            </span>
            <p className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Shelf<span className="text-green-200">153</span>
            </p>
            <p className="mt-3 max-w-sm text-sm sm:text-base text-green-50/90">
              {t("auth.brandText", "Votre boutique en ligne à Lubumbashi, Kipushi, Likasi et Kolwezi.")}
            </p>
          </div>
          <p className="relative mt-8 hidden lg:flex items-center gap-2 text-sm text-green-100/80">
            <ShieldCheck className="w-4 h-4" />
            {t("auth.secureNote", "Connexion sécurisée · vos identifiants ne sont jamais partagés")}
          </p>
        </aside>

        {/* Form panel */}
        <div className="relative flex items-center justify-center px-4 py-10 sm:px-8">
          <button
            onClick={close}
            aria-label={t("aria.close")}
            className="icon-btn absolute top-4 right-4"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-full max-w-sm">
            {location.pathname === "/payment" && (mode === "login" || mode === "register") && (
              <p className="mb-5 rounded-lg bg-accent text-accent-foreground px-3.5 py-2.5 text-sm font-medium">
                {t("auth.checkoutNotice", "Connectez-vous ou créez un compte pour finaliser votre commande. Votre panier est conservé.")}
              </p>
            )}
            <h2 id="auth-title" className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "register"
                ? t("auth.registerSubtitle", "Créez votre compte en quelques secondes.")
                : mode === "forgot"
                ? t("auth.forgotSubtitle", "Recevez un lien pour choisir un nouveau mot de passe.")
                : mode === "reset"
                ? t("auth.resetSubtitle", "Choisissez votre nouveau mot de passe.")
                : t("auth.loginSubtitle", "Connectez-vous pour suivre vos commandes et payer plus vite.")}
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
              {mode === "register" && (
                <div>
                  <label htmlFor="auth-name" className="field-label">{t("auth.fullName")}</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      aria-invalid={Boolean(errors.name)}
                      className={inputClass(errors.name)}
                    />
                  </div>
                  {fieldError("name")}
                </div>
              )}

              {mode !== "reset" && (
                <div>
                  <label htmlFor="auth-email" className="field-label">{t("auth.email")}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      aria-invalid={Boolean(errors.email)}
                      className={inputClass(errors.email)}
                    />
                  </div>
                  {fieldError("email")}
                </div>
              )}

              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="auth-password" className="field-label">{t("auth.password")}</label>
                    {mode === "login" && (
                      <button type="button" onClick={() => setMode("forgot")} className="mb-1.5 text-xs font-medium text-primary hover:underline">
                        {t("auth.forgotPasswordLink")}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      aria-invalid={Boolean(errors.password)}
                      className={`${inputClass(errors.password)} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t("auth.hidePassword", "Masquer le mot de passe") : t("auth.showPassword", "Afficher le mot de passe")}
                      aria-pressed={showPassword}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldError("password")}
                </div>
              )}

              {mode === "reset" && (
                <div>
                  <label htmlFor="auth-confirm" className="field-label">{t("auth.confirmPassword")}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="auth-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      aria-invalid={Boolean(errors.confirmPassword)}
                      className={`${inputClass(errors.confirmPassword)} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? t("auth.hidePassword", "Masquer le mot de passe") : t("auth.showPassword", "Afficher le mot de passe")}
                      aria-pressed={showConfirmPassword}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldError("confirmPassword")}
                </div>
              )}

              <button type="submit" disabled={busy} className="btn-primary btn-lg w-full mt-2">
                {busy
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
              <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
                {mode === "login" && (
                  <p>
                    {t("auth.noAccount")}{" "}
                    <button onClick={() => setMode("register")} className="font-semibold text-primary hover:underline">
                      {t("auth.signUp")}
                    </button>
                  </p>
                )}
                {mode === "register" && (
                  <p>
                    {t("auth.haveAccount")}{" "}
                    <button onClick={() => setMode("login")} className="font-semibold text-primary hover:underline">
                      {t("auth.signIn")}
                    </button>
                  </p>
                )}
                {mode === "forgot" && (
                  <button onClick={() => setMode("login")} className="font-semibold text-primary hover:underline">
                    {t("auth.backToLogin")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
