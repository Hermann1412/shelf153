import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check, ChevronDown } from "lucide-react";
import { languages } from "../../lib/i18n";

const LanguageSwitcher = ({ className = "", placement = "bottom" }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const current = languages.find((l) => l.code === i18n.language) || languages[0];

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ghost px-2.5 text-muted-foreground hover:text-foreground"
        aria-label={t("aria.changeLanguage")}
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4" />
        <span>{current.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={`absolute ${placement === "top" ? "bottom-full mb-2 left-0" : "top-full mt-2 right-0"} w-48 bg-popover text-popover-foreground border border-border rounded-xl z-50 p-1 max-h-80 overflow-y-auto`}
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-sm text-left transition-colors ${
                  lang.code === current.code ? "bg-accent text-accent-foreground font-medium" : "hover:bg-secondary"
                }`}
              >
                {lang.label}
                {lang.code === current.code && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
