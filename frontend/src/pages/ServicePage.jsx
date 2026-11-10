import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader } from "lucide-react";
import { axiosInstance } from "../lib/axios";

// Customer-service page (shipping, returns) whose text the main admin writes in dashboard Settings.
const ServicePage = ({ field, titleKey, titleDefault }) => {
  const { t } = useTranslation();
  const [text, setText] = useState(undefined);

  useEffect(() => {
    axiosInstance
      .get("/settings")
      .then(({ data }) => setText(data.settings?.[field] || null))
      .catch(() => setText(null));
  }, [field]);

  return (
    <div className="page max-w-3xl">
      <h1 className="page-title">{t(titleKey, titleDefault)}</h1>
      {text === undefined ? (
        <div className="py-20 flex justify-center">
          <Loader className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : text ? (
        <div className="mt-6 surface p-6 sm:p-8 text-sm sm:text-base leading-relaxed text-foreground/90 whitespace-pre-line">
          {text}
        </div>
      ) : (
        <div className="mt-6 surface p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("service.notAvailable", "Cette information n'est pas encore disponible.")}</p>
          <Link to="/contact" className="btn-outline mt-5">{t("nav.contact")}</Link>
        </div>
      )}
    </div>
  );
};

export default ServicePage;
