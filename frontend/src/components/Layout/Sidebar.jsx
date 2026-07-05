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
import { toggleSidebar } from "../../store/slices/popupSlice";

const Sidebar = () => {
  const dispatch = useDispatch();
  const { isSidebarOpen } = useSelector((state) => state.popup);

  const links = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/products", icon: Package, label: "Products" },
    { to: "/cart", icon: ShoppingCart, label: "Cart" },
    { to: "/orders", icon: List, label: "Orders" },
    { to: "/about", icon: Info, label: "About" },
    { to: "/faq", icon: HelpCircle, label: "FAQ" },
    { to: "/contact", icon: Phone, label: "Contact" },
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
          <h2 className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
            Shelf153
          </h2>
          <button
            onClick={() => dispatch(toggleSidebar())}
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
      </div>
    </>
  );
};

export default Sidebar;
