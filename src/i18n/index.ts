// Localization. The English text of a message is its key: `t("Save preset")`. A translation file
// (src/locales/<code>.json) maps English text to the translation; text with no translation is shown
// in English. See docs/LOCALIZATION.md.
import {
  Fragment,
  createElement,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  LANGUAGES,
  intlTag,
  isLanguageCode,
  isRtl,
  matchLanguage,
  type LanguageCode,
} from "./languages";
import { formatMessage, type Formatter, type Params } from "./message";

export { LANGUAGES, type LanguageCode, isRtl } from "./languages";
export type { Params } from "./message";

const STORAGE_KEY = "yg.language";

type Dictionary = Record<string, string>;
const loaders = import.meta.glob<{ default: Dictionary }>("../locales/*.json");

let language: LanguageCode = "en";
let choice = ""; // "" means "same as the system"
let dictionary: Dictionary = {};
let formatter: Formatter = makeFormatter("en");
let templates: Template[] | null = null;
const listeners = new Set<() => void>();

function makeFormatter(code: LanguageCode): Formatter {
  const tag = intlTag(code);
  const build = <T>(make: (t: string) => T): T => {
    try {
      return make(tag);
    } catch {
      return make("en");
    }
  };
  const rules = build((t) => new Intl.PluralRules(t));
  // Latin digits in every language, to match the timestamps and counts elsewhere in the window.
  const numbers = build((t) => new Intl.NumberFormat(`${t}-u-nu-latn`));
  return { plural: (n) => rules.select(n), number: (n) => numbers.format(n) };
}

/** The saved language choice: a language code, or "" for the system's language. */
export function storedChoice(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) ?? "";
    return isLanguageCode(saved) ? saved : "";
  } catch {
    return "";
  }
}

function systemLanguage(): LanguageCode {
  const preferred =
    typeof navigator === "undefined"
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language];
  return matchLanguage(preferred);
}

async function loadDictionary(code: LanguageCode): Promise<Dictionary> {
  if (code === "en") return {};
  const load = loaders[`../locales/${code}.json`];
  if (!load) return {};
  try {
    return (await load()).default;
  } catch {
    return {}; // a missing or broken file leaves the app in English
  }
}

function apply() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = intlTag(language);
  document.documentElement.dir = isRtl(language) ? "rtl" : "ltr";
}

async function activate(next: string) {
  const code = isLanguageCode(next) ? next : systemLanguage();
  const loaded = await loadDictionary(code);
  choice = isLanguageCode(next) ? next : "";
  language = code;
  dictionary = loaded;
  formatter = makeFormatter(code);
  templates = null;
  apply();
  listeners.forEach((l) => l());
}

/**
 * Loads the language before the first screen is drawn. `?lang=<code>` in the page address picks a
 * language for this run only, which is how every language can be looked at without changing the
 * saved choice.
 */
export async function initLanguage(): Promise<void> {
  const fromAddress =
    typeof location === "undefined"
      ? null
      : new URLSearchParams(location.search).get("lang");
  await activate(
    fromAddress && isLanguageCode(fromAddress) ? fromAddress : storedChoice(),
  );
}

/** Switches language and remembers the choice ("" = same as the system). */
export async function setLanguageChoice(next: string): Promise<void> {
  try {
    if (isLanguageCode(next)) localStorage.setItem(STORAGE_KEY, next);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* the choice just lasts until the app closes */
  }
  await activate(next);
}

export const getLanguage = (): LanguageCode => language;
export const getLanguageChoice = (): string => choice;

/** Re-renders the component when the language changes. Call it in the root component. */
export function useLanguage(): LanguageCode {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => language,
  );
}

/** Translates a message. `{name}` and `{count, plural, one {…} other {…}}` take their values from params. */
export function t(key: string, params?: Params): string {
  return formatMessage(dictionary[key] || key, params, formatter);
}

/**
 * Translates a message that has elements inside it: `tx("Press {key} to start", { key: <kbd>…</kbd> })`.
 * Plain values in `params` fill in `{name}` as text. Plural forms are not supported here.
 */
export function tx(
  key: string,
  nodes: Record<string, ReactNode>,
  params?: Params,
): ReactNode {
  const source = dictionary[key] || key;
  const pieces = source.split(/(\{\w+\})/).map((piece, i) => {
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    if (name !== undefined && name in nodes)
      return createElement(Fragment, { key: i }, nodes[name]);
    if (name !== undefined && params && name in params)
      return String(params[name]);
    return piece;
  });
  return createElement(Fragment, null, ...pieces);
}

type Template = { key: string; names: string[]; pattern: RegExp };

function buildTemplates(): Template[] {
  const out: Template[] = [];
  for (const key of Object.keys(dictionary)) {
    if (!/\{\w+\}/.test(key) || key.includes(", plural,")) continue;
    const names: string[] = [];
    const pattern = key
      .split(/(\{\w+\})/)
      .map((piece) => {
        const name = /^\{(\w+)\}$/.exec(piece)?.[1];
        if (name === undefined)
          return piece.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        names.push(name);
        return "([\\s\\S]*?)";
      })
      .join("");
    out.push({ key, names, pattern: new RegExp(`^${pattern}$`) });
  }
  // The most specific text first, so a short template cannot swallow a longer message.
  return out.sort((a, b) => b.key.length - a.key.length);
}

/**
 * Translates a message that comes from the Rust side, which is always English. Messages with a
 * changing part ("Caption request: {message}") are recognised by their template, and the changing
 * part is translated too. Anything unknown stays as it is.
 */
export function tb(message: string): string {
  if (!message || language === "en") return message;
  const exact = dictionary[message];
  if (exact) return formatMessage(exact, undefined, formatter);
  templates ??= buildTemplates();
  for (const tpl of templates) {
    const m = tpl.pattern.exec(message);
    if (!m) continue;
    const params: Params = {};
    tpl.names.forEach((name, i) => (params[name] = tb(m[i + 1])));
    return formatMessage(dictionary[tpl.key], params, formatter);
  }
  return message;
}

/** A language's name in the current language, from the browser's own data. */
export function languageName(code: string): string {
  try {
    return (
      new Intl.DisplayNames([intlTag(language)], { type: "language" }).of(
        code,
      ) ?? code
    );
  } catch {
    return code;
  }
}

export const languageList = LANGUAGES;
