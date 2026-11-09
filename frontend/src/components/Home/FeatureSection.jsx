import { Truck, Shield, Headphones, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

// Compact trust bar shown under the hero.
const FeatureSection = () => {
  const { t } = useTranslation();
  const features = [
    { icon: Truck, title: t("home.features.shippingTitle"), description: t("home.features.shippingDesc") },
    { icon: Shield, title: t("home.features.paymentTitle"), description: t("home.features.paymentDesc") },
    { icon: Headphones, title: t("home.features.supportTitle"), description: t("home.features.supportDesc") },
    { icon: RotateCcw, title: t("home.features.returnsTitle"), description: t("home.features.returnsDesc") },
  ];

  return (
    // The 1px gap over a border-colored background draws the dividers at every breakpoint.
    <section className="mt-4 sm:mt-6 surface overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
      {features.map((feature) => (
        <div key={feature.title} className="flex items-center sm:items-start gap-2.5 sm:gap-3 p-3 sm:p-5 bg-card">
          <span className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
            <feature.icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{feature.title}</h3>
            <p className="hidden sm:block mt-0.5 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

export default FeatureSection;
