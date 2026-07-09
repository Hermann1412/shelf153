import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

const NewsletterSection = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");

  return (
    <section className="py-16">
      <div className="glass-panel text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-16 h-16 mx-auto mb-6 gradient-primary rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary-foreground" />
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t('home.newsletter.title')}
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            {t('home.newsletter.text')}
          </p>

          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                placeholder={t('home.newsletter.placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground"
                required
              />
            </div>
            <button
              type="submit"
              className="px-8 py-4 gradient-primary text-primary-foreground rounded-lg hover:glow-on-hover animate-smooth font-semibold flex items-center justify-center space-x-2"
            >
              <Send className="w-5 h-5" />
              <span>{t('home.newsletter.button')}</span>
            </button>
          </form>

          <p className="text-sm text-muted-foreground mt-4">
            {t('home.newsletter.privacy')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
