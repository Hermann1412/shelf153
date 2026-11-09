import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { categories } from "../../data/products";

const CategoryGrid = () => {
  const { t } = useTranslation();
  return (
    <section className="section">
      <div className="mb-5">
        <h2 className="section-title">{t("home.categoryTitle")}</h2>
        <p className="section-subtitle">{t("home.categorySubtitle")}</p>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/products?category=${encodeURIComponent(category.name)}`}
            className="group flex flex-col items-center text-center"
          >
            <span className="w-full aspect-square overflow-hidden rounded-xl sm:rounded-2xl bg-secondary border border-border group-hover:border-primary/50 transition-colors">
              <img
                src={category.image}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </span>
            <span className="mt-2 text-xs sm:text-sm font-medium text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {t(`categories.${category.key}`)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
