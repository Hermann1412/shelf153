import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Store, UserPlus, ClipboardCheck, PackagePlus, Wallet, ArrowRight } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { toggleAuthPopup } from "../store/slices/popupSlice";

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5174";

const Sell = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { authUser } = useSelector((state) => state.auth);
  const [commission, setCommission] = useState(null);

  // The rate shown is the one the backend applies (PLATFORM_COMMISSION_RATE).
  useEffect(() => {
    axiosInstance
      .get("/settings")
      .then(({ data }) => {
        const rate = Number(data.platform_commission_rate);
        if (Number.isFinite(rate)) setCommission(Math.round(rate * 1000) / 10);
      })
      .catch(() => {});
  }, []);

  const steps = [
    { icon: UserPlus, title: t("sell.step1Title"), text: t("sell.step1Text") },
    { icon: Store, title: t("sell.step2Title"), text: t("sell.step2Text") },
    { icon: ClipboardCheck, title: t("sell.step3Title"), text: t("sell.step3Text") },
    { icon: PackagePlus, title: t("sell.step4Title"), text: t("sell.step4Text") },
  ];

  const conditions = [
    commission !== null ? t("sell.conditionCommission", { rate: commission }) : null,
    t("sell.conditionPayout"),
    t("sell.conditionManage"),
    t("sell.conditionRules"),
  ].filter(Boolean);

  const cta = authUser ? (
    <a href={DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className="btn btn-lg bg-card text-foreground hover:bg-card/90">
      {authUser.role === "Seller" ? t("sell.ctaManage") : t("sell.ctaApply")}
      <ArrowRight className="w-4 h-4" />
    </a>
  ) : (
    <button onClick={() => dispatch(toggleAuthPopup())} className="btn btn-lg bg-card text-foreground hover:bg-card/90">
      {t("sell.ctaSignup")}
      <ArrowRight className="w-4 h-4" />
    </button>
  );

  return (
    <div className="page max-w-5xl">
      <section className="rounded-2xl bg-primary text-primary-foreground px-6 py-10 sm:px-10 sm:py-12">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider opacity-80">{t("sell.eyebrow")}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">{t("sell.title")}</h1>
        <p className="mt-3 text-sm sm:text-base opacity-90 max-w-xl">{t("sell.subtitle")}</p>
        <div className="mt-6">{cta}</div>
      </section>

      <section className="section">
        <h2 className="section-title">{t("sell.howTitle")}</h2>
        <ol className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <li key={step.title} className="surface p-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                  <step.icon className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="surface p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </span>
          <h2 className="section-title">{t("sell.conditionsTitle")}</h2>
        </div>
        <ul className="mt-5 space-y-3">
          {conditions.map((condition) => (
            <li key={condition} className="flex gap-3 text-sm leading-relaxed text-foreground/90">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {condition}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default Sell;
