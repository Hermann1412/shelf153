import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login } from "../store/slices/authSlice";
import { setViewingStore } from "../store/slices/extraSlice";
import { axiosInstance } from "../lib/axios";
import Logo from "../components/Logo";
import { LoaderCircle, Eye, EyeOff, Store, ShieldCheck } from "lucide-react";

// Used at /login (Shelf153) and at /boutique/:slug (a store's own login link, branded with
// the store's name and logo). Admins and sellers share it; each lands in their own space.
const Login = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { slug } = useParams();
  const { isAuthenticated, loading, user } = useSelector((state) => state.auth);
  const viewingStoreId = useSelector((state) => state.extra.viewingStore?.id);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [store, setStore] = useState(null);
  const [storeStatus, setStoreStatus] = useState(slug ? "loading" : "none");

  useEffect(() => {
    if (!slug) return;
    let active = true;
    axiosInstance
      .get(`/seller/public/${encodeURIComponent(slug)}`)
      .then(({ data }) => {
        if (!active) return;
        setStore(data.store);
        setStoreStatus("found");
      })
      .catch(() => active && setStoreStatus("missing"));
    return () => {
      active = false;
    };
  }, [slug]);

  const signedIn = isAuthenticated && ["Admin", "Seller", "User"].includes(user?.role);

  // The main admin arriving through a store's link opens that store's space directly.
  useEffect(() => {
    if (signedIn && user?.role === "Admin" && store) dispatch(setViewingStore(store));
  }, [signedIn, user?.role, store, dispatch]);

  // An admin waits until the store (if any) is known and open, so they land in the right space.
  const adminWaiting = user?.role === "Admin"
    && (storeStatus === "loading" || (storeStatus === "found" && viewingStoreId !== store?.id));
  if (signedIn && !adminWaiting) {
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

  const fieldClass = (hasError) =>
    `w-full h-11 px-3.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent ${
      hasError ? "border-red-400 focus:ring-red-400" : "border-gray-300 focus:ring-green-500"
    }`;

  const storeBadge = store?.store_logo?.url ? (
    <img src={store.store_logo.url} alt="" className="w-16 h-16 rounded-2xl object-cover bg-white ring-4 ring-white/20" />
  ) : (
    <span className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
      <Store className="w-8 h-8 text-white" />
    </span>
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50">
      {/* Brand panel */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-green-800 via-green-700 to-emerald-600 text-white px-6 py-10 sm:px-12 lg:px-16 lg:py-14 flex flex-col">
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/5" aria-hidden="true" />
        <div className="absolute -left-20 bottom-[-6rem] w-72 h-72 rounded-full bg-white/5" aria-hidden="true" />

        <Logo size="md" light className="relative" />

        <div className="relative mt-10 lg:mt-auto lg:mb-auto max-w-md">
          {storeStatus === "found" ? (
            <>
              {storeBadge}
              <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-green-100">
                {t("login.storeSpace", "Espace vendeur")}
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">{store.store_name}</h1>
              <p className="mt-3 text-green-50/90">
                {t("login.storeIntro", "Gérez vos produits, vos commandes et vos paiements sur Shelf153.")}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-wider text-green-100">
                {t("login.proSpace", "Espace professionnel")}
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">
                {t("login.welcome", "Bienvenue sur Shelf153")}
              </h1>
              <p className="mt-3 text-green-50/90">
                {t("login.intro", "Administration de la marketplace et espace des vendeurs.")}
              </p>
            </>
          )}
        </div>

        <p className="relative mt-10 lg:mt-0 hidden lg:flex items-center gap-2 text-sm text-green-100/80">
          <ShieldCheck className="w-4 h-4" />
          {t("login.secureNote", "Connexion sécurisée · vos identifiants ne sont jamais partagés")}
        </p>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          {storeStatus === "missing" && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t("login.storeMissing", "Cette boutique n'existe pas ou n'est pas encore ouverte. Vous pouvez quand même vous connecter.")}
            </div>
          )}
          <h2 className="text-2xl font-bold text-gray-900">{t("login.title", "Connexion")}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {storeStatus === "found"
              ? t("login.storeSubtitle", { store: store.store_name, defaultValue: "Connectez-vous pour gérer {{store}}." })
              : t("login.formSubtitle", "Entrez vos identifiants pour continuer.")}
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("login.email")}
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                className={fieldClass(errors.email)}
                placeholder={t("login.emailPlaceholder")}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1.5">{errors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                  {t("login.password")}
                </label>
                <Link to="/password/forgot" className="text-xs font-medium text-green-700 hover:underline">
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  className={`${fieldClass(errors.password)} pr-11`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t("login.hidePassword", "Masquer le mot de passe") : t("login.showPassword", "Afficher le mot de passe")}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1.5">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
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

          {storeStatus === "found" && (
            <p className="mt-8 text-center text-xs text-gray-400">
              {t("login.poweredBy", "Propulsé par Shelf153")}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Login;
