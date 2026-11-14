// A small subset of ICU MessageFormat, enough for this app:
//   "Hello {name}"                                         a named value
//   "{count, plural, one {# video} other {# videos}}"      a count, with `#` standing for it
// Several counts can appear in one message. Everything else is literal text. A literal brace is
// not supported, so messages must not contain one.

export type Params = Record<string, string | number>;

export type Part =
  | { kind: "text"; text: string }
  | { kind: "arg"; name: string }
  | { kind: "plural"; name: string; forms: Record<string, Part[]> }
  | { kind: "number" }; // `#` inside a plural form

/** Splits a message into parts. Throws on unbalanced braces or a malformed plural. */
export function parseMessage(source: string): Part[] {
  let i = 0;
  const parseUntil = (stop: string | null, inPlural: boolean): Part[] => {
    const parts: Part[] = [];
    let text = "";
    const flush = () => {
      if (text) parts.push({ kind: "text", text });
      text = "";
    };
    while (i < source.length) {
      const ch = source[i];
      if (stop !== null && ch === stop) break;
      if (ch === "}") throw Error(`unexpected "}" at ${i}`);
      if (ch === "#" && inPlural) {
        flush();
        parts.push({ kind: "number" });
        i++;
      } else if (ch === "{") {
        flush();
        i++;
        parts.push(parseArgument());
      } else {
        text += ch;
        i++;
      }
    }
    flush();
    return parts;
  };
  const parseArgument = (): Part => {
    const close = source.indexOf("}", i);
    const comma = source.indexOf(",", i);
    if (close < 0) throw Error(`missing "}" after ${i}`);
    if (comma < 0 || comma > close) {
      const name = source.slice(i, close).trim();
      if (!/^\w+$/.test(name)) throw Error(`bad argument name "${name}"`);
      i = close + 1;
      return { kind: "arg", name };
    }
    const name = source.slice(i, comma).trim();
    if (!/^\w+$/.test(name)) throw Error(`bad argument name "${name}"`);
    i = comma + 1;
    const rest = /^\s*plural\s*,/.exec(source.slice(i));
    if (!rest) throw Error(`only "plural" is supported for {${name}, …}`);
    i += rest[0].length;
    const forms: Record<string, Part[]> = {};
    for (;;) {
      while (/\s/.test(source[i] ?? "")) i++;
      if (source[i] === "}") {
        i++;
        break;
      }
      const m = /^(zero|one|two|few|many|other)\s*\{/.exec(source.slice(i));
      if (!m) throw Error(`expected a plural category at ${i}`);
      i += m[0].length;
      forms[m[1]] = parseUntil("}", true);
      if (source[i] !== "}")
        throw Error(`missing "}" closing the "${m[1]}" form`);
      i++;
    }
    if (!forms.other) throw Error(`plural {${name}} has no "other" form`);
    return { kind: "plural", name, forms };
  };
  const parts = parseUntil(null, false);
  if (i < source.length) throw Error(`unexpected "}" at ${i}`);
  return parts;
}

const cache = new Map<string, Part[]>();
const parsed = (source: string): Part[] => {
  let p = cache.get(source);
  if (!p) {
    try {
      p = parseMessage(source);
    } catch {
      p = [{ kind: "text", text: source }]; // never break the screen over a bad message
    }
    cache.set(source, p);
  }
  return p;
};

/** The names of the values a message uses, for the translation checker. */
export function argumentNames(source: string): string[] {
  const names = new Set<string>();
  const walk = (parts: Part[]) => {
    for (const p of parts) {
      if (p.kind === "arg") names.add(p.name);
      else if (p.kind === "plural") {
        names.add(p.name);
        for (const f of Object.values(p.forms)) walk(f);
      }
    }
  };
  walk(parseMessage(source));
  return [...names].sort();
}

/** The plural categories a message gives forms for, per counted value. */
export function pluralForms(source: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const walk = (parts: Part[]) => {
    for (const p of parts)
      if (p.kind === "plural") {
        out[p.name] = Object.keys(p.forms);
        for (const f of Object.values(p.forms)) walk(f);
      }
  };
  walk(parseMessage(source));
  return out;
}

export type Formatter = {
  plural: (n: number) => string;
  number: (n: number) => string;
};

function render(
  parts: Part[],
  params: Params,
  f: Formatter,
  count: number | null,
): string {
  let out = "";
  for (const p of parts) {
    if (p.kind === "text") out += p.text;
    else if (p.kind === "number") out += count === null ? "#" : f.number(count);
    else if (p.kind === "arg") {
      const v = params[p.name];
      out +=
        v === undefined
          ? `{${p.name}}`
          : typeof v === "number"
            ? f.number(v)
            : v;
    } else {
      const v = Number(params[p.name]);
      const form = p.forms[f.plural(v)] ?? p.forms.other;
      out += render(form, params, f, Number.isFinite(v) ? v : null);
    }
  }
  return out;
}

export function formatMessage(
  source: string,
  params: Params | undefined,
  f: Formatter,
): string {
  const parts = parsed(source);
  if (parts.length === 1 && parts[0].kind === "text") return parts[0].text;
  return render(parts, params ?? {}, f, null);
}
