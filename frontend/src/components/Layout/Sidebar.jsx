import {
  X,
  Home,
  Package,
  Info,
  HelpCircle,
  ShoppingCart,
  List,
  Phone,
  Sun,
  Moon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toggleSidebar } from "../../store/slices/popupSlice";
import { useTheme } from "../../contexts/theme-context";
import LanguageSwitcher from "./LanguageSwitcher";
import Logo from "./Logo";

const Sidebar = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { isSidebarOpen } = useSelector((state) => state.popup);

  const links = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/products", icon: Package, label: t("nav.products") },
    { to: "/cart", icon: ShoppingCart, label: t("nav.cart") },
    { to: "/orders", icon: List, label: t("nav.orders") },
    { to: "/about", icon: Info, label: t("nav.about") },
    { to: "/faq", icon: HelpCircle, label: t("nav.faq") },
    { to: "/contact", icon: Phone, label: t("nav.contact") },
  ];

  if (!isSidebarOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50 lg:hidden"
        onClick={() => dispatch(toggleSidebar())}
      />
      <aside className="fixed top-0 left-0 h-full w-[18rem] max-w-[85vw] bg-card border-r border-border z-50 flex flex-col lg:hidden animate-slide-in-left">
        <div className="h-16 px-4 flex items-center justify-between border-b border-border">
          <Logo textClassName="text-lg" />
          <button
            onClick={() => dispatch(toggleSidebar())}
            aria-label={t("aria.close")}
            className="icon-btn -mr-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => dispatch(toggleSidebar())}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 h-11 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-secondary"
                }`
              }
            >
              <link.icon className="w-5 h-5 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border flex items-center justify-between gap-2">
          <LanguageSwitcher placement="top" />
          <button onClick={toggleTheme} aria-label={t("aria.toggleTheme")} className="icon-btn">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
