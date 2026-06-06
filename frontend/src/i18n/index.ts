import ja from "./locales/ja";
import en from "./locales/en";
import fr from "./locales/fr";
import zh from "./locales/zh";
import ru from "./locales/ru";
import es from "./locales/es";
import ar from "./locales/ar";

export type Locale = "ja" | "en" | "fr" | "zh" | "ru" | "es" | "ar";

export const LOCALES: Locale[] = ["ja", "en", "fr", "zh", "ru", "es", "ar"];

export const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  fr: "Francais",
  zh: "中文",
  ru: "Русский",
  es: "Espanol",
  ar: "العربية",
};

const TRANSLATIONS: Record<Locale, typeof ja> = { ja, en, fr, zh, ru, es, ar };

export type Translations = typeof ja;

export function getTranslations(locale: Locale): Translations {
  return TRANSLATIONS[locale] ?? TRANSLATIONS.ja;
}

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "ja";
  const lang = navigator.language.split("-")[0] as Locale;
  return LOCALES.includes(lang) ? lang : "ja";
}
