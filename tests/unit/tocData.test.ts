import { describe, it, expect, vi } from "vitest";
import {
  parseTocData,
  loadTocData,
  findClosestTocIndex,
  type TocData,
} from "../../src/data/tocData";

const SAMPLE_ROWS: string[][] = [
  ["-351728", "1", "Countdown"],
  ["-230405", "2", "Press conference announcing crew change (audio)"],
  ["-041958", "2", "Crew eating breakfast"],
  ["0000000", "1", "Launch"],
  ["0050000", "2", "Translunar injection"],
];

describe("parseTocData", () => {
  it("parses rows into typed entries", () => {
    const toc = parseTocData(SAMPLE_ROWS);
    expect(toc.entries).toHaveLength(5);
    expect(toc.entries[0]).toEqual({
      timeId: "-351728",
      timeStr: "-35:17:28",
      seconds: -127048,
      level: 1,
      label: "Countdown",
    });
    expect(toc.entries[3]?.seconds).toBe(0);
    expect(toc.entries[3]?.timeStr).toBe("000:00:00");
  });

  it("treats unknown level as 2", () => {
    expect(parseTocData([["0010000", "9", "Weird"]]).entries[0]?.level).toBe(2);
    expect(parseTocData([["0010000", "", "Empty"]]).entries[0]?.level).toBe(2);
  });

  it("skips empty leading-field rows (matches legacy guard)", () => {
    const rows: string[][] = [...SAMPLE_ROWS, [""], ["", "1", "ignored"]];
    expect(parseTocData(rows).entries).toHaveLength(SAMPLE_ROWS.length);
  });

  it("builds timeIds in file order", () => {
    const toc = parseTocData(SAMPLE_ROWS);
    expect(toc.timeIds).toEqual(["-351728", "-230405", "-041958", "0000000", "0050000"]);
  });

  it("builds byTimeId lookup", () => {
    const toc = parseTocData(SAMPLE_ROWS);
    expect(toc.byTimeId.get("-041958")).toBe(2);
    expect(toc.byTimeId.get("0050000")).toBe(4);
    expect(toc.byTimeId.get("missing")).toBeUndefined();
  });

  it("returns empty views for empty input", () => {
    const toc = parseTocData([]);
    expect(toc.entries).toEqual([]);
    expect(toc.timeIds).toEqual([]);
    expect(toc.byTimeId.size).toBe(0);
  });

  it("handles missing optional columns", () => {
    const toc = parseTocData([["0010000"]]);
    expect(toc.entries[0]).toEqual({
      timeId: "0010000",
      timeStr: "001:00:00",
      seconds: 3600,
      level: 2,
      label: "",
    });
  });
});

describe("findClosestTocIndex", () => {
  const toc: TocData = parseTocData(SAMPLE_ROWS);

  it("returns -1 before the first entry", () => {
    expect(findClosestTocIndex(toc, -200000)).toBe(-1);
  });

  it("returns the exact match when seconds lands on an entry", () => {
    expect(findClosestTocIndex(toc, -127048)).toBe(0); // first entry exactly
    expect(findClosestTocIndex(toc, 0)).toBe(3); // launch
    expect(findClosestTocIndex(toc, 18000)).toBe(4); // TLI exactly
  });

  it("returns the previous entry between entries", () => {
    expect(findClosestTocIndex(toc, -100000)).toBe(0); // between rows 0 and 1
    expect(findClosestTocIndex(toc, -50000)).toBe(1); // between rows 1 and 2
    expect(findClosestTocIndex(toc, 1)).toBe(3); // just past launch
    expect(findClosestTocIndex(toc, 17999)).toBe(3); // one second before TLI
  });

  it("returns the last entry past the end", () => {
    expect(findClosestTocIndex(toc, 999999)).toBe(4);
  });

  it("returns -1 on an empty TOC", () => {
    expect(findClosestTocIndex(parseTocData([]), 0)).toBe(-1);
  });
});

describe("loadTocData", () => {
  it("fetches `<mediaRoot>indexes/TOCData.csv` and parses it", async () => {
    const fetchFn = vi.fn((url: string) => {
      expect(url).toBe("/13/indexes/TOCData.csv");
      return Promise.resolve(
        new Response("-351728|1|Countdown\n0000000|1|Launch\n", {
          status: 200,
        }),
      );
    });
    const toc = await loadTocData("/13/", { fetchFn: fetchFn as unknown as typeof fetch });
    expect(toc.entries).toHaveLength(2);
    expect(toc.entries[1]?.label).toBe("Launch");
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("propagates HTTP errors from the underlying loader", async () => {
    const fetchFn = vi.fn(() =>
      Promise.resolve(new Response("nope", { status: 404, statusText: "Not Found" })),
    );
    await expect(
      loadTocData("/13/", { fetchFn: fetchFn as unknown as typeof fetch }),
    ).rejects.toThrow(/404/);
  });
});
