import { describe, it, expect } from "vitest";
import {
  formatMessage,
  argumentNames,
  pluralForms,
  parseMessage,
} from "./i18n/message";
import {
  LANGUAGES,
  PLURAL_CATEGORIES,
  isRtl,
  matchLanguage,
  type LanguageCode,
} from "./i18n/languages";

const formatter = (code: string) => ({
  plural: (n: number) => new Intl.PluralRules(code).select(n),
  number: (n: number) => String(n),
});
const fmt = (
  code: string,
  source: string,
  params?: Record<string, string | number>,
) => formatMessage(source, params, formatter(code));

describe("message format", () => {
  it("returns plain text unchanged", () => {
    expect(fmt("en", "Save")).toBe("Save");
  });

  it("fills named values and leaves missing ones visible", () => {
    expect(fmt("en", "Hello {name}", { name: "Ada" })).toBe("Hello Ada");
    expect(fmt("en", "Hello {name}")).toBe("Hello {name}");
  });

  it("picks the plural form for English", () => {
    const m = "{count, plural, one {# match} other {# matches}}";
    expect(fmt("en", m, { count: 1 })).toBe("1 match");
    expect(fmt("en", m, { count: 2 })).toBe("2 matches");
  });

  it("uses all four Russian forms", () => {
    const m =
      "{n, plural, one {# секунду} few {# секунды} many {# секунд} other {# секунды}}";
    expect(fmt("ru", m, { n: 1 })).toBe("1 секунду");
    expect(fmt("ru", m, { n: 3 })).toBe("3 секунды");
    expect(fmt("ru", m, { n: 5 })).toBe("5 секунд");
    expect(fmt("ru", m, { n: 21 })).toBe("21 секунду");
  });

  it("uses all six Arabic forms", () => {
    const m =
      "{n, plural, zero {Z} one {O} two {T} few {F} many {M} other {X}}";
    const got = [0, 1, 2, 3, 11, 100].map((n) => fmt("ar", m, { n }));
    expect(got).toEqual(["Z", "O", "T", "F", "M", "X"]);
  });

  it("reports the values and plural forms a message uses", () => {
    const m = "{a} and {n, plural, one {# x} other {# xs}}";
    expect(argumentNames(m)).toEqual(["a", "n"]);
    expect(pluralForms(m)).toEqual({ n: ["one", "other"] });
  });

  it("rejects unbalanced braces", () => {
    expect(() => parseMessage("Hello {name")).toThrow();
    expect(() => parseMessage("Hello }")).toThrow();
  });
});

describe("languages", () => {
  it("lists English and the 19 translations", () => {
    expect(LANGUAGES).toHaveLength(20);
    expect(LANGUAGES[0].code).toBe("en");
  });

  it("marks only Arabic and Persian as right-to-left", () => {
    expect(
      LANGUAGES.filter((l) => isRtl(l.code))
        .map((l) => l.code)
        .sort(),
    ).toEqual(["ar", "fa"]);
  });

  it("matches the system language list to a supported language", () => {
    expect(matchLanguage(["zh-CN"])).toBe("zh-Hans");
    expect(matchLanguage(["zh-TW", "en"])).toBe("zh-Hans");
    expect(matchLanguage(["pt-PT"])).toBe("pt-BR");
    expect(matchLanguage(["tl-PH"])).toBe("fil");
    expect(matchLanguage(["de-AT"])).toBe("de");
    expect(matchLanguage(["sv", "fr-CA"])).toBe("fr");
    expect(matchLanguage(["xx"])).toBe("en");
    expect(matchLanguage([])).toBe("en");
  });

  it("only lists plural categories the language really has", () => {
    for (const { code } of LANGUAGES) {
      const real = new Set<string>(
        new Intl.PluralRules(code).resolvedOptions().pluralCategories,
      );
      for (const c of PLURAL_CATEGORIES[code as LanguageCode])
        expect(real.has(c), `${code} ${c}`).toBe(true);
    }
  });
});

describe("translation files", () => {
  const files = import.meta.glob<Record<string, string>>("./locales/*.json", {
    eager: true,
    import: "default",
  });
  const byCode = Object.fromEntries(
    Object.entries(files).map(([path, dict]) => [
      path.replace(/^.*\/(.*)\.json$/, "$1"),
      dict,
    ]),
  );
  const english = Object.keys(byCode.de).sort();

  it("has one file per non-English language", () => {
    expect(Object.keys(byCode).sort()).toEqual(
      LANGUAGES.filter((l) => l.code !== "en")
        .map((l) => l.code)
        .sort(),
    );
  });

  for (const { code } of LANGUAGES) {
    if (code === "en") continue;
    it(`${code} translates every message with the same values`, () => {
      const dict = byCode[code];
      expect(Object.keys(dict).sort()).toEqual(english);
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim(), key).not.toBe("");
        expect(argumentNames(value), key).toEqual(argumentNames(key));
        for (const forms of Object.values(pluralForms(value)))
          for (const f of forms)
            expect(
              PLURAL_CATEGORIES[code as LanguageCode],
              `${code}: ${key}`,
            ).toContain(f);
      }
    });
  }
});
