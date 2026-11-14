# Localizing the app

YouGlish Downloader's interface comes in the same 20 languages as Caption Finder: English plus Arabic, Bengali, Chinese (Simplified), Filipino, French, German, Hindi, Indonesian, Italian, Japanese, Korean, Persian, Portuguese (Brazil), Russian, Spanish, Telugu, Thai, Turkish and Vietnamese. The language follows the system by default; **Account & Settings → Language** overrides it and remembers the choice (`yg.language` in the WebView's browser storage).

Many shared labels (Look Up, Reset, Cancel, Padding, Length, …) were reused from Caption Finder's translations, which are AI-written and have not been reviewed by native speakers. Corrections are welcome as pull requests.

## How it works

- The English text of a message **is its key**. Code calls `t("Reset")`, `t("{count} matches — choose the occurrence you want.", { count })`, or `tx(...)` when the text wraps other elements. There are no message ids to keep in sync.
- `src/locales/<code>.json` maps each English message to its translation. English needs no file. A language's file is loaded only when that language is in use.
- Messages use a small ICU subset: named values `{name}` and `{n, plural, one {…} other {…}}` with `#` for the number. Give a plural every form the language uses (the checker lists them).
- Messages that do not appear as a literal `t()` call in the code (the names of accents and countries, job states, and the messages the Rust side and the TypeScript validation return) are listed in `src/i18n/backend.json`. `tb()` translates them by exact match or by template. A message that is not listed shows in English.
- Arabic and Persian set `dir="rtl"` on the page. Digits are always Latin (`-u-nu-latn`).
- Language names in the search drop-down come from `Intl.DisplayNames`, so they are translated without an entry here.
- The YouGlish widget page is a separate HTML page. The app passes its two strings (`loading` and `back`) in the iframe address, and the page falls back to English if they are missing.

## Commands

```bash
node scripts/i18n.mjs check        # every locale against the code: missing, unused, empty, wrong values or plural forms
node scripts/i18n.mjs keys         # print every message the code can show
node scripts/i18n.mjs stub <code>  # write src/locales/<code>.json with every message, untranslated
```

`npm test` also runs the consistency checks in `src/i18n.test.ts`. To see a language without changing your settings, open the dev server with `?lang=<code>`, for example `http://127.0.0.1:1420/?lang=ar`.

## Changing text

1. Wrap new user-visible text in `t()` / `tx()`. Use a literal string: the checker reads keys from the source, so a key built from variables is reported.
2. Run `node scripts/i18n.mjs check`; it lists what is missing in each language. Add the translations.
3. If you change an English message, its key changes: update it in every `src/locales/*.json`.
4. A message that comes from the Rust side or from a validation error and that a person should see: add it to `src/i18n/backend.json` and the locales. The checker verifies that every `backend.json` entry still exists in `src-tauri/src` or `src/*.ts(x)`.

## Adding a language

1. Add it to `LANGUAGES` and `PLURAL_CATEGORIES` in `src/i18n/languages.ts` (set `rtl: true` for a right-to-left script).
2. `node scripts/i18n.mjs stub <code>`, translate the file, run `check`.

## Not translated yet

- About 150 lower-level Rust error messages (for example "Cannot create temporary subtitle folder") are still English. Those that a person sees in the error popup or queue are listed in `backend.json`.
- The Windows setup installer's text is localized separately, in `scripts/installer/YouGlishSetup.nsi`.
- Native window titles and file dialogs created by Rust are still English.
