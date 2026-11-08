import { describe, it, expect } from "vitest";
import {
  normalizeUrl,
  paddedSection,
  stepPaddedLength,
  jobProgress,
  endFromPaddedLength,
  parseTimestamp,
  timestamp,
  preciseTimestamp,
  validSection,
  outFromLength,
  codecFamily,
  updateQueue,
  clearQueueRows,
  isTrimmed,
  timelineTime,
  acceptPlayerTime,
  type Job,
} from "./domain";
describe("YouTube URL validation", () => {
  it("normalizes supported links and strips tracking", () => {
    for (const url of [
      "https://youtu.be/BaW_jenozKc?t=2",
      "https://www.youtube.com/watch?v=BaW_jenozKc&list=ignored",
      "https://youtube.com/shorts/BaW_jenozKc",
    ])
      expect(normalizeUrl(url)).toBe(
        "https://www.youtube.com/watch?v=BaW_jenozKc",
      );
  });
  it("rejects lookalikes, credentials, invalid IDs and protocols", () => {
    for (const url of [
      "https://youtube.com.evil.com/watch?v=BaW_jenozKc",
      "https://user@youtube.com/watch?v=BaW_jenozKc",
      "file:///tmp/a",
      "https://youtu.be/--exec",
      "https://youtube.com:444/watch?v=BaW_jenozKc",
    ])
      expect(() => normalizeUrl(url)).toThrow();
  });
});
describe("selection arithmetic", () => {
  it("parses precise timestamps", () => {
    expect(parseTimestamp("01:02:03.125")).toBe(3723.125);
    expect(timestamp(3723)).toBe("01:02:03");
  });
  it("rejects malformed times", () => {
    for (const text of ["00:60:00", "00:00:60", "-1:00:00", "12", "00:00:NaN"])
      expect(() => parseTimestamp(text)).toThrow();
  });
  it("validates interval and duration", () => {
    expect(validSection(1, 3, 10)).toBe(true);
    for (const v of [
      [-1, 3, 10],
      [3, 3, 10],
      [4, 3, 10],
      [1, 11, 10],
      [NaN, 3, 10],
      [0, Infinity, Infinity],
    ])
      expect(validSection(...(v as [number, number, number]))).toBe(false);
    expect(3.25 - 1.1).toBeCloseTo(2.15);
  });
});
it("maps actual codec metadata", () => {
  expect(codecFamily("avc1.640028")).toBe("h264");
  expect(codecFamily("av01.0.08M.08")).toBe("av1");
  expect(codecFamily("vp9")).toBe("vp9");
});

it("rounds milliseconds across second boundaries", () => {
  expect(preciseTimestamp(0.9996)).toBe("00:00:01");
  expect(preciseTimestamp(59.9996)).toBe("00:01:00");
  expect(preciseTimestamp(1.125)).toBe("00:00:01.125");
});

it("links fractional Length to Out and rejects cuts outside the video", () => {
  expect(outFromLength(10.125, 2.25, 20)).toBe(12.375);
  expect(outFromLength(10, 10, 20)).toBe(20);
  expect(outFromLength(10.125, 12.375 - 10.125, 20)).toBe(12.375);
  for (const length of [0, -1, NaN, Infinity, 11])
    expect(() => outFromLength(10, length, 20)).toThrow();
});

describe("clearing completed queue rows", () => {
  const job = (id: string, state: string): Job => ({
    id,
    state,
    title: id,
    progress: 100,
    speed: "",
    bytes: "",
    eta: "",
    message: "",
    path: "",
  });
  it("removes successful and canceled jobs while preserving new active jobs", () => {
    const cleared = new Set(["done", "canceled"]);
    const rows = [
      job("done", "completed"),
      job("canceled", "canceled"),
      job("new", "downloading"),
    ];
    expect(clearQueueRows(rows, cleared).map((j) => j.id)).toEqual(["new"]);
  });
  it("ignores delayed completion and cleanup events after clearing", () => {
    const cleared = new Set(["done", "canceled"]);
    let rows = [job("active", "downloading")];
    rows = updateQueue(rows, job("done", "completed"), cleared);
    rows = updateQueue(rows, job("canceled", "canceled"), cleared);
    expect(rows.map((j) => j.id)).toEqual(["active"]);
    expect(
      updateQueue(rows, job("next", "completed"), cleared).map((j) => j.id),
    ).toEqual(["next", "active"]);
  });
});

