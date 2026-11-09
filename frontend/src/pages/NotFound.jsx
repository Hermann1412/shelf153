import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const { t } = useTranslation();
  return (
    <div className="page min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <p className="text-sm font-bold tracking-widest text-primary">{t("notFound.title")}</p>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-foreground">{t("notFound.heading")}</h1>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground">{t("notFound.message")}</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary btn-lg">
            <Home className="w-4 h-4" />
            {t("notFound.goHome")}
          </Link>
          <button onClick={() => window.history.back()} className="btn-outline btn-lg">
            <ArrowLeft className="w-4 h-4" />
            {t("notFound.goBack")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
