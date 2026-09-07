import { describe, expect, it } from "vitest";
import { missionAnniversary } from "../../src/app/anniversary.js";
import { missionRealtimeGet } from "../../src/app/playback.js";
import { a11Config } from "../../src/missions/11.config.js";
import { a13Config } from "../../src/missions/13.config.js";
import { a17Config } from "../../src/missions/17.config.js";

for (const [config, coverageStart, coverageEnd, historicYear] of [
  [a11Config, "2026-07-15T16:45:52Z", "2026-07-24T19:40:31Z", 1969],
  [a13Config, "2026-04-10T07:55:32Z", "2026-04-18T03:13:00Z", 1970],
  [a17Config, "2026-12-07T02:55:38Z", "2026-12-19T23:22:40Z", 1972],
] as const) {
  describe(`${config.name} calendar anniversary`, () => {
    for (const year of [2026, 2027, 2028, 2100]) {
      it(`rolls over at the first prelaunch recording in ${String(year)}`, () => {
        const start = new Date(coverageStart).setUTCFullYear(year);
        expect(missionAnniversary(config, start - 1)).toMatchObject({
          years: year - historicYear - 1,
          isAnniversary: false,
        });
        expect(missionAnniversary(config, start)).toMatchObject({
          years: year - historicYear,
          isAnniversary: true,
        });
      });
    }
    it("syncs to the first prelaunch recording independently of the selected GET", () => {
      const start = Date.parse(coverageStart);
      expect(missionRealtimeGet(config, 0, start)).toBe(-config.countdownSeconds);
      expect(missionRealtimeGet(config, 86400, start + 1000)).toBe(-config.countdownSeconds + 1);
    });
    it("keeps Exactly until the full recording coverage endpoint", () => {
      const end = Date.parse(coverageEnd);
      expect(missionAnniversary(config, end - 1)).toMatchObject({
        years: 2026 - historicYear,
        isAnniversary: true,
      });
      expect(missionAnniversary(config, end)).toMatchObject({
        years: 2026 - historicYear,
        isAnniversary: false,
      });
      expect(missionAnniversary(config, Date.UTC(2027, 0, 1))).toMatchObject({
        years: 2026 - historicYear,
        isAnniversary: false,
      });
    });
    it("keeps Now in the post-splashdown coverage instead of wrapping to launch day", () => {
      const now = Date.parse(coverageEnd) - 1000;
      expect(missionRealtimeGet(config, 0, now)).toBe(config.missionDurationSeconds - 1);
    });
  });
}

it("uses each configured coverage duration rather than a fixed recovery allowance", () => {
  const config = { ...a13Config, missionDurationSeconds: a13Config.missionDurationSeconds + 86400 };
  expect(missionAnniversary(config, Date.parse("2026-04-19T03:12:59Z")).isAnniversary).toBe(true);
  expect(missionAnniversary(config, Date.parse("2026-04-19T03:13:00Z")).isAnniversary).toBe(false);
});

it("uses the configured prelaunch coverage rather than a fixed countdown allowance", () => {
  const config = { ...a13Config, countdownSeconds: a13Config.countdownSeconds + 86400 };
  expect(missionAnniversary(config, Date.parse("2026-04-09T07:55:31Z")).isAnniversary).toBe(false);
  expect(missionAnniversary(config, Date.parse("2026-04-09T07:55:32Z")).isAnniversary).toBe(true);
});

it("uses the same UTC boundary for viewers in different time zones", () => {
  expect(missionAnniversary(a13Config, Date.parse("2026-04-10T03:55:32-04:00"))).toEqual(
    missionAnniversary(a13Config, Date.parse("2026-04-10T16:55:32+09:00")),
  );
});
