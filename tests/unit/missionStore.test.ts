import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { a11Config } from "../../src/missions/11.config.js";
import { a13Config } from "../../src/missions/13.config.js";
import { a17Config } from "../../src/missions/17.config.js";
import { timeIdToSeconds } from "../../src/shell/clock.js";
import { missionRealtimeGet } from "../../src/app/playback.js";
import { useMissionStore } from "../../src/store/missionStore.js";

const state = useMissionStore.getState;
let elapsed = 0;

beforeEach(() => {
  elapsed = 0;
  vi.spyOn(performance, "now").mockImplementation(() => elapsed);
  state().initialize(a13Config, "");
});

afterEach(() => vi.restoreAllMocks());

describe("mission route initialization", () => {
  it.each([a11Config, a13Config, a17Config])(
    "$name starts paused and clamps shared links to its own mission bounds",
    (config) => {
      state().initialize(config, "");
      expect(state().seconds).toBe(timeIdToSeconds(config.defaultStartTimeId));
      expect(state().playing).toBe(false);
      state().initialize(config, "?t=055:54:53");
      expect(state().seconds).toBe(201293);
      state().initialize(config, "?t=-999:00:00");
      expect(state().seconds).toBe(-config.countdownSeconds);
      state().initialize(config, "?t=999:00:00");
      expect(state().seconds).toBe(config.missionDurationSeconds);
      state().initialize(config, "?t=bad-time");
      expect(state().seconds).toBe(timeIdToSeconds(config.defaultStartTimeId));
    },
  );

  it("resolves NOW to the scheduled replay before the anniversary", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-04-08T07:55:32Z"));
    state().initialize(a13Config, "?t=rt");
    expect(state()).toMatchObject({ seconds: -127048 + 6 * 86400, realtime: true });
  });

  it.each([a11Config, a13Config])("$name validates channel links and selections", (config) => {
    state().initialize(config, "?t=000:10:00&ch=14");
    expect(state()).toMatchObject({ seconds: 600, selectedChannel: 14, rightTab: "mocr" });
    state().setRightTab("photo");
    state().selectChannel(14);
    expect(state().rightTab).toBe("mocr");

    for (const channel of ["1", "999", "-1", "14.5", "unknown"]) {
      state().initialize(config, `?ch=${channel}`);
      expect(state()).toMatchObject({ selectedChannel: 14, rightTab: "photo" });
      state().selectChannel(Number(channel));
      expect(state()).toMatchObject({ selectedChannel: 14, rightTab: "photo" });
    }
  });

  it("Apollo 17 ignores MOCR links and channel actions", () => {
    state().initialize(a17Config, "?t=118:00:00&ch=14");
    state().selectChannel(14);
    expect(state()).toMatchObject({ seconds: 424800, selectedChannel: null, rightTab: "photo" });
  });

  it("a new route clears transport, panel, search, and seek state from the previous mission", () => {
    state().seek(100);
    state().setPlaying(true);
    state().setMuted(true);
    state().setTextTab("commentary");
    state().selectChannel(14);
    state().setSearchVisible(true);
    elapsed = 5000;
    state().initialize(a17Config, "?t=022:00:00");
    expect(state()).toMatchObject({
      seconds: 79200,
      playing: false,
      muted: false,
      seekRevision: 0,
      textTab: "transcript",
      rightTab: "photo",
      selectedChannel: null,
      searchVisible: false,
      dashboardOverride: null,
    });
    elapsed = 10000;
    state().tick();
    expect(state().seconds).toBe(79200);
  });
});

describe("shared playback and UI state", () => {
  it("publishes elapsed playback time, reanchors seeks, and freezes when paused", () => {
    state().seek(100);
    state().setPlaying(true);
    elapsed = 1500;
    state().tick();
    expect(state()).toMatchObject({ seconds: 101.5, playing: true, seekRevision: 1 });
    state().seek(200);
    elapsed = 2500;
    state().tick();
    expect(state()).toMatchObject({ seconds: 201, playing: true, seekRevision: 2 });
    state().setPlaying(false);
    elapsed = 9999;
    state().tick();
    expect(state()).toMatchObject({ seconds: 201, playing: false, seekRevision: 2 });
  });

  it("stops playing when the mission endpoint is reached", () => {
    state().seek(a13Config.missionDurationSeconds - 1);
    state().setPlaying(true);
    elapsed = 3000;
    state().tick();
    expect(state()).toMatchObject({ seconds: a13Config.missionDurationSeconds, playing: false });
  });

  it("counts finite seeks even when clamped, while invalid values leave state untouched", () => {
    state().seek(-Number.MAX_VALUE);
    expect(state()).toMatchObject({ seconds: -a13Config.countdownSeconds, seekRevision: 1 });
    state().seek(Number.MAX_VALUE);
    expect(state()).toMatchObject({ seconds: a13Config.missionDurationSeconds, seekRevision: 2 });
    state().setDashboardVisible(true);
    const before = state();
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      state().seek(value);
      expect(state()).toBe(before);
    }
  });

  it("search controls dashboard visibility, and seek or close restores automatic mode", () => {
    state().setDashboardVisible(true);
    expect(state().dashboardOverride).toBe(true);
    state().setSearchVisible(true);
    expect(state()).toMatchObject({ searchVisible: true, dashboardOverride: false });
    state().setSearchVisible(false);
    expect(state()).toMatchObject({ searchVisible: false, dashboardOverride: null });
    state().setDashboardVisible(false);
    state().seek(600);
    expect(state()).toMatchObject({ seconds: 600, dashboardOverride: null });
  });
});

