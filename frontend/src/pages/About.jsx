import { Users, Target, Award, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const About = () => {
  const { t } = useTranslation();
  const values = [
    {
      icon: Heart,
      title: t('about.customerFirstTitle'),
      description: t('about.customerFirstDesc')
    },
    {
      icon: Award,
      title: t('about.qualityTitle'),
      description: t('about.qualityDesc')
    },
    {
      icon: Users,
      title: t('about.communityTitle'),
      description: t('about.communityDesc')
    },
    {
      icon: Target,
      title: t('about.innovationTitle'),
      description: t('about.innovationDesc')
    }
  ];

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-6">{t('about.title')}</h1>
          <p className="text-xl text-muted-foreground">
            {t('about.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {values.map((value, index) => (
            <div key={index} className="bg-secondary rounded-xl p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <value.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{value.title}</h3>
              <p className="text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-secondary rounded-xl p-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">{t('about.storyTitle')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('about.storyText')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;