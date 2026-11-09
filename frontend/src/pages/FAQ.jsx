import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

const FAQ = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [1, 2, 3, 4].map((n) => ({ question: t(`faq.q${n}`), answer: t(`faq.a${n}`) }));

  return (
    <div className="page max-w-3xl">
      <h1 className="page-title">{t("faq.title")}</h1>
      <p className="page-subtitle">{t("faq.subtitle")}</p>

      <div className="mt-8 surface divide-y divide-border">
        {faqs.map((faq, index) => {
          const open = openIndex === index;
          return (
            <div key={faq.question}>
              <button
                onClick={() => setOpenIndex(open ? -1 : index)}
                aria-expanded={open}
                aria-controls={`faq-${index}`}
                className="w-full px-5 py-4 sm:px-6 text-left flex items-center justify-between gap-4 hover:bg-secondary/60 transition-colors first:rounded-t-xl"
              >
                <h2 className="text-sm sm:text-base font-semibold text-foreground">{faq.question}</h2>
                <ChevronDown className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <p id={`faq-${index}`} className="px-5 sm:px-6 pb-5 -mt-1 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {t("faq.moreQuestions")}{" "}
        <Link to="/contact" className="font-medium text-primary hover:underline">
          {t("nav.contact")}
        </Link>
      </p>
    </div>
  );
};

export default FAQ;
