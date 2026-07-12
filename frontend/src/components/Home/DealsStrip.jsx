import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { categories } from "../../data/products";

const DealsStrip = () => {
  const { t } = useTranslation();
  const deals = categories.slice(0, 6);

  return (
    <section className="py-6">
      <h2 className="text-xl font-bold text-foreground mb-4">
        {t("home.dealsTitle")}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {deals.map((deal) => (
          <Link
            key={deal.id}
            to={`/products?category=${encodeURIComponent(deal.name)}`}
            className="group mp-card mp-card-hover overflow-hidden"
          >
            <div className="relative">
              <img
                src={deal.image}
                alt={deal.name}
                className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="mp-badge-deal absolute top-2 left-2 text-sm">
                {t("home.dealsBadge")}
              </span>
            </div>
            <p className="px-3 py-3 text-sm font-semibold text-foreground truncate">
              {deal.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default DealsStrip;
