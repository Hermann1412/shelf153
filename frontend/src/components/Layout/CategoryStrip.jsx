import { NavLink, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { categoryLabel } from "../../data/products";

const CategoryStrip = () => {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  // Only categories that have products on sale (loaded once in App).
  const { categories } = useSelector((state) => state.product);
  const activeCategory = pathname === "/products" ? new URLSearchParams(search).get("category") : null;

  const itemClass = (active) =>
    `shrink-0 px-3 h-10 inline-flex items-center text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
      active
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <nav className="border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 flex items-center">
        <div className="flex-1 min-w-0 flex items-center overflow-x-auto scrollbar-hide -ml-3">
          <NavLink to="/products" end className={() => itemClass(pathname === "/products" && !activeCategory)}>
            {t("nav.allProducts")}
          </NavLink>
          {categories.map((category) => (
            <NavLink
              key={category.name}
              to={`/products?category=${encodeURIComponent(category.name)}`}
              className={() => itemClass(activeCategory === category.name)}
            >
              {categoryLabel(category.name, t)}
            </NavLink>
          ))}
        </div>
        <div className="hidden lg:flex items-center shrink-0 pl-4 ml-2 border-l border-border">
          {[
            { to: "/orders", label: t("nav.orders") },
            { to: "/about", label: t("nav.about") },
            { to: "/contact", label: t("nav.contact") },
          ].map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => itemClass(isActive)}>
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default CategoryStrip;
