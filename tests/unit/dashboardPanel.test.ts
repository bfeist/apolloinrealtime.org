import { describe, it, expect } from "vitest";
import { missionDay } from "../../src/panels/dashboard";

describe("missionDay", () => {
  it("returns 1 from launch through end of day 1", () => {
    expect(missionDay(0)).toBe(1);
    expect(missionDay(60)).toBe(1);
    expect(missionDay(86399)).toBe(1);
  });

  it("rolls to day 2 at 24h", () => {
    expect(missionDay(86400)).toBe(2);
  });

  it("returns sequential days", () => {
    expect(missionDay(86400 * 2)).toBe(3);
    expect(missionDay(86400 * 6 + 1)).toBe(7);
  });
});
