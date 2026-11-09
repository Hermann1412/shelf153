import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import HeroSlider from "../components/Home/HeroSlider";
import CategoryGrid from "../components/Home/CategoryGrid";
import ProductSlider from "../components/Home/ProductSlider";
import FeatureSection from "../components/Home/FeatureSection";
import NewsletterSection from "../components/Home/NewsletterSection";
import ProductCard from "../components/Products/ProductCard";

const Index = () => {
  const { t } = useTranslation();
  const { topRatedProducts, newProducts, products } = useSelector((state) => state.product);

  return (
    <div className="container mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-8">
      <HeroSlider />
      <FeatureSection />
      <CategoryGrid />

      {newProducts.length > 0 && (
        <ProductSlider title={t("home.newArrivals")} products={newProducts} viewAllLabel={t("home.viewAll")} />
      )}
      {topRatedProducts.length > 0 && (
        <ProductSlider title={t("home.topRated")} products={topRatedProducts} viewAllLabel={t("home.viewAll")} />
      )}

      {/* Fallback so the home page always shows real products. */}
      {newProducts.length === 0 && products.length > 0 && (
        <section className="section">
          <div className="flex items-end justify-between gap-4 mb-4">
            <h2 className="section-title">{t("home.latestProducts")}</h2>
            <Link to="/products" className="btn-ghost btn-sm text-primary hover:text-primary">
              {t("home.viewAll")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {products.slice(0, 10).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="rounded-2xl bg-primary text-primary-foreground px-6 py-8 sm:px-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">{t("home.browseAllTitle")}</h2>
            <p className="mt-1 text-sm sm:text-base opacity-90">{t("home.browseAllSubtitle")}</p>
          </div>
          <Link
            to="/products"
            className="btn btn-lg bg-card text-foreground hover:bg-card/90 shrink-0 self-start sm:self-auto"
          >
            {t("home.browseAllProducts")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <NewsletterSection />
    </div>
  );
};

export default Index;
