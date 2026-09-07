import { describe, expect, it } from "vitest";
import { MissionPlayback, missionRealtimeGet, realtimeGet } from "../../src/app/playback.js";
import { a11Config } from "../../src/missions/11.config.js";
import { a13Config } from "../../src/missions/13.config.js";
import { a17Config } from "../../src/missions/17.config.js";

describe("shared mission playback", () => {
  it("advances from elapsed time, preserves seeks while playing, and freezes on pause", () => {
    let now = 0;
    const clock = new MissionPlayback(-60, -7200, 10000, () => now);
    clock.setPlaying(true);
    now = 1500;
    expect(clock.value).toBe(-58.5);
    clock.value = 200;
    now = 2500;
    expect(clock.value).toBe(201);
    clock.setPlaying(false);
    now = 9999;
    expect(clock.value).toBe(201);
  });

  it("bounds manual seeks and playback at the mission endpoints", () => {
    let now = 0;
    const clock = new MissionPlayback(8, -60, 10, () => now);
    clock.setPlaying(true);
    now = 5000;
    expect(clock.value).toBe(10);
    clock.value = -999;
    expect(clock.value).toBe(-60);
    clock.value = Number.NaN;
    expect(clock.value).toBe(-60);
  });

  it("NOW aligns time of day without jumping decades beyond the mission", () => {
    const launch = Date.UTC(1970, 3, 11, 19, 13);
    const now = Date.UTC(2026, 8, 5, 20, 13);
    expect(realtimeGet(launch, 0, now)).toBe(3600);
  });

  it.each([a11Config, a13Config, a17Config])(
    "$name NOW preserves the mission day during its anniversary",
    (config) => {
      const launch = new Date(config.launchDate);
      launch.setUTCFullYear(2026);
      const now = launch.getTime() + 3 * 86400 * 1000;
      expect(missionRealtimeGet(config, 0, now)).toBe(3 * 86400);
      expect(missionRealtimeGet(config, 12345, now)).toBe(3 * 86400);
    },
  );

  it("keeps nearest mission-day behavior outside the anniversary", () => {
    const now = Date.UTC(2026, 8, 5, 20, 13);
    expect(missionRealtimeGet(a13Config, 0, now)).toBe(3600);
    expect(missionRealtimeGet(a13Config, 86400, now)).toBe(90000);
  });
});
