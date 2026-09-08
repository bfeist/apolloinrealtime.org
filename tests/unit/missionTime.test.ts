import { describe, expect, it } from "vitest";
import { missionElapsedToGet, missionGetToElapsed } from "../../src/app/missionTime.js";
import { a11Config } from "../../src/missions/11.config.js";
import { a13Config } from "../../src/missions/13.config.js";
import { a17Config } from "../../src/missions/17.config.js";

describe("historical mission clock adjustments", () => {
  it.each([a11Config, a13Config])("keeps $name GET equal to elapsed time", (config) => {
    for (const seconds of [-config.countdownSeconds, 0, 65 * 3600, config.missionDurationSeconds]) {
      expect(missionGetToElapsed(config, seconds)).toBe(seconds);
      expect(missionElapsedToGet(config, seconds)).toBe(seconds);
    }
  });

  it("advances Apollo 17 from 064:59:59 to 067:40:00 in one real second", () => {
    expect(missionElapsedToGet(a17Config, 65 * 3600 - 1)).toBe(65 * 3600 - 1);
    expect(missionElapsedToGet(a17Config, 65 * 3600)).toBe(67 * 3600 + 40 * 60);
    expect(missionElapsedToGet(a17Config, 65 * 3600 + 0.5)).toBe(67 * 3600 + 40 * 60 + 0.5);
  });

  it("canonicalizes manually requested Apollo 17 times in the skipped interval", () => {
    for (const get of [65 * 3600, 66 * 3600, 67 * 3600 + 40 * 60 - 0.001]) {
      const elapsed = missionGetToElapsed(a17Config, get);
      expect(elapsed).toBe(65 * 3600);
      expect(missionElapsedToGet(a17Config, elapsed)).toBe(67 * 3600 + 40 * 60);
    }
  });

  it("preserves valid Apollo 17 GET links including prelaunch and the final recording", () => {
    for (const get of [-9442, -60, 0, 64 * 3600 + 59 * 60, 243600, 406918, 1100980]) {
      expect(missionElapsedToGet(a17Config, missionGetToElapsed(a17Config, get))).toBe(get);
    }
  });

  it("matches the recorded Apollo 17 landing date and full-coverage endpoint", () => {
    // commentaryData.csv at 113:01:58 gives 19:54:58 UTC on December 11.
    const launch = Date.parse(a17Config.launchDate);
    const landingGet = 113 * 3600 + 60 + 58;
    expect(new Date(launch + missionGetToElapsed(a17Config, landingGet) * 1000).toISOString()).toBe(
      "1972-12-11T19:54:58.000Z",
    );
    expect(
      new Date(
        launch + missionGetToElapsed(a17Config, a17Config.missionDurationSeconds) * 1000,
      ).toISOString(),
    ).toBe("1972-12-19T20:42:40.000Z");
  });

  it("keeps recording offsets continuous across the Apollo 17 reset", () => {
    // videoURLData.csv: the eight-hour recording spans GET 064:00 to 074:40.
    const start = missionGetToElapsed(a17Config, 64 * 3600);
    expect(missionGetToElapsed(a17Config, 65 * 3600 - 1) - start).toBe(3599);
    expect(missionGetToElapsed(a17Config, 67 * 3600 + 40 * 60) - start).toBe(3600);
    expect(missionGetToElapsed(a17Config, 74 * 3600 + 40 * 60) - start).toBe(8 * 3600);
    expect(
      missionGetToElapsed(a17Config, 75 * 3600 + 40 * 60) -
        missionGetToElapsed(a17Config, 74 * 3600 + 40 * 60),
    ).toBe(3600);
  });
});
