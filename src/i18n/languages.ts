// The languages the app is translated into. Codes and native names match HomePad and the README
// chooser (scripts/readme-languages.mjs). English is the source: its text is the translation key.
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ar", name: "العربية", rtl: true },
  { code: "bn", name: "বাংলা" },
  { code: "zh-Hans", name: "简体中文" },
  { code: "fil", name: "Filipino" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "hi", name: "हिन्दी" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "fa", name: "فارسی", rtl: true },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "ru", name: "Русский" },
  { code: "es", name: "Español" },
  { code: "te", name: "తెలుగు" },
  { code: "th", name: "ไทย" },
  { code: "tr", name: "Türkçe" },
  { code: "vi", name: "Tiếng Việt" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const isLanguageCode = (code: string): code is LanguageCode =>
  LANGUAGES.some((l) => l.code === code);

export const isRtl = (code: string): boolean =>
  LANGUAGES.some((l) => l.code === code && "rtl" in l && l.rtl);

/** The BCP 47 tag the browser's Intl APIs and the `lang` attribute should use. */
export const intlTag = (code: LanguageCode): string =>
  code === "zh-Hans" ? "zh-Hans" : code;

/**
 * Plural categories each language needs for the small whole numbers the app counts (CLDR). A
 * message that counts something gives one form per category, and always `other`. French, Spanish,
 * Italian and Portuguese also have `many`, but only for millions, so it is not used.
 */
export const PLURAL_CATEGORIES: Record<LanguageCode, readonly string[]> = {
  en: ["one", "other"],
  ar: ["zero", "one", "two", "few", "many", "other"],
  bn: ["one", "other"],
  "zh-Hans": ["other"],
  fil: ["one", "other"],
  fr: ["one", "other"],
  de: ["one", "other"],
  hi: ["one", "other"],
  id: ["other"],
  it: ["one", "other"],
  ja: ["other"],
  ko: ["other"],
  fa: ["one", "other"],
  "pt-BR": ["one", "other"],
  ru: ["one", "few", "many", "other"],
  es: ["one", "other"],
  te: ["one", "other"],
  th: ["other"],
  tr: ["one", "other"],
  vi: ["other"],
};

/**
 * Picks the language to use from a list of preferred language tags (navigator.languages):
 * the first one that matches a supported language, English if none does.
 */
export function matchLanguage(preferred: readonly string[]): LanguageCode {
  for (const tag of preferred) {
    const lower = tag.toLowerCase();
    if (lower.startsWith("zh")) {
      // Only Simplified Chinese is translated; Traditional readers get it too, since it is
      // closer than English.
      return "zh-Hans";
    }
    if (lower === "pt" || lower.startsWith("pt-")) return "pt-BR";
    if (lower === "tl" || lower.startsWith("tl-")) return "fil";
    const base = lower.split("-")[0];
    const hit = LANGUAGES.find((l) => l.code.toLowerCase() === base);
    if (hit) return hit.code;
  }
  return "en";
}
