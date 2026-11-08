import { describe, it, expect } from "vitest";
import {
  findSubtitleMatches,
  defaultHeight,
  cleanWidgetCaption,
  matchContext,
} from "./subtitles";
describe("subtitle selection", () => {
  it("finds a phrase spanning adjacent cues with punctuation and contractions", () => {
    expect(
      findSubtitleMatches(
        [
          { start: 1, end: 2, text: "I’ll see" },
          { start: 2, end: 3, text: "ya next time." },
        ],
        "I'll see ya",
      ),
    ).toEqual([{ start: 1, end: 3, text: "I'll see ya" }]);
  });
  it("retains two real occurrences and rejects partial words", () => {
    expect(
      findSubtitleMatches(
        [
          { start: 1, end: 2, text: "yard ya" },
          { start: 3, end: 4, text: "ya" },
        ],
        "ya",
      ),
    ).toHaveLength(2);
  });
  it("does not match across a long silence", () => {
    expect(
      findSubtitleMatches(
        [
          { start: 1, end: 2, text: "see" },
          { start: 10, end: 11, text: "ya" },
        ],
        "see ya",
      ),
    ).toEqual([]);
  });
  it("suppresses rolling repeats without losing the phrase start", () => {
    expect(
      findSubtitleMatches(
        [
          { start: 1, end: 4, text: "see ya" },
          { start: 2, end: 5, text: "see ya next time" },
        ],
        "see ya next",
      ),
    ).toEqual([{ start: 1, end: 5, text: "see ya next" }]);
  });
  it("prefers 1080 and falls back downwards", () => {
    expect(defaultHeight([2160, 1080, 720])).toBe("1080");
    expect(defaultHeight([2160, 720, 360])).toBe("720");
  });
});

describe("widget caption decoding", () => {
  it("decodes highlighted, URL-encoded captions", () => {
    expect(cleanWidgetCaption("I%20mean%2C%20%5B%5B%5Bya%5D%5D%5D")).toBe(
      "I mean, ya",
    );
  });
  it("decodes captions that mix %uXXXX escapes with percent escapes", () => {
    expect(
      cleanWidgetCaption(
        "%u200BYeah...%20speaking%20of%20which%2C%20where%20even%20%5B%5B%5Bis%5D%5D%5D%20%5B%5B%5Bhe%5D%5D%5D%3F",
      ),
    ).toBe("Yeah... speaking of which, where even is he?");
    expect(cleanWidgetCaption("it%u2019s%20fine")).toBe("it\u2019s fine");
    expect(cleanWidgetCaption("%u200B%20")).toBe("");
    expect(cleanWidgetCaption("50%ab sure")).toBe("50%ab sure");
  });
  it("ignores blank end-of-video captions and preserves literal percent signs", () => {
    expect(cleanWidgetCaption("&nbsp;")).toBe("");
    expect(cleanWidgetCaption("100% sure &amp; ready")).toBe(
      "100% sure & ready",
    );
  });
});

describe("repeated occurrences", () => {
  const cues = [
    { start: 112, end: 113, text: "my mother looked at me and she said," },
    { start: 113.6, end: 115.9, text: '"How did they treat you?"' },
    { start: 116, end: 118, text: "I was seven. I did not understand." },
    ...Array.from({ length: 12 }, (_, n) => ({
      start: 120 + n * 10,
      end: 125 + n * 10,
      text: `unrelated filler caption number ${n}`,
    })),
    {
      start: 298,
      end: 300,
      text: "my mother's question hangs in the air for me:",
    },
    { start: 300.5, end: 302.6, text: "How did they treat you?" },
    {
      start: 303,
      end: 306,
      text: "Now, I do not raise this issue to complain",
    },
  ];
  const found = findSubtitleMatches(cues, "How did they treat you?");
  it("finds both occurrences", () => expect(found).toHaveLength(2));
  it("describes the neighbouring captions of a match", () => {
    expect(matchContext(cues, found[1])).toEqual({
      before: "my mother's question hangs in the air for me:",
      after: "Now, I do not raise this issue to complain",
    });
  });
});
