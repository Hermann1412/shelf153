import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import { categoryLabel } from "../../data/products";

// Each tile shows a real product photo from that category.
const CategoryGrid = () => {
  const { t } = useTranslation();
  const { categories } = useSelector((state) => state.product);

  if (categories.length === 0) return null;

  return (
    <section className="section">
      <div className="mb-5">
        <h2 className="section-title">{t("home.categoryTitle")}</h2>
        <p className="section-subtitle">{t("home.categorySubtitle")}</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
        {categories.map((category) => (
          <Link
            key={category.name}
            to={`/products?category=${encodeURIComponent(category.name)}`}
            className="group flex flex-col items-center text-center"
          >
            <span className="w-full aspect-square overflow-hidden rounded-xl sm:rounded-2xl bg-secondary border border-border group-hover:border-primary/50 transition-colors flex items-center justify-center">
              {category.image ? (
                <img
                  src={category.image}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <Package className="w-8 h-8 text-muted-foreground" />
              )}
            </span>
            <span className="mt-2 text-xs sm:text-sm font-medium text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {categoryLabel(category.name, t)}
            </span>
            <span className="text-[0.6875rem] text-muted-foreground">
              {t("home.categoryCount", { count: category.count, defaultValue: "{{count}} produits" })}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