describe("automatic full-video or section download", () => {
  it("downloads the full video for unchanged or reset boundaries", () => {
    expect(isTrimmed(0, 635, 635)).toBe(false);
    expect(isTrimmed(0, 12.345, 12.3454)).toBe(false);
  });
  it("cuts when either boundary or length changes", () => {
    expect(isTrimmed(1, 635, 635)).toBe(true);
    expect(isTrimmed(0, 634, 635)).toBe(true);
    expect(isTrimmed(0, outFromLength(0, 12, 635), 635)).toBe(true);
    expect(isTrimmed(0.001, 635, 635)).toBe(true);
  });
});

describe("timeline scrubbing", () => {
  it("maps repeated seeks and clamps drags outside the track", () => {
    expect(timelineTime(25, 0, 100, 600)).toBe(150);
    expect(timelineTime(75, 0, 100, 600)).toBe(450);
    expect(timelineTime(-20, 0, 100, 600)).toBe(0);
    expect(timelineTime(120, 0, 100, 600)).toBe(600);
    expect(timelineTime(30, 0, 0, 600)).toBe(0);
  });
  it("does not let stale player polls pull the playhead back during repeated seeks", () => {
    expect(
      acceptPlayerTime(10, { position: 150, expires: 3000 }, false, 100),
    ).toBe(false);
    expect(
      acceptPlayerTime(150, { position: 450, expires: 3100 }, false, 200),
    ).toBe(false);
    expect(
      acceptPlayerTime(450, { position: 450, expires: 3100 }, false, 300),
    ).toBe(true);
    expect(acceptPlayerTime(450, null, true, 300)).toBe(false);
    expect(acceptPlayerTime(451, null, false, 400)).toBe(true);
    expect(
      acceptPlayerTime(10, { position: 150, expires: 3000 }, false, 3100),
    ).toBe(true);
  });
});

describe("padding", () => {
  it("extends both ends without accumulating", () => {
    expect(paddedSection(10, 20, 3, 100)).toEqual([7, 23]);
    expect(paddedSection(10, 20, 0, 100)).toEqual([10, 20]);
  });
  it("clamps independently at the video boundaries", () => {
    expect(paddedSection(0, 20, 5, 100)).toEqual([0, 25]);
    expect(paddedSection(10, 100, 5, 100)).toEqual([5, 100]);
    expect(paddedSection(2, 98, 99, 100)).toEqual([0, 100]);
  });
});

describe("length stepper with padding", () => {
  it("changes the padded length by a second", () => {
    expect(stepPaddedLength(10, 20, 2, 100, 1)).toBe(21);
    expect(stepPaddedLength(10, 20, 2, 100, -1)).toBe(19);
  });
  it("handles clipped end padding and preserves valid bounds", () => {
    expect(stepPaddedLength(10, 100, 2, 100, -1)).toBe(97);
    expect(stepPaddedLength(10, 98, 2, 100, 1)).toBe(98);
    expect(stepPaddedLength(10, 10.1, 2, 100, -1)).toBe(10.01);
  });
});

describe("editable padded length", () => {
  it("maps a typed padded length back to the base Out", () => {
    expect(endFromPaddedLength(10, 2, 100, 7.32)).toBeCloseTo(13.32, 3);
    expect(endFromPaddedLength(0, 2, 100, 5)).toBe(3);
    expect(endFromPaddedLength(10, 0, 100, 4)).toBe(14);
  });
  it("rejects invalid lengths", () => {
    expect(() => endFromPaddedLength(10, 2, 100, 0)).toThrow();
    expect(() => endFromPaddedLength(10, 2, 100, NaN)).toThrow();
    expect(() => endFromPaddedLength(10, 2, 100, 95)).toThrow(/fit/);
    expect(() => endFromPaddedLength(10, 2, 100, 2)).toThrow(/short/);
  });
});

describe("queue progress", () => {
  const job = (state: string, phase: string, progress: number) => ({
    id: "x",
    title: "t",
    state,
    phase,
    progress,
    speed: "",
    bytes: "",
    eta: "",
    message: "",
    path: "",
  });
  it("is indeterminate until a transfer reports real progress", () => {
    expect(jobProgress(job("downloading", "preparing", 0))).toEqual({
      label: "Preparing",
      percent: null,
    });
    expect(jobProgress(job("downloading", "transferring", 0))).toEqual({
      label: "downloading",
      percent: null,
    });
    expect(jobProgress(job("downloading", "transferring", 42.5)).percent).toBe(
      42.5,
    );
    expect(jobProgress(job("downloading", "finishing", 99.9))).toEqual({
      label: "Finishing",
      percent: null,
    });
    expect(jobProgress(job("completed", "", 100)).percent).toBe(100);
    expect(jobProgress(job("cooldown", "", 0)).label).toBe("Cooling down");
  });
});
