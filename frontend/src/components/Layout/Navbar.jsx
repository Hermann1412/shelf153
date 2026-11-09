import { useEffect, useState } from "react";
import { Menu, User, ShoppingCart, Sun, Moon, Search } from "lucide-react";
import { useTheme } from "../../contexts/theme-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import CategoryStrip from "./CategoryStrip";
import Logo from "./Logo";
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
  const [scrolled, setScrolled] = useState(false);

  // A shadow once the page moves shows where the header ends and the content begins.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  return (
    // Sticky (not fixed) so the header takes up its own space and never covers page content.
    <header
      className={`sticky top-0 z-40 bg-card border-b border-border transition-shadow duration-200 ${
        scrolled ? "shadow-[var(--shadow-md)]" : ""
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => dispatch(toggleSidebar())}
          aria-label={t("aria.menu")}
          className="icon-btn lg:hidden -ml-2"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Logo textClassName="text-xl" />

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-auto relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("aria.search")}
            className="field h-10 pl-10 pr-24 bg-secondary border-transparent focus:bg-card"
          />
          <button type="submit" className="btn-primary btn-sm absolute right-1 top-1/2 -translate-y-1/2 h-8">
            {t("aria.search")}
          </button>
        </form>

        <div className="ml-auto md:ml-0 flex items-center gap-1 shrink-0">
          <button
            onClick={() => dispatch(toggleSearchBar())}
            aria-label={t("aria.search")}
            className="icon-btn md:hidden"
          >
            <Search className="w-5 h-5" />
          </button>

          <LanguageSwitcher className="hidden lg:block" />

          <button
            onClick={toggleTheme}
            aria-label={t("aria.toggleTheme")}
            className="icon-btn hidden sm:inline-flex"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={() => dispatch(toggleCart())}
            aria-label={t("aria.cart")}
            className="btn-ghost relative px-2.5 lg:px-3 lg:gap-3"
          >
            <span className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2.5 min-w-[1.125rem] h-[1.125rem] px-1 bg-primary text-primary-foreground text-[0.6875rem] font-bold leading-none rounded-full flex items-center justify-center ring-2 ring-card">
                  {cart.length}
                </span>
              )}
            </span>
            <span className="hidden lg:inline">{t("nav.cart")}</span>
          </button>

          {authUser ? (
            <button
              onClick={() => dispatch(toggleProfilePanel())}
              aria-label={t("aria.profile")}
              className="btn-ghost px-1.5 lg:px-2.5"
            >
              {authUser.avatar?.url ? (
                <img src={authUser.avatar.url} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                  <User className="w-4 h-4" />
                </span>
              )}
              <span className="hidden lg:inline max-w-[8rem] truncate">
                {authUser.name?.split(" ")[0] || t("profile.title")}
              </span>
            </button>
          ) : (
            <>
              <button
                onClick={() => dispatch(toggleAuthPopup())}
                aria-label={t("nav.login")}
                className="icon-btn sm:hidden"
              >
                <User className="w-5 h-5" />
              </button>
              <button onClick={() => dispatch(toggleAuthPopup())} className="btn-primary hidden sm:inline-flex ml-1">
                {t("nav.login")}
              </button>
            </>
          )}
        </div>
      </div>
      <CategoryStrip />
    </header>
  );
};

export default Navbar;
