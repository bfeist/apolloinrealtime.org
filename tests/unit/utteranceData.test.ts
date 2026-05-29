import { describe, it, expect, vi } from "vitest";
import {
  parseUtteranceData,
  loadUtteranceData,
  findClosestUtteranceIndex,
} from "../../src/data/utteranceData";

describe("parseUtteranceData", () => {
  it("parses rows into typed utterance entries", () => {
    const rows = [
      ["-044959", "PAO", "This is Apollo Saturn...", "P"],
      ["000:01:00", "CDR", "Roger that", ""],
    ];
    const data = parseUtteranceData(rows);
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0]).toEqual({
      timeId: "-044959",
      timeStr: "-04:49:59",
      seconds: -17399,
      speaker: "PAO",
      words: "This is Apollo Saturn...",
      extra: "P",
    });
    expect(data.entries[1]?.extra).toBe("");
  });

  it("skips empty timeId rows", () => {
    const rows = [
      ["", "PAO", "Skipped", ""],
      ["000:01:00", "CDR", "Kept", ""],
    ];
    const data = parseUtteranceData(rows);
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.timeId).toBe("000:01:00");
  });
});

describe("findClosestUtteranceIndex", () => {
  const data = parseUtteranceData([
    ["0010000", "PAO", "First", "P"],
    ["0020000", "CDR", "Second", ""],
    ["0033000", "CC", "Third", ""],
  ]);

  it("returns -1 before first utterance", () => {
    expect(findClosestUtteranceIndex(data, 0)).toBe(-1);
  });

  it("returns index of closest utterance <= seconds", () => {
    expect(findClosestUtteranceIndex(data, 3600)).toBe(0);
    expect(findClosestUtteranceIndex(data, 4500)).toBe(0);
    expect(findClosestUtteranceIndex(data, 7200)).toBe(1);
    expect(findClosestUtteranceIndex(data, 200000)).toBe(2);
  });
});

describe("loadUtteranceData", () => {
  it("fetches and parses csv", async () => {
    const fetchFn = vi.fn((url: string) => {
      expect(url).toBe("/13/indexes/utteranceData.csv");
      return Promise.resolve(new Response("001:00:00|PAO|Hello World|\n", { status: 200 }));
    });
    const data = await loadUtteranceData("/13/", {
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.words).toBe("Hello World");
  });
});
