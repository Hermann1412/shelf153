import { Truck, Shield, Headphones, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FeatureSection = () => {
  const { t } = useTranslation();
  const features = [
    {
      icon: Truck,
      title: t('home.features.shippingTitle'),
      description: t('home.features.shippingDesc')
    },
    {
      icon: Shield,
      title: t('home.features.paymentTitle'),
      description: t('home.features.paymentDesc')
    },
    {
      icon: Headphones,
      title: t('home.features.supportTitle'),
      description: t('home.features.supportDesc')
    },
    {
      icon: CreditCard,
      title: t('home.features.returnsTitle'),
      description: t('home.features.returnsDesc')
    }
  ];

  return (
    <section className="py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((feature, index) => (
          <div key={index} className="glass-card p-6 text-center hover:glow-on-hover animate-smooth">
            <div className="w-16 h-16 mx-auto mb-4 gradient-primary rounded-full flex items-center justify-center">
              <feature.icon className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {feature.title}
            </h3>
            <p className="text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeatureSection;