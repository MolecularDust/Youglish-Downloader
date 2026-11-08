import { describe, it, expect } from "vitest";
import { safeFileName, fileNameNeedsFix } from "./domain";

describe("portable file names", () => {
  it("removes incompatible characters and preserves readable Unicode", () => {
    expect(safeFileName('Who: café / tea? <yes> | "no"*\\')).toBe(
      "Who café  tea yes  no",
    );
    expect(safeFileName("hello\nworld\u007f")).toBe("helloworld");
    expect(fileNameNeedsFix("Who: café?")).toBe(true);
    expect(fileNameNeedsFix("café hello.mp4")).toBe(false);
  });
  it("accepts a sentence-final period, matching the backend", () => {
    const name = "Oh. I'm gonna earmuff my grandma when she watches this.";
    expect(fileNameNeedsFix(name)).toBe(false);
    expect(safeFileName(name)).toBe(name);
    expect(fileNameNeedsFix("clip ")).toBe(false);
  });
  it("handles empty names, reserved Windows names, trailing dots, and UTF-8 limits", () => {
    for (const name of ["", "...", "/?:*"])
      expect(safeFileName(name)).toBe("Speech sample");
    expect(safeFileName("CON.txt")).toBe("_CON.txt");
    expect(safeFileName("clip. ")).toBe("clip.");
    expect(safeFileName("CONIN$")).toBe("_CONIN$");
    expect(safeFileName("COM\u00b9.txt")).toBe("_COM\u00b9.txt");
    expect(safeFileName("a\u2028b")).toBe("ab");
    const name = safeFileName("🙂".repeat(100));
    expect(new TextEncoder().encode(name).length).toBeLessThanOrEqual(180);
    expect(name).not.toContain("\ufffd");
    expect(fileNameNeedsFix("a".repeat(181))).toBe(true);
  });
});
