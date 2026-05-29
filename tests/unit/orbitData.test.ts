import { describe, it, expect, vi } from "vitest";
import { parseOrbitData, loadOrbitData, findOrbitIndex } from "../../src/data/orbitData";

describe("parseOrbitData", () => {
  it("parses rows and backfills end times (with final same-start/end zero-duration record)", () => {
    const rows = [
      ["076:02:00", "1"],
      ["078:03:00", "2"],
    ];
    const data = parseOrbitData(rows);
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0]).toEqual({
      startTimeStr: "076:02:00",
      startSeconds: 273720,
      orbitNumber: "1",
      endTimeStr: "078:03:00",
      endSeconds: 280980,
    });
    expect(data.entries[1]).toEqual({
      startTimeStr: "078:03:00",
      startSeconds: 280980,
      orbitNumber: "2",
      endTimeStr: "078:03:00",
      endSeconds: 280980,
    });
  });
});

describe("findOrbitIndex", () => {
  const data = parseOrbitData([
    ["001:00:00", "1"],
    ["002:00:00", "2"],
  ]);

  it("returns -1 before the first orbit", () => {
    expect(findOrbitIndex(data, 0)).toBe(-1);
  });

  it("finds intermediate orbits", () => {
    expect(findOrbitIndex(data, 3600)).toBe(0);
    expect(findOrbitIndex(data, 7199)).toBe(0);
  });

  it("matches zero-duration final orbit exactly", () => {
    expect(findOrbitIndex(data, 7200)).toBe(1);
    expect(findOrbitIndex(data, 7201)).toBe(-1);
  });
});

describe("loadOrbitData", () => {
  it("fetches and parses data", async () => {
    const fetchFn = vi.fn((url: string) => {
      expect(url).toBe("/13/indexes/orbitData.csv");
      return Promise.resolve(new Response("001:00:00|1\n", { status: 200 }));
    });
    const data = await loadOrbitData("/13/", {
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.endTimeStr).toBe("001:00:00");
  });
});
