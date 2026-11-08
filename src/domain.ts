export type Format = {
  format_id: string;
  height: number | null;
  vcodec: string;
  acodec: string;
  ext: string;
};
export type Video = {
  id: string;
  url: string;
  title: string;
  channel: string;
  duration: number;
  thumbnail: string;
  formats: Format[];
  subtitles: Record<string, unknown>;
};
export type Settings = {
  destination: string;
  browser: string;
  cookiesFile: string;
  appearance: string;
};
export type Job = {
  id: string;
  title: string;
  state: string;
  phase?: string;
  progress: number;
  speed: string;
  bytes: string;
  eta: string;
  message: string;
  path: string;
};
export function normalizeUrl(input: string): string {
  const u = new URL(input.trim());
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.port
  )
    throw Error("Enter a valid YouTube video URL.");
  let id = "";
  if (u.hostname === "youtu.be") id = u.pathname.slice(1);
  else if (
    ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(u.hostname)
  )
    id =
      u.pathname === "/watch"
        ? (u.searchParams.get("v") ?? "")
        : u.pathname.startsWith("/shorts/")
          ? u.pathname.slice(8).replace(/\/$/, "")
          : "";
  if (!/^[\w-]{11}$/.test(id))
    throw Error("Use a YouTube, youtu.be, or Shorts video link.");
  return `https://www.youtube.com/watch?v=${id}`;
}
export function timestamp(seconds: number): string {
  const n = Math.max(0, Math.floor(seconds));
  return [Math.floor(n / 3600), Math.floor(n / 60) % 60, n % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
export function parseTimestamp(text: string): number {
  if (!/^\d{2,}:\d{2}:\d{2}(\.\d{1,3})?$/.test(text))
    throw Error("Use HH:MM:SS, optionally with milliseconds.");
  const [h, m, s] = text.split(":").map(Number);
  if (m >= 60 || s >= 60) throw Error("Minutes and seconds must be below 60.");
  return h * 3600 + m * 60 + s;
}
export function validSection(a: number, b: number, d: number): boolean {
  return [a, b, d].every(Number.isFinite) && a >= 0 && a < b && b <= d;
}
export function codecFamily(v: string): string {
  if (/^(avc|h264)/.test(v)) return "h264";
  if (/^(hev|hvc|hevc)/.test(v)) return "hevc";
  if (/^av01/.test(v)) return "av1";
  if (/^vp0?9/.test(v)) return "vp9";
  return v;
}

export function preciseTimestamp(value: number): string {
  const ms = Math.max(0, Math.round(value * 1000));
  return (
    timestamp(Math.floor(ms / 1000)) +
    (ms % 1000 ? `.${String(ms % 1000).padStart(3, "0")}` : "")
  );
}

export function outFromLength(
  start: number,
  length: number,
  duration: number,
): number {
  const out = Math.round((start + length) * 1000) / 1000;
  if (
    !Number.isFinite(length) ||
    length <= 0 ||
    !validSection(start, out, duration)
  )
    throw Error("Length must be positive and fit within the video.");
  return out;
}

export function updateQueue(
  jobs: Job[],
  incoming: Job,
  clearedIds: ReadonlySet<string>,
): Job[] {
  if (clearedIds.has(incoming.id)) return jobs;
  return jobs.some((j) => j.id === incoming.id)
    ? jobs.map((j) => (j.id === incoming.id ? incoming : j))
    : [incoming, ...jobs];
}
export function clearQueueRows(
  jobs: Job[],
  clearedIds: ReadonlySet<string>,
): Job[] {
  return jobs.filter((j) => !clearedIds.has(j.id));
}

/** Match the millisecond precision shown by the In/Out fields. */
export function isTrimmed(
  start: number,
  end: number,
  duration: number,
): boolean {
  return (
    Math.round(start * 1000) !== 0 ||
    Math.round(end * 1000) !== Math.round(duration * 1000)
  );
}

export type SeekTarget = { position: number; expires: number };
export function timelineTime(
  clientX: number,
  left: number,
  width: number,
  duration: number,
): number {
  if (
    ![clientX, left, width, duration].every(Number.isFinite) ||
    width <= 0 ||
    duration <= 0
  )
    return 0;
  return Math.max(0, Math.min(duration, ((clientX - left) / width) * duration));
}
export function acceptPlayerTime(
  value: number,
  pending: SeekTarget | null,
  dragging: boolean,
  now: number,
): boolean {
  if (!Number.isFinite(value) || value < 0 || dragging) return false;
  return (
    !pending ||
    Math.abs(value - pending.position) <= 1 ||
    now >= pending.expires
  );
}

export function paddedSection(
  start: number,
  end: number,
  padding: number,
  duration: number,
): [number, number] {
  const extra = Math.max(0, Math.min(99, Math.trunc(padding)));
  return [Math.max(0, start - extra), Math.min(duration, end + extra)];
}

/** Base Out that makes the padded clip exactly `length` seconds long. */
export function endFromPaddedLength(
  start: number,
  padding: number,
  duration: number,
  length: number,
): number {
  const extra = Math.max(0, Math.min(99, Math.trunc(padding)));
  const clipEnd =
    Math.round((Math.max(0, start - extra) + length) * 1000) / 1000;
  if (!Number.isFinite(length) || length <= 0)
    throw Error("Length must be a positive number of seconds.");
  if (clipEnd > duration) throw Error("Length does not fit within the video.");
  const end = Math.round((clipEnd - extra) * 1000) / 1000;
  if (end <= start) throw Error("Length is too short for the current padding.");
  return end;
}

export function stepPaddedLength(
  start: number,
  end: number,
  padding: number,
  duration: number,
  delta: number,
): number {
  const [, paddedEnd] = paddedSection(start, end, padding, duration);
  if (delta > 0 && paddedEnd >= duration) return end;
  const target = Math.min(duration, paddedEnd + delta);
  return Math.min(duration, Math.max(start + 0.01, target - padding));
}

/** Portable filename stem; preserve Unicode while respecting the backend's byte limit. */
export function safeFileName(input: string): string {
  let name = input.trim().replace(/\.(mp4|mkv)$/i, "");
  name = Array.from(name)
    .filter(
      (c) =>
        c.codePointAt(0)! > 31 &&
        c.codePointAt(0)! !== 127 &&
        !/[\p{Cc}\u2028\u2029]/u.test(c) &&
        !'<>:"/\\|?*'.includes(c),
    )
    .join("");
  // A final period is valid: the extension is appended after it.
  name = name.trim();
  if (/^\.*$/.test(name)) name = "";
  if (
    /^(con|prn|aux|nul|conin\$|conout\$|com[1-9\u00b9\u00b2\u00b3]|lpt[1-9\u00b9\u00b2\u00b3])(\.|$)/i.test(
      name,
    )
  )
    name = `_${name}`;
  let result = "";
  for (const c of name) {
    if (new TextEncoder().encode(result + c).length > 180) break;
    result += c;
  }
  result = result.trim();
  return /^\.*$/.test(result) ? "Speech sample" : result;
}
export function fileNameNeedsFix(input: string): boolean {
  const stem = input.trim().replace(/\.(mp4|mkv)$/i, "");
  return (
    stem !== safeFileName(input) ||
    Array.from(input).some(
      (c) => c.codePointAt(0)! < 32 || c.codePointAt(0)! === 127,
    ) ||
    /[\u2028\u2029]/.test(input)
  );
}

/** Status text and determinate percentage for a queue row; null percent means "indeterminate". */
export function jobProgress(job: Job): {
  label: string;
  percent: number | null;
} {
  const running = ["downloading", "merging", "processing"].includes(job.state);
  if (job.state === "completed") return { label: "completed", percent: 100 };
  if (job.state === "cooldown") return { label: "Cooling down", percent: null };
  if (job.state === "downloading" && job.phase === "preparing")
    return { label: "Preparing", percent: null };
  if (job.state === "downloading" && job.phase === "finishing")
    return { label: "Finishing", percent: null };
  if (running || job.state === "paused")
    return {
      label: job.state,
      percent: job.progress > 0 ? Math.min(100, job.progress) : null,
    };
  return { label: job.state, percent: null };
}
