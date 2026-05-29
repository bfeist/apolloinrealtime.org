import { describe, it, expect } from "vitest";
import { timeToWakeup } from "../../src/panels/crewStatus";

const entries: CrewStatusEntry[] = [
  {
    startTimeStr: "010:00:00",
    startSeconds: 36000,
    statusHtml: "Crew at work.",
    endTimeStr: "020:00:00",
    endSeconds: 72000,
  },
  {
    startTimeStr: "020:00:00",
    startSeconds: 72000,
    statusHtml: "Crew is sleeping.",
    endTimeStr: "028:00:00",
    endSeconds: 100800,
  },
  {
    startTimeStr: "028:00:00",
    startSeconds: 100800,
    statusHtml: "Crew awake.",
    endTimeStr: "030:00:00",
    endSeconds: 108000,
  },
];

describe("timeToWakeup", () => {
  it("returns null when the current entry is not sleeping", () => {
    expect(timeToWakeup(entries, 0, 40000)).toBeNull();
    expect(timeToWakeup(entries, 2, 105000)).toBeNull();
  });

  it("returns seconds until next entry start when sleeping", () => {
    expect(timeToWakeup(entries, 1, 72000)).toBe(28800);
    expect(timeToWakeup(entries, 1, 100000)).toBe(800);
  });

  it("returns null at index out of bounds", () => {
    expect(timeToWakeup(entries, 99, 0)).toBeNull();
  });

  it("returns null when the sleeping entry is the last entry", () => {
    const sleepingLast: CrewStatusEntry[] = [
      {
        startTimeStr: "0",
        startSeconds: 0,
        statusHtml: "Crew sleeping",
        endTimeStr: "1",
        endSeconds: 100,
      },
    ];
    expect(timeToWakeup(sleepingLast, 0, 50)).toBeNull();
  });

  it("returns null when the wakeup time has already passed", () => {
    expect(timeToWakeup(entries, 1, 100800)).toBeNull();
  });
});
