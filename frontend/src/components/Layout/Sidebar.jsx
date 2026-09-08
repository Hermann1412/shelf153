import {
  X,
  Home,
  Package,
  Info,
  HelpCircle,
  ShoppingCart,
  List,
  Phone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toggleSidebar } from "../../store/slices/popupSlice";
import LanguageSwitcher from "./LanguageSwitcher";
import Logo from "./Logo";

const Sidebar = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
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
        className="fixed inset-0 bg-black/50 z-50 lg:hidden"
        onClick={() => dispatch(toggleSidebar())}
      />
      <div className="fixed top-0 left-0 h-full w-72 bg-background border-r border-border z-50 p-6 lg:hidden">
        <div className="flex items-center justify-between mb-8">
          <Logo textClassName="text-xl" />
          <button
            onClick={() => dispatch(toggleSidebar())}
            aria-label={t("aria.close")}
            className="p-2 hover:bg-secondary rounded-lg"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>
        <nav className="space-y-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => dispatch(toggleSidebar())}
              className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <link.icon className="w-5 h-5" />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-6 pt-6 border-t border-border">
          <LanguageSwitcher />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
