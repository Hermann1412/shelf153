import React from "react";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import HeroSlider from "../components/Home/HeroSlider";
import DealsStrip from "../components/Home/DealsStrip";
import CategoryGrid from "../components/Home/CategoryGrid";
import ProductSlider from "../components/Home/ProductSlider";
import FeatureSection from "../components/Home/FeatureSection";
import NewsletterSection from "../components/Home/NewsletterSection";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();
  const { topRatedProducts, newProducts } = useSelector(
    (state) => state.product
  );
  return (
    <div className="min-h-screen">
      <HeroSlider />
      <div className="container mx-auto px-4 pt-8">
        <DealsStrip />
        <CategoryGrid />

        {/* Big, obvious next step for anyone unsure where to click */}
        <div className="mp-card p-6 my-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 shrink-0 gradient-primary rounded-full flex items-center justify-center">
              <ShoppingBag className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {t("home.browseAllTitle")}
              </h2>
              <p className="text-base text-muted-foreground">
                {t("home.browseAllSubtitle")}
              </p>
            </div>
          </div>
          <Link
            to="/products"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 gradient-primary text-primary-foreground rounded-lg font-semibold text-base hover:glow-on-hover animate-smooth shrink-0"
          >
            {t("home.browseAllProducts")}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {newProducts.length > 0 && (
          <ProductSlider title={t('home.newArrivals')} products={newProducts} />
        )}
        {topRatedProducts.length > 0 && (
          <ProductSlider
            title={t('home.topRated')}
            products={topRatedProducts}
          />
        )}
        <FeatureSection />
        <NewsletterSection />
      </div>
    </div>
  );
};

export default Index;
