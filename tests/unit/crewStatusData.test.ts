import { describe, it, expect, vi } from "vitest";
import {
  parseCrewStatusData,
  loadCrewStatusData,
  findCrewStatusIndex,
} from "../../src/data/crewStatusData";

describe("parseCrewStatusData", () => {
  it("parses rows and backfills end times", () => {
    const rows = [
      ["-35:17:28", "Preparing for Launch"],
      ["000:00:00", "In Command Module"],
    ];
    const data = parseCrewStatusData(rows, { missionDurationSeconds: 100000 });
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0]).toEqual({
      startTimeStr: "-35:17:28",
      startSeconds: -127048,
      statusHtml: "Preparing for Launch",
      endTimeStr: "000:00:00",
      endSeconds: 0,
    });
    expect(data.entries[1]).toEqual({
      startTimeStr: "000:00:00",
      startSeconds: 0,
      statusHtml: "In Command Module",
      endTimeStr: "027:46:40", // 100000 sec
      endSeconds: 100000,
    });
  });
});

describe("findCrewStatusIndex", () => {
  const data = parseCrewStatusData(
    [
      ["001:00:00", "State 1"],
      ["002:00:00", "State 2"],
    ],
    { missionDurationSeconds: 10800 },
  );

  it("returns -1 before the first status", () => {
    expect(findCrewStatusIndex(data, 0)).toBe(-1);
  });

  it("finds the covering segment index", () => {
    expect(findCrewStatusIndex(data, 3600)).toBe(0);
    expect(findCrewStatusIndex(data, 7199)).toBe(0);
    expect(findCrewStatusIndex(data, 7200)).toBe(1);
    expect(findCrewStatusIndex(data, 10799)).toBe(1);
    expect(findCrewStatusIndex(data, 10800)).toBe(-1);
  });
});

describe("loadCrewStatusData", () => {
  it("fetches and parses data", async () => {
    const fetchFn = vi.fn((url: string) => {
      expect(url).toBe("/13/indexes/crewStatusData.csv");
      return Promise.resolve(new Response("001:00:00|Pre-launch\n", { status: 200 }));
    });
    const data = await loadCrewStatusData("/13/", {
      missionDurationSeconds: 7200,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.endTimeStr).toBe("002:00:00");
  });
});
