import { describe, it, expect } from "vitest";
import { buildSearchIndex, searchIndex } from "../../src/panels/search";

const utterances: UtteranceData = {
  entries: [
    {
      timeId: "0000000",
      timeStr: "000:00:00",
      seconds: 0,
      speaker: "PAO",
      words: "We have liftoff.",
      extra: "P",
    },
    {
      timeId: "0000100",
      timeStr: "000:01:00",
      seconds: 60,
      speaker: "CDR",
      words: "Roger, Houston.",
      extra: "",
    },
  ],
  timeIds: ["0000000", "0000100"],
  byTimeId: new Map([
    ["0000000", 0],
    ["0000100", 1],
  ]),
};

const commentary: CommentaryData = {
  entries: [
    {
      timeId: "0000000",
      timeStr: "000:00:00",
      seconds: 0,
      source: "AFJ",
      speaker: "",
      text: "Houston confirms liftoff.",
    },
  ],
  timeIds: ["0000000"],
  byTimeId: new Map([["0000000", 0]]),
};

const photos: PhotoData = {
  entries: [
    {
      timeId: "0000005",
      timeStr: "000:00:05",
      seconds: 5,
      photoId: "AS13-60-8582",
      filename: "AS13-60-8582.jpg",
      supportingFilename: "",
      description: "View of Earth at liftoff.",
      credit: "NASA",
    },
  ],
  timeIds: ["0000005"],
  byTimeId: new Map([["0000005", 0]]),
};

describe("buildSearchIndex", () => {
  it("returns empty array for empty sources", () => {
    expect(buildSearchIndex({})).toEqual([]);
  });

  it("concatenates utterances, commentary, photos in order", () => {
    const idx = buildSearchIndex({ utterances, commentary, photos });
    expect(idx.map((i) => i.kind)).toEqual(["transcript", "transcript", "commentary", "photo"]);
  });

  it("classifies utterances by speaker code", () => {
    const idx = buildSearchIndex({ utterances });
    expect(idx[0]?.uttType).toBe("utt_pao");
    expect(idx[1]?.uttType).toBe("utt_crew");
  });
});

describe("searchIndex", () => {
  const items = buildSearchIndex({ utterances, commentary, photos });

  it("returns [] for queries shorter than 2 characters", () => {
    expect(searchIndex(items, "")).toEqual([]);
    expect(searchIndex(items, "a")).toEqual([]);
  });

  it("matches case-insensitively across all kinds", () => {
    const hits = searchIndex(items, "liftoff");
    expect(hits.map((h) => h.item.kind)).toEqual(["transcript", "commentary", "photo"]);
  });

  it("reports the match position within words", () => {
    const hits = searchIndex(items, "Houston");
    expect(hits).toHaveLength(2);
    expect(hits[0]?.item.kind).toBe("transcript");
    expect(hits[0]?.matchStart).toBe(7);
    expect(hits[0]?.matchLength).toBe(7);
  });

  it("respects the max-hits cap", () => {
    expect(searchIndex(items, "e", 100)).toEqual([]); // single char filtered
    const many = searchIndex(items, "of", 1);
    expect(many.length).toBeLessThanOrEqual(1);
  });
});
