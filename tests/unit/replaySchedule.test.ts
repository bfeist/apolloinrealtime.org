import { describe, expect, it } from "vitest";
import { missionRealtimeGet } from "../../src/app/playback.js";
import { missionGetToElapsed } from "../../src/app/missionTime.js";
import { a11Config } from "../../src/missions/11.config.js";
import { a13Config } from "../../src/missions/13.config.js";
import { a17Config } from "../../src/missions/17.config.js";

const day = 86400000;
for (const [config, startIso, endIso, repeatDays] of [
  [a11Config, "2026-07-15T16:45:52Z", "2026-07-24T19:40:31Z", 10],
  [a13Config, "2026-04-10T07:55:32Z", "2026-04-18T03:13:00Z", 8],
  [a17Config, "2026-12-07T02:55:38Z", "2026-12-19T20:42:40Z", 13],
] as const) {
  describe(`${config.name} UTC replay schedule`, () => {
    const start = Date.parse(startIso);
    const duration = Date.parse(endIso) - start;
    const period = repeatDays * day;

    it("plays the full recording window on regular repeats, including prelaunch and recovery", () => {
      for (const repeatsBefore of [1, 2, 10]) {
        const replayStart = start - repeatsBefore * period;
        expect(missionRealtimeGet(config, replayStart)).toBe(-config.countdownSeconds);
        expect(missionRealtimeGet(config, replayStart + 1000)).toBe(-config.countdownSeconds + 1);
        expect(missionRealtimeGet(config, replayStart + duration - 1000)).toBe(
          config.missionDurationSeconds - 1,
        );
      }
    });

    it("repeats the final day after coverage ends rather than freezing or leaving valid GET", () => {
      const end = start - period + duration;
      const before = missionGetToElapsed(config, missionRealtimeGet(config, end - 1000));
      const after = missionGetToElapsed(config, missionRealtimeGet(config, end));
      expect(after - before).toBe(1 - 86400);
      expect(missionRealtimeGet(config, start - 1)).toBeGreaterThan(0);
      expect(missionRealtimeGet(config, start)).toBe(-config.countdownSeconds);
      expect(missionRealtimeGet(config, start + 1000)).toBe(-config.countdownSeconds + 1);
    });

    it("stays in coverage and preserves UTC time of day throughout ordinary and leap years", () => {
      for (const year of [2026, 2028]) {
        // Includes all month ends, leap day, DST dates, and both anniversary boundaries.
        for (
          let now = Date.UTC(year, 0, 1, 23, 59, 59, 123);
          now < Date.UTC(year + 1, 0, 1);
          now += day
        ) {
          const get = missionRealtimeGet(config, now);
          expect(get).toBeGreaterThanOrEqual(-config.countdownSeconds);
          expect(get).toBeLessThan(config.missionDurationSeconds);
          const historical =
            Date.parse(config.launchDate) + missionGetToElapsed(config, get) * 1000;
          expect(((historical % day) + day) % day).toBeCloseTo(now % day, 2);
        }
      }
    });

    it("has no arbitrary reset at month ends, New Year, or leap day", () => {
      for (const iso of [
        "2027-01-01T00:00:00Z",
        "2026-06-01T00:00:00Z",
        "2028-02-29T00:00:00Z",
        "2028-03-01T00:00:00Z",
      ]) {
        const now = Date.parse(iso);
        const before = missionGetToElapsed(config, missionRealtimeGet(config, now - 1000));
        const after = missionGetToElapsed(config, missionRealtimeGet(config, now));
        expect(after - before).toBe(1);
      }
    });
  });
}
