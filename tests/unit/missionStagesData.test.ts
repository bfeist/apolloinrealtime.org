import { describe, it, expect, vi } from "vitest";
import {
  parseMissionStagesData,
  loadMissionStagesData,
  findStageIndex,
} from "../../src/data/missionStagesData";

// Sampled from public/13/indexes/missionStagesData.csv (first 4 rows).
const SAMPLE_ROWS: string[][] = [
  ["-35:17:28", "Countdown", "Counting down to launch"],
  ["000:00:00", "Launch", "Launching into orbit around the Earth"],
  ["000:11:42", "Earth Orbit", "Orbiting the Earth, preparing to go to the moon"],
  ["002:35:51", "On the Way to the Moon", "Travelling to the moon"],
];

// A13 mission duration in seconds (approx): 142h 54m 41s = 514481.
const A13_MISSION_DURATION = 514481;

describe("parseMissionStagesData", () => {
  it("parses rows into typed stages and back-fills end times", () => {
    const data = parseMissionStagesData(SAMPLE_ROWS, {
      missionDurationSeconds: A13_MISSION_DURATION,
    });
    expect(data.stages).toHaveLength(4);
    expect(data.stages[0]).toEqual({
      timeStr: "-35:17:28",
      seconds: -127048,
      name: "Countdown",
      description: "Counting down to launch",
      endTimeStr: "000:00:00",
      endSeconds: 0,
    });
    expect(data.stages[1]?.endSeconds).toBe(data.stages[2]?.seconds);
    expect(data.stages[3]?.endSeconds).toBe(A13_MISSION_DURATION);
    expect(data.stages[3]?.endTimeStr).toBe("142:54:41");
  });

  it("skips empty leading-field rows", () => {
    const data = parseMissionStagesData([...SAMPLE_ROWS, [""], ["", "ignored", "ignored"]], {
      missionDurationSeconds: A13_MISSION_DURATION,
    });
    expect(data.stages).toHaveLength(SAMPLE_ROWS.length);
  });

  it("returns empty for empty input", () => {
    const data = parseMissionStagesData([], { missionDurationSeconds: 0 });
    expect(data.stages).toEqual([]);
  });

  it("handles missing optional columns", () => {
    const data = parseMissionStagesData([["000:00:00"]], {
      missionDurationSeconds: 60,
    });
    expect(data.stages[0]).toEqual({
      timeStr: "000:00:00",
      seconds: 0,
      name: "",
      description: "",
      endTimeStr: "000:01:00",
      endSeconds: 60,
    });
  });
});

describe("findStageIndex", () => {
  const data = parseMissionStagesData(SAMPLE_ROWS, {
    missionDurationSeconds: A13_MISSION_DURATION,
  });

  it("returns -1 before the first stage", () => {
    expect(findStageIndex(data, -200000)).toBe(-1);
  });

  it("returns -1 at or after the mission end", () => {
    expect(findStageIndex(data, A13_MISSION_DURATION)).toBe(-1);
    expect(findStageIndex(data, A13_MISSION_DURATION + 1)).toBe(-1);
  });

  it("returns the containing stage index for interior times", () => {
    expect(findStageIndex(data, -127048)).toBe(0); // exact start of countdown
    expect(findStageIndex(data, -1)).toBe(0); // last second of countdown
    expect(findStageIndex(data, 0)).toBe(1); // exact start of launch
    expect(findStageIndex(data, 700)).toBe(1); // 11m 40s — still in launch (ends at 11:42)
    expect(findStageIndex(data, 702)).toBe(2); // 11m 42s — start of earth orbit
    expect(findStageIndex(data, 9350)).toBe(2); // mid earth orbit
    expect(findStageIndex(data, 9351)).toBe(3); // 002:35:51 — on the way to the moon
    expect(findStageIndex(data, 500000)).toBe(3); // still in last stage
  });

  it("returns -1 on an empty list", () => {
    expect(findStageIndex(parseMissionStagesData([], { missionDurationSeconds: 0 }), 0)).toBe(-1);
  });
});

describe("loadMissionStagesData", () => {
  it("fetches `<mediaRoot>indexes/missionStagesData.csv` and parses it", async () => {
    const fetchFn = vi.fn((url: string) => {
      expect(url).toBe("/13/indexes/missionStagesData.csv");
      return Promise.resolve(
        new Response("000:00:00|Launch|Launching\n000:11:42|Orbit|Orbiting\n", { status: 200 }),
      );
    });
    const data = await loadMissionStagesData("/13/", {
      missionDurationSeconds: 1000,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(data.stages).toHaveLength(2);
    expect(data.stages[1]?.endSeconds).toBe(1000);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("propagates HTTP errors", async () => {
    const fetchFn = vi.fn(() =>
      Promise.resolve(new Response("nope", { status: 404, statusText: "Not Found" })),
    );
    await expect(
      loadMissionStagesData("/13/", {
        missionDurationSeconds: 1000,
        fetchFn: fetchFn,
      }),
    ).rejects.toThrow(/404 Not Found/);
  });
});