describe("scheduled playback", () => {
  for (const [config, startIso, endIso, repeatDays] of [
    [a11Config, "2026-07-15T16:45:52Z", "2026-07-24T19:40:31Z", 10],
    [a13Config, "2026-04-10T07:55:32Z", "2026-04-18T03:13:00Z", 8],
    [a17Config, "2026-12-07T02:55:38Z", "2026-12-19T20:42:40Z", 13],
  ] as const) {
    it(`${config.name} cuts over automatically and keeps playing through the anniversary end`, () => {
      let now = Date.parse(startIso) - 1000;
      vi.spyOn(Date, "now").mockImplementation(() => now);
      state().initialize(config, "?t=rt");
      state().setPlaying(true);
      expect(state()).toMatchObject({ realtime: true, playing: true });
      const revision = state().seekRevision;
      now += 1000;
      elapsed += 1000;
      state().tick();
      expect(state()).toMatchObject({
        seconds: -config.countdownSeconds,
        playing: true,
        realtime: true,
        seekRevision: revision + 1,
      });
      now += 1000;
      elapsed += 1000;
      state().tick();
      expect(state()).toMatchObject({
        seconds: -config.countdownSeconds + 1,
        seekRevision: revision + 1,
      });
      now = Date.parse(endIso) - 1000;
      state().tick();
      expect(state().seconds).toBe(config.missionDurationSeconds - 1);
      now += 1000;
      elapsed += 1000;
      state().tick();
      expect(state()).toMatchObject({
        seconds: missionRealtimeGet(config, now),
        playing: true,
        realtime: true,
      });
      expect(state().seconds).toBeLessThan(config.missionDurationSeconds);
    });

    it(`${config.name} repeats at scheduled boundaries and catches up after a suspended tab`, () => {
      let now = Date.parse(endIso) - repeatDays * 86400000 - 1000;
      vi.spyOn(Date, "now").mockImplementation(() => now);
      state().initialize(config, "");
      state().syncRealtime();
      expect(state().seconds).toBe(config.missionDurationSeconds - 1);
      now += 1000;
      elapsed += 1000;
      state().tick();
      expect(state()).toMatchObject({
        seconds: missionRealtimeGet(config, now),
        playing: true,
        seekRevision: 2,
      });
      now += (repeatDays + 1) * 86400000;
      state().tick();
      expect(state()).toMatchObject({ seconds: missionRealtimeGet(config, now), playing: true });
    });

    it(`${config.name} respects pause and manual seeks across the anniversary cutover`, () => {
      let now = Date.parse(startIso) - 1000;
      vi.spyOn(Date, "now").mockImplementation(() => now);
      state().initialize(config, "");
      state().syncRealtime();
      state().setPlaying(false);
      const paused = state().seconds;
      now += 1000;
      elapsed += 1000;
      state().tick();
      expect(state()).toMatchObject({ seconds: paused, playing: false, realtime: false });
      state().setPlaying(true);
      elapsed += 1000;
      state().tick();
      expect(state().seconds).toBe(paused + 1);
      state().syncRealtime();
      state().seek(3600);
      now += 86400000;
      elapsed += 1000;
      state().tick();
      expect(state()).toMatchObject({ seconds: 3601, realtime: false });
      state().syncRealtime();
      expect(state()).toMatchObject({ seconds: missionRealtimeGet(config, now), realtime: true });
    });
  }

  it("advances Apollo 17 through its historical GET reset in manual playback", () => {
    state().initialize(a17Config, "?t=064:59:59");
    state().setPlaying(true);
    elapsed = 1000;
    state().tick();
    expect(state().seconds).toBe(67 * 3600 + 40 * 60);
    elapsed = 2000;
    state().tick();
    expect(state().seconds).toBe(67 * 3600 + 40 * 60 + 1);
    state().seek(66 * 3600);
    expect(state().seconds).toBe(67 * 3600 + 40 * 60);
  });
});
