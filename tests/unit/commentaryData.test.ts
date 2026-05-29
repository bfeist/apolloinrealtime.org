import { describe, it, expect, vi } from "vitest";
import {
  parseCommentaryData,
  loadCommentaryData,
  findClosestCommentaryIndex,
} from "../../src/data/commentaryData";

describe("parseCommentaryData", () => {
  it("parses 2-column A13 format", () => {
    const rows = [
      ["-013008", "The Boost Protective Cover shields..."],
      ["-012456", "They are likely checking..."],
    ];
    const data = parseCommentaryData(rows);
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0]).toEqual({
      timeId: "-013008",
      timeStr: "-01:30:08",
      seconds: -5408,
      source: "",
      speaker: "",
      text: "The Boost Protective Cover shields...",
    });
  });

  it("parses 4-column A11/A17 format", () => {
    const rows = [
      ["-024044", "AFJ", "CDR", "The transcript begins..."],
      ["-022352", "ALSJ", "", "In fact, Fred Haise is..."],
    ];
    const data = parseCommentaryData(rows);
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0]).toEqual({
      timeId: "-024044",
      timeStr: "-02:40:44",
      seconds: -9644,
      source: "AFJ",
      speaker: "CDR",
      text: "The transcript begins...",
    });
    expect(data.entries[1]?.source).toBe("ALSJ");
    expect(data.entries[1]?.speaker).toBe("");
  });

  it("skips rows with empty timeId", () => {
    const rows = [
      ["", "ALSJ", "", "Skipped commentary"],
      ["-022352", "ALSJ", "", "Kept"],
    ];
    const data = parseCommentaryData(rows);
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.timeId).toBe("-022352");
  });
});

describe("findClosestCommentaryIndex", () => {
  const data = parseCommentaryData([
    ["0010000", "ALSJ", "CDR", "First"],
    ["0020000", "ALSJ", "CDR", "Second"],
    ["0033000", "ALSJ", "CDR", "Third"],
  ]);

  it("returns -1 before the first entry", () => {
    expect(findClosestCommentaryIndex(data, 0)).toBe(-1);
  });

  it("returns closest entry index matching <= seconds", () => {
    expect(findClosestCommentaryIndex(data, 3600)).toBe(0); // 01:00:00
    expect(findClosestCommentaryIndex(data, 5000)).toBe(0); // Before second
    expect(findClosestCommentaryIndex(data, 7200)).toBe(1); // 02:00:00
    expect(findClosestCommentaryIndex(data, 9000)).toBe(1); // before third
    expect(findClosestCommentaryIndex(data, 12600)).toBe(2); // 03:30:00
    expect(findClosestCommentaryIndex(data, 999999)).toBe(2); // way past end
  });

  it("returns -1 on empty list", () => {
    expect(findClosestCommentaryIndex(parseCommentaryData([]), 3600)).toBe(-1);
  });
});

describe("loadCommentaryData", () => {
  it("fetches and parses data", async () => {
    const fetchFn = vi.fn((url: string) => {
      expect(url).toBe("/13/indexes/commentaryData.csv");
      return Promise.resolve(new Response("-013008|The Boost Protective Cover\n", { status: 200 }));
    });
    const data = await loadCommentaryData("/13/", {
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.text).toBe("The Boost Protective Cover");
  });
});
