import { Users, Target, Award, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

const About = () => {
  const { t } = useTranslation();
  const values = [
    { icon: Heart, title: t("about.customerFirstTitle"), description: t("about.customerFirstDesc") },
    { icon: Award, title: t("about.qualityTitle"), description: t("about.qualityDesc") },
    { icon: Users, title: t("about.communityTitle"), description: t("about.communityDesc") },
    { icon: Target, title: t("about.innovationTitle"), description: t("about.innovationDesc") },
  ];

  return (
    <div className="page max-w-5xl">
      <div className="max-w-2xl">
        <h1 className="page-title">{t("about.title")}</h1>
        <p className="page-subtitle">{t("about.subtitle")}</p>
      </div>

      <section className="mt-8 surface p-6 sm:p-8">
        <h2 className="section-title">{t("about.storyTitle")}</h2>
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-3xl">{t("about.storyText")}</p>
      </section>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {values.map((value) => (
          <div key={value.title} className="surface p-5 flex items-start gap-4">
            <span className="w-11 h-11 shrink-0 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
              <value.icon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">{value.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{value.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default About;
