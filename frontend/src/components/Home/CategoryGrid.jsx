import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { categories } from "../../data/products";
const CategoryGrid = () => {
  const { t } = useTranslation();
  return (
    <section className="py-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          {t('home.categoryTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('home.categorySubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/products?category=${category.name}`}
            className="group mp-card mp-card-hover p-4 text-center"
          >
            <div className="relative overflow-hidden rounded-lg mb-3">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-20 object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {t(`categories.${category.key}`)}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
