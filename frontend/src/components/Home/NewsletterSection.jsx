import { useState } from "react";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

const NewsletterSection = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");

  return (
    <section className="section">
      <div className="surface px-5 py-8 sm:px-10 sm:py-10 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
        <div className="flex items-start gap-4 lg:flex-1">
          <span className="w-12 h-12 shrink-0 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
            <Mail className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t("home.newsletter.title")}</h2>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground max-w-lg">{t("home.newsletter.text")}</p>
          </div>
        </div>

        {/* Not connected to a mailing service yet: keep the page from reloading on submit. */}
        <form onSubmit={(e) => e.preventDefault()} className="w-full lg:w-auto lg:min-w-[26rem]">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder={t("home.newsletter.placeholder")}
              aria-label={t("home.newsletter.placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field flex-1"
              required
            />
            <button type="submit" className="btn-primary h-11 px-6">
              {t("home.newsletter.button")}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("home.newsletter.privacy")}</p>
        </form>
      </div>
    </section>
  );
};

export default NewsletterSection;
