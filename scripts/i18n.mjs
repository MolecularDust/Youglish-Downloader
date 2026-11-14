// Translation tooling for the app (see docs/LOCALIZATION.md).
//
//   node scripts/i18n.mjs keys     print every message the app can show (from t(...) and backend.json)
//   node scripts/i18n.mjs check    check every src/locales/<code>.json against those messages
//   node scripts/i18n.mjs stub <code>   write src/locales/<code>.json with every message, untranslated
//
// The English text of a message is its key. `check` fails (exit code 1) on: a message with no
// translation, a translation nobody uses, an empty translation, values ({name}) or plural forms
// that differ from what the English needs, a syntax error, and a backend message that no longer
// exists in the Rust sources.
import ts from "typescript";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LANGUAGES, PLURAL_CATEGORIES } from "../src/i18n/languages.ts";
import { argumentNames, pluralForms } from "../src/i18n/message.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const localesDir = join(srcDir, "locales");
const command = process.argv[2] ?? "check";

/** Message keys from t("…") and tx("…") calls. Returns { keys, problems } where problems are calls whose key is not a plain string. */
function codeKeys() {
  const keys = new Map(); // key -> first "file:line"
  const problems = [];
  const files = readdirSync(srcDir).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f),
  );
  for (const f of files) {
    const text = readFileSync(join(srcDir, f), "utf8");
    const sf = ts.createSourceFile(
      f,
      text,
      ts.ScriptTarget.Latest,
      true,
      f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (n) => {
      if (
        ts.isCallExpression(n) &&
        ts.isIdentifier(n.expression) &&
        (n.expression.text === "t" || n.expression.text === "tx")
      ) {
        const arg = n.arguments[0];
        const where = `${f}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
        if (
          arg &&
          (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))
        ) {
          if (!keys.has(arg.text)) keys.set(arg.text, where);
        } else
          problems.push(
            `${where}: the message in ${n.expression.text}(...) is not a plain string`,
          );
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return { keys, problems };
}

function backendKeys() {
  return JSON.parse(readFileSync(join(srcDir, "i18n", "backend.json"), "utf8"));
}

function rustSource() {
  const dir = join(root, "src-tauri", "src");
  let all = "";
  const walk = (d) =>
    readdirSync(d).forEach((f) => {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".rs"))
        all += readFileSync(p, "utf8").replace(/\r\n/g, "\n") + "\n";
    });
  walk(dir);
  // Messages the frontend itself throws (domain and form checks) are also "from the code".
  for (const f of readdirSync(srcDir))
    if (/\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f))
      all +=
        readFileSync(join(srcDir, f), "utf8").replace(/\r\n/g, "\n") + "\n";
  return all;
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const localeFile = (code) => join(localesDir, `${code}.json`);

function allKeys() {
  const { keys, problems } = codeKeys();
  const backend = backendKeys();
  const all = new Set([...keys.keys(), ...backend]);
  return { all: [...all].sort(), keys, backend, problems };
}

if (command === "keys") {
  const { all, problems } = allKeys();
  console.log(
    JSON.stringify(Object.fromEntries(all.map((k) => [k, ""])), null, 2),
  );
  console.error(`${all.length} messages`);
  if (problems.length) console.error(problems.join("\n"));
} else if (command === "stub") {
  const code = process.argv[3];
  if (!LANGUAGES.some((l) => l.code === code))
    throw Error(`unknown language code "${code}"`);
  const { all } = allKeys();
  const file = localeFile(code);
  const old = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const out = Object.fromEntries(all.map((k) => [k, old[k] ?? ""]));
  writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log(
    `${file}: ${all.length} messages, ${all.filter((k) => !old[k]).length} untranslated`,
  );
} else if (command === "check") {
  const problems = [];
  const { all, keys, backend, problems: dynamic } = allKeys();
  problems.push(...dynamic);

  // English keys must themselves be valid, and may only use English's plural forms.
  const english = PLURAL_CATEGORIES.en;
  for (const k of all) {
    try {
      argumentNames(k);
      for (const [name, forms] of Object.entries(pluralForms(k)))
        for (const form of forms)
          if (!english.includes(form))
            problems.push(
              `English message uses plural form "${form}" for {${name}}: ${k}`,
            );
    } catch (e) {
      problems.push(`English message is not valid (${e.message}): ${k}`);
    }
  }

  // Every backend message must still exist in the Rust sources.
  const rust = rustSource();
  for (const k of backend) {
    const pattern = k
      .split(/(\{\w+\})/)
      .map((p) => (/^\{\w+\}$/.test(p) ? "\\{[^}]*\\}" : escapeRegExp(p)))
      .join("");
    if (!new RegExp(pattern).test(rust))
      problems.push(`backend.json: no longer in the Rust sources: ${k}`);
  }

  let checked = 0;
  for (const { code } of LANGUAGES) {
    if (code === "en") continue;
    const file = localeFile(code);
    const label = `src/locales/${code}.json`;
    if (!existsSync(file)) {
      problems.push(`${label}: missing`);
      continue;
    }
    checked++;
    let dict;
    try {
      dict = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      problems.push(`${label}: not valid JSON (${e.message})`);
      continue;
    }
    const need = new Set(all);
    for (const k of all)
      if (!(k in dict)) problems.push(`${label}: no translation for: ${k}`);
    for (const k of Object.keys(dict))
      if (!need.has(k))
        problems.push(
          `${label}: translation of a message that no longer exists: ${k}`,
        );
    const categories = PLURAL_CATEGORIES[code];
    for (const [k, v] of Object.entries(dict)) {
      if (!need.has(k)) continue;
      if (typeof v !== "string" || !v.trim()) {
        problems.push(`${label}: empty translation for: ${k}`);
        continue;
      }
      let want, got, wantPlural, gotPlural;
      try {
        want = argumentNames(k);
        wantPlural = pluralForms(k);
      } catch {
        continue; // reported above
      }
      try {
        got = argumentNames(v);
        gotPlural = pluralForms(v);
      } catch (e) {
        problems.push(`${label}: not valid (${e.message}): ${v}`);
        continue;
      }
      if (want.join(",") !== got.join(","))
        problems.push(
          `${label}: values {${got.join(", ")}} differ from {${want.join(", ")}} in: ${k}`,
        );
      for (const name of Object.keys(wantPlural)) {
        const forms = gotPlural[name] ?? [];
        const missing = categories.filter((c) => !forms.includes(c));
        const extra = forms.filter(
          (c) => !categories.includes(c) && c !== "other",
        );
        if (missing.length)
          problems.push(
            `${label}: {${name}} needs the plural forms ${missing.join(", ")} in: ${v}`,
          );
        if (extra.length)
          problems.push(
            `${label}: {${name}} has plural forms ${extra.join(", ")} that ${code} does not use in: ${v}`,
          );
      }
      // A translation may choose singular or plural for any value the English has, even when the
      // English writes it as a plain {name}, since other languages inflect for the number.
      for (const name of Object.keys(gotPlural))
        if (!want.includes(name))
          problems.push(
            `${label}: plural on {${name}}, which the English does not have: ${v}`,
          );
    }
  }
  if (problems.length) {
    console.log(problems.join("\n"));
    console.log(`\n${problems.length} problem(s).`);
    process.exit(1);
  }
  console.log(
    `Translations are in sync: ${all.length} messages (${keys.size} in the code, ${backend.length} from the Rust side) in ${checked} languages.`,
  );
} else {
  console.error("usage: node scripts/i18n.mjs keys | check | stub <code>");
  process.exit(2);
}
