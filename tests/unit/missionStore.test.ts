import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { a11Config } from "../../src/missions/11.config.js";
import { a13Config } from "../../src/missions/13.config.js";
import { a17Config } from "../../src/missions/17.config.js";
import { timeIdToSeconds } from "../../src/shell/clock.js";
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

  it("resolves NOW to a nearby mission day, independently of the current calendar year", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 6, 20, 13));
    state().initialize(a13Config, "?t=rt");
    expect(state().seconds).toBe(3600);
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
