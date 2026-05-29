import { describe, it, expect, vi } from "vitest";
import {
  parseVideoSegmentData,
  loadVideoSegmentData,
  findVideoSegmentIndex,
} from "../../src/data/videoSegmentData";

// Sampled from public/13/indexes/videoSegmentData.csv (first 4 rows).
const SAMPLE_ROWS: string[][] = [
  ["-35:17:28", "-35:06:46", ""],
  ["-04:19:58", "-04:18:14", ""],
  ["-04:05:00", "-04:04:20", ""],
  ["-03:49:27", "-03:47:40", ""],
];

describe("parseVideoSegmentData", () => {
  it("parses rows into typed segments with numeric bounds", () => {
    const data = parseVideoSegmentData(SAMPLE_ROWS);
    expect(data.segments).toHaveLength(4);
    expect(data.segments[0]).toEqual({
      startTimeStr: "-35:17:28",
      endTimeStr: "-35:06:46",
      startSeconds: -127048,
      endSeconds: -126406,
      extra: "",
    });
  });

  it("skips empty leading-field rows", () => {
    const data = parseVideoSegmentData([...SAMPLE_ROWS, [""], ["", "-04:00:00", ""]]);
    expect(data.segments).toHaveLength(SAMPLE_ROWS.length);
  });

  it("preserves the third column as `extra`", () => {
    const data = parseVideoSegmentData([["000:00:00", "000:01:00", "future-flag"]]);
    expect(data.segments[0]?.extra).toBe("future-flag");
  });

  it("returns NaN endSeconds for rows with missing end", () => {
    const data = parseVideoSegmentData([["000:00:00", "", ""]]);
    expect(data.segments[0]?.endSeconds).toBeNaN();
  });

  it("returns empty for empty input", () => {
    expect(parseVideoSegmentData([]).segments).toEqual([]);
  });
});

describe("findVideoSegmentIndex", () => {
  const data = parseVideoSegmentData(SAMPLE_ROWS);

  it("returns -1 before the first segment", () => {
    expect(findVideoSegmentIndex(data, -200000)).toBe(-1);
  });

  it("returns the segment index for times inside a segment", () => {
    expect(findVideoSegmentIndex(data, -127048)).toBe(0); // exact start
    expect(findVideoSegmentIndex(data, -126500)).toBe(0); // mid segment 0
    expect(findVideoSegmentIndex(data, -126405)).toBe(-1); // just past segment 0 end
    expect(findVideoSegmentIndex(data, -15598)).toBe(1); // mid segment 1 (-04:19:58 .. -04:18:14)
  });

  it("returns -1 in gaps between segments", () => {
    expect(findVideoSegmentIndex(data, -100000)).toBe(-1); // big gap after segment 0
  });

  it("returns -1 after the last segment ends", () => {
    expect(findVideoSegmentIndex(data, 0)).toBe(-1);
  });

  it("treats NaN endSeconds as open-ended", () => {
    const open = parseVideoSegmentData([["000:00:00", "", ""]]);
    expect(findVideoSegmentIndex(open, 9999)).toBe(0);
  });

  it("returns -1 on an empty list", () => {
    expect(findVideoSegmentIndex(parseVideoSegmentData([]), 0)).toBe(-1);
  });
});

describe("loadVideoSegmentData", () => {
  it("fetches `<mediaRoot>indexes/videoSegmentData.csv` and parses it", async () => {
    const fetchFn = vi.fn((url: string) => {
      expect(url).toBe("/13/indexes/videoSegmentData.csv");
      return Promise.resolve(
        new Response("000:00:00|000:01:00|\n000:02:00|000:03:00|\n", { status: 200 }),
      );
    });
    const data = await loadVideoSegmentData("/13/", {
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(data.segments).toHaveLength(2);
    expect(data.segments[1]?.endSeconds).toBe(180);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("propagates HTTP errors", async () => {
    const fetchFn = vi.fn(() =>
      Promise.resolve(new Response("nope", { status: 404, statusText: "Not Found" })),
    );
    await expect(
      loadVideoSegmentData("/13/", { fetchFn: fetchFn as unknown as typeof fetch }),
    ).rejects.toThrow(/404 Not Found/);
  });
});
