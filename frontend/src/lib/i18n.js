import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "../locales/en.json";
import fr from "../locales/fr.json";
import sw from "../locales/sw.json";
import ln from "../locales/ln.json";
import lu from "../locales/lu.json";
import kg from "../locales/kg.json";
import kas from "../locales/kas.json";

export const languages = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "sw", label: "Kiswahili" },
  { code: "ln", label: "Lingála" },
  { code: "lu", label: "Tshiluba" },
  { code: "kg", label: "Kikongo" },
  { code: "kas", label: "Kasaï" },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      sw: { translation: sw },
      ln: { translation: ln },
      lu: { translation: lu },
      kg: { translation: kg },
      kas: { translation: kas },
    },
    fallbackLng: "fr",
    supportedLngs: ["en", "fr", "sw", "ln", "lu", "kg", "kas"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "shelf153_language",
    },
  });

export default i18n;
