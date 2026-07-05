import { Menu, User, ShoppingCart, Sun, Moon, Search } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
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
  const { authUser } = useSelector((state) => state.auth);
  const { cart } = useSelector((state) => state.cart);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[hsla(var(--glass-border))]">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <Link
            to="/"
            className="text-2xl font-bold gradient-primary bg-clip-text text-transparent"
          >
            Shelf153
          </Link>
        </div>

        <div className="hidden lg:flex items-center gap-6">
          <Link
            to="/"
            className="text-foreground hover:text-primary transition-colors"
          >
            Home
          </Link>
          <Link
            to="/products"
            className="text-foreground hover:text-primary transition-colors"
          >
            Products
          </Link>
          <Link
            to="/orders"
            className="text-foreground hover:text-primary transition-colors"
          >
            Orders
          </Link>
          <Link
            to="/about"
            className="text-foreground hover:text-primary transition-colors"
          >
            About
          </Link>
          <Link
            to="/contact"
            className="text-foreground hover:text-primary transition-colors"
          >
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(toggleSearchBar())}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <Search className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-foreground" />
            ) : (
              <Moon className="w-5 h-5 text-foreground" />
            )}
          </button>
          <button
            onClick={() => dispatch(toggleCart())}
            className="relative p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
          {authUser ? (
            <button
              onClick={() => dispatch(toggleProfilePanel())}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
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
            </button>
          ) : (
            <button
              onClick={() => dispatch(toggleAuthPopup())}
              className="px-4 py-2 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:glow-on-hover animate-smooth"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
