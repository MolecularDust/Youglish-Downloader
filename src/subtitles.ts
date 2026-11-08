export type Cue = { start: number; end: number; text: string };
export type Match = { start: number; end: number; text: string };
export type CaptionTrack = { cues: Cue[]; language: string; kind: string };
const words = (s: string) =>
  s
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .match(/[\p{L}\p{N}]+/gu) ?? [];
/** Join adjacent cues, suppress overlapping rolling-caption repeats, preserve time provenance. */
export function findSubtitleMatches(cues: Cue[], phrase: string): Match[] {
  const query = words(phrase);
  if (!query.length) return [];
  const tokens: { word: string; start: number; end: number; group: number }[] =
    [];
  let group = 0,
    lastEnd = -10;
  for (const cue of cues) {
    if (
      !Number.isFinite(cue.start) ||
      !Number.isFinite(cue.end) ||
      cue.end <= cue.start
    )
      continue;
    if (cue.start - lastEnd > 2) group++;
    const next = words(cue.text);
    let overlap = 0;
    if (cue.start < lastEnd) {
      for (let n = Math.min(next.length, tokens.length, 80); n > 0; n--) {
        const tail = tokens.slice(-n);
        if (tail.every((t, i) => t.group === group && t.word === next[i])) {
          overlap = n;
          break;
        }
      }
    }
    tokens.push(
      ...next
        .slice(overlap)
        .map((word) => ({ word, start: cue.start, end: cue.end, group })),
    );
    lastEnd = Math.max(lastEnd, cue.end);
  }
  const matches: Match[] = [];
  for (let i = 0; i <= tokens.length - query.length; i++) {
    const slice = tokens.slice(i, i + query.length);
    if (
      slice.every((t, j) => t.word === query[j] && t.group === slice[0].group)
    ) {
      const m = {
        start: slice[0].start,
        end: Math.max(...slice.map((t) => t.end)),
        text: phrase,
      };
      if (!matches.some((old) => old.start === m.start && old.end === m.end))
        matches.push(m);
    }
  }
  return matches;
}
export function defaultHeight(heights: number[]): string {
  const eligible = heights.filter((h) => h > 0 && h <= 1080);
  return eligible.length ? String(Math.max(...eligible)) : "1080";
}

/**
 * Decode percent escapes leniently. The widget can mix standard escapes (%20) with the old
 * %uXXXX form (for example %u200B); decoding the whole string at once fails on the latter.
 */
function decodeLoose(value: string): string {
  return value
    .replace(/%u([0-9a-f]{4})/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/(?:%[0-9a-f]{2})+/gi, (run) => {
      try {
        return decodeURIComponent(run);
      } catch {
        return run; // not valid UTF-8: keep it as literal text
      }
    });
}

/** Widget captions can arrive URL encoded and contain markup/entities. */
export function cleanWidgetCaption(value: string): string {
  const text = decodeLoose(value);
  const entities: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
  };
  return text
    .replace(/\[\[\[|\]\]\]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(
      /&(nbsp|amp|quot|apos|lt|gt);/gi,
      (_, key: string) => entities[key.toLowerCase()],
    )
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cueIndex(cues: Cue[], match: Match): number {
  let best = -1,
    distance = Infinity;
  cues.forEach((c, i) => {
    const d = Math.abs(c.start - match.start);
    if (d < distance) {
      best = i;
      distance = d;
    }
  });
  return best;
}
/** Neighbouring caption text around a match, to tell repeated occurrences apart. */
export function matchContext(
  cues: Cue[],
  match: Match,
): { before: string; after: string } {
  const i = cueIndex(cues, match);
  if (i < 0) return { before: "", after: "" };
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  return {
    before: clean(cues[i - 1]?.text ?? ""),
    after: [cues[i + 1], cues[i + 2]]
      .map((c) => clean(c?.text ?? ""))
      .filter(Boolean)
      .join(" "),
  };
}
