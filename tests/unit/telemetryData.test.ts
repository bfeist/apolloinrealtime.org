import { describe, it, expect, vi } from "vitest";
import {
  parseTelemetryData,
  loadTelemetryData,
  findTelemetryIndex,
} from "../../src/data/telemetryData";

describe("parseTelemetryData", () => {
  it("parses rows and backfills end times", () => {
    const rows = [
      ["-35:17:28", "0", "0", "240000", "5000"],
      ["000:00:00", "1500", "1.2", "239000", "4000"],
    ];
    const data = parseTelemetryData(rows, { missionDurationSeconds: 7200 });
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0]).toEqual({
      startTimeStr: "-35:17:28",
      startSeconds: -127048,
      velocityEarth: 0,
      distanceEarth: 0,
      distanceMoon: 240000,
      velocityMoon: 5000,
      endTimeStr: "000:00:00",
      endSeconds: 0,
    });
    expect(data.entries[1]).toEqual({
      startTimeStr: "000:00:00",
      startSeconds: 0,
      velocityEarth: 1500,
      distanceEarth: 1.2,
      distanceMoon: 239000,
      velocityMoon: 4000,
      endTimeStr: "002:00:00",
      endSeconds: 7200,
    });
  });
});

describe("findTelemetryIndex", () => {
  const data = parseTelemetryData(
    [
      ["001:00:00", "", "", "", ""],
      ["002:00:00", "", "", "", ""],
    ],
    { missionDurationSeconds: 10800 },
  );

  it("returns -1 before the first telemetry", () => {
    expect(findTelemetryIndex(data, 0)).toBe(-1);
  });

  it("finds the covering segment index", () => {
    expect(findTelemetryIndex(data, 3600)).toBe(0);
    expect(findTelemetryIndex(data, 7199)).toBe(0);
    expect(findTelemetryIndex(data, 7200)).toBe(1);
    expect(findTelemetryIndex(data, 10799)).toBe(1);
    expect(findTelemetryIndex(data, 10800)).toBe(-1);
  });
});

describe("loadTelemetryData", () => {
  it("fetches and parses data", async () => {
    const fetchFn = vi.fn((url: string) => {
      expect(url).toBe("/13/indexes/telemetryData.csv");
      return Promise.resolve(new Response("001:00:00|0|0|240000|1000\n", { status: 200 }));
    });
    const data = await loadTelemetryData("/13/", {
      missionDurationSeconds: 7200,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.endTimeStr).toBe("002:00:00");
  });
});
