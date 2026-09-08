import { create } from "zustand";
import { parseDeepLink } from "../app/deepLink.js";
import { MissionPlayback, missionRealtimeGet } from "../app/playback.js";
import { missionElapsedToGet, missionGetToElapsed } from "../app/missionTime.js";
import { timeIdToSeconds } from "../shell/clock.js";
import { channelsFor } from "../components/mocrviz/channels.js";

export type RightTab = "photo" | "mocr" | "spacecraft" | "samples";
export type TextTab = "transcript" | "toc" | "commentary";

interface MissionState {
  seconds: number;
  playing: boolean;
  realtime: boolean;
  muted: boolean;
  seekRevision: number;
  rightTab: RightTab;
  textTab: TextTab;
  selectedChannel: number | null;
  searchVisible: boolean;
  dashboardOverride: boolean | null;
  initialize: (config: MissionConfig, search: string) => void;
  tick: () => void;
  seek: (seconds: number) => void;
  syncRealtime: () => void;
  setPlaying: (playing: boolean) => void;
  setMuted: (muted: boolean) => void;
  selectChannel: (channel: number) => void;
  setRightTab: (tab: RightTab) => void;
  setTextTab: (tab: TextTab) => void;
  setSearchVisible: (visible: boolean) => void;
  setDashboardVisible: (visible: boolean) => void;
}

// The clock measures elapsed time; Zustand publishes its value to React.
// One route-owned timer calls tick. Seeking never waits for a data request.
let clock = new MissionPlayback(0, 0, 0);
let mission: MissionConfig | null = null;
const currentGet = (): number =>
  mission ? missionElapsedToGet(mission, clock.value) : clock.value;
export const useMissionStore = create<MissionState>((set) => ({
  seconds: 0,
  playing: false,
  realtime: false,
  muted: false,
  seekRevision: 0,
  rightTab: "photo",
  textTab: "transcript",
  selectedChannel: null,
  searchVisible: false,
  dashboardOverride: null,
  initialize(config, search) {
    mission = config;
    const link = parseDeepLink(search);
    const start = timeIdToSeconds(config.defaultStartTimeId);
    const seconds =
      link.seek?.kind === "seconds"
        ? link.seek.seconds
        : link.seek?.kind === "rt"
          ? missionRealtimeGet(config)
          : start;
    clock = new MissionPlayback(
      missionGetToElapsed(config, seconds),
      -config.countdownSeconds,
      missionGetToElapsed(config, config.missionDurationSeconds),
    );
    const catalog = channelsFor(config.id);
    const linkedChannel =
      link.channel !== null && catalog?.available.includes(link.channel) ? link.channel : null;
    set({
      seconds: currentGet(),
      playing: false,
      realtime: link.seek?.kind === "rt",
      muted: false,
      seekRevision: 0,
      rightTab: linkedChannel === null ? "photo" : "mocr",
      textTab: "transcript",
      selectedChannel: linkedChannel ?? catalog?.defaultChannel ?? null,
      searchVisible: false,
      dashboardOverride: null,
    });
  },
  tick() {
    if (mission && useMissionStore.getState().realtime && clock.playing) {
      const seconds = missionRealtimeGet(mission);
      const elapsed = missionGetToElapsed(mission, seconds);
      const jumped = Math.abs(elapsed - clock.value) > 1;
      clock.value = elapsed;
      set((state) => ({
        seconds,
        seekRevision: state.seekRevision + (jumped ? 1 : 0),
        ...(jumped ? { dashboardOverride: null } : {}),
      }));
      return;
    }
    if (clock.value >= clock.maximum) clock.setPlaying(false);
    set({ seconds: currentGet(), playing: clock.playing });
  },
  seek(seconds) {
    if (!Number.isFinite(seconds)) return;
    clock.value = mission ? missionGetToElapsed(mission, seconds) : seconds;
    set((state) => ({
      seconds: currentGet(),
      realtime: false,
      seekRevision: state.seekRevision + 1,
      dashboardOverride: null,
    }));
  },
  syncRealtime() {
    if (!mission) return;
    clock.value = missionGetToElapsed(mission, missionRealtimeGet(mission));
    clock.setPlaying(true);
    set((state) => ({
      seconds: currentGet(),
      playing: true,
      realtime: true,
      seekRevision: state.seekRevision + 1,
      dashboardOverride: null,
    }));
  },
  setPlaying(playing) {
    if (playing && mission && useMissionStore.getState().realtime) {
      useMissionStore.getState().syncRealtime();
      return;
    }
    clock.setPlaying(playing);
    set({ playing, seconds: currentGet(), ...(!playing ? { realtime: false } : {}) });
  },
  setMuted: (muted) => {
    set({ muted });
  },
  selectChannel(channel) {
    if (!mission || !channelsFor(mission.id)?.available.includes(channel)) return;
    set({ selectedChannel: channel, rightTab: "mocr" });
  },
  setRightTab: (rightTab) => {
    set({ rightTab });
  },
  setTextTab: (textTab) => {
    set({ textTab });
  },
  setSearchVisible: (searchVisible) => {
    set({ searchVisible, dashboardOverride: searchVisible ? false : null });
  },
  setDashboardVisible: (dashboardOverride) => {
    set({ dashboardOverride });
  },
}));
