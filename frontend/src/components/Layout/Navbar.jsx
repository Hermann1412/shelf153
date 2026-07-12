import { useState } from "react";
import { Menu, User, ShoppingCart, Sun, Moon, Search } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import CategoryStrip from "./CategoryStrip";
import {
  toggleAuthPopup,
  toggleSidebar,
  toggleSearchBar,
  toggleCart,
  toggleProfilePanel,
} from "../../store/slices/popupSlice";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { authUser } = useSelector((state) => state.auth);
  const { cart } = useSelector((state) => state.cart);
  const [query, setQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[hsla(var(--glass-border))]">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => dispatch(toggleSidebar())}
            aria-label={t("aria.menu")}
            className="lg:hidden p-2.5 hover:bg-secondary rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-foreground" />
          </button>
          <Link
            to="/"
            className="text-2xl font-bold gradient-primary bg-clip-text text-transparent"
          >
            Shelf153
          </Link>
        </div>

        <form
          onSubmit={handleSearch}
          className="hidden lg:flex flex-1 max-w-xl relative"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            className="w-full pl-4 pr-11 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            aria-label={t("aria.search")}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 hover:bg-secondary rounded-md transition-colors"
          >
            <Search className="w-4 h-4 text-foreground" />
          </button>
        </form>

        <div className="hidden xl:flex items-center gap-6 shrink-0">
          <Link
            to="/"
            className="text-base font-medium text-foreground hover:text-primary transition-colors py-2"
          >
            {t("nav.home")}
          </Link>
          <Link
            to="/products"
            className="text-base font-medium text-foreground hover:text-primary transition-colors py-2"
          >
            {t("nav.products")}
          </Link>
          <Link
            to="/orders"
            className="text-base font-medium text-foreground hover:text-primary transition-colors py-2"
          >
            {t("nav.orders")}
          </Link>
          <Link
            to="/about"
            className="text-base font-medium text-foreground hover:text-primary transition-colors py-2"
          >
            {t("nav.about")}
          </Link>
          <Link
            to="/contact"
            className="text-base font-medium text-foreground hover:text-primary transition-colors py-2"
          >
            {t("nav.contact")}
          </Link>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <LanguageSwitcher className="hidden md:block" />
          <button
            onClick={() => dispatch(toggleSearchBar())}
            aria-label={t("aria.search")}
            className="lg:hidden p-2.5 hover:bg-secondary rounded-lg transition-colors"
          >
            <Search className="w-6 h-6 text-foreground" />
          </button>
          <button
            onClick={toggleTheme}
            aria-label={t("aria.toggleTheme")}
            className="p-2.5 hover:bg-secondary rounded-lg transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-foreground" />
            ) : (
              <Moon className="w-5 h-5 text-foreground" />
            )}
          </button>
          <button
            onClick={() => dispatch(toggleCart())}
            aria-label={t("aria.cart")}
            className="relative flex items-center gap-2 p-2.5 hover:bg-secondary rounded-lg transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-foreground" />
            <span className="hidden md:inline text-base font-medium text-foreground">
              {t("nav.cart")}
            </span>
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
          {authUser ? (
            <button
              onClick={() => dispatch(toggleProfilePanel())}
              aria-label={t("aria.profile")}
              className="flex items-center gap-2 p-2.5 hover:bg-secondary rounded-lg transition-colors"
            >
              {authUser.avatar?.url ? (
                <img
                  src={authUser.avatar.url}
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-foreground" />
              )}
              <span className="hidden md:inline text-base font-medium text-foreground">
                {t("profile.title")}
              </span>
            </button>
          ) : (
            <button
              onClick={() => dispatch(toggleAuthPopup())}
              className="px-5 py-2.5 gradient-primary text-primary-foreground rounded-lg text-base font-semibold hover:glow-on-hover animate-smooth"
            >
              {t("nav.login")}
            </button>
          )}
        </div>
      </div>
      <CategoryStrip />
    </nav>
  );
};

export default Navbar;
