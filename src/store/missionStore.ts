import { create } from "zustand";
import { parseDeepLink } from "../app/deepLink.js";
import { MissionPlayback, realtimeGet } from "../app/playback.js";
import { timeIdToSeconds } from "../shell/clock.js";
import { channelsFor } from "../components/mocrviz/channels.js";

export type RightTab = "photo" | "mocr" | "spacecraft" | "samples";
export type TextTab = "transcript" | "toc" | "commentary";

interface MissionState {
  seconds: number;
  playing: boolean;
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
export const useMissionStore = create<MissionState>((set) => ({
  seconds: 0,
  playing: false,
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
          ? realtimeGet(Date.parse(config.launchDate), start)
          : start;
    clock = new MissionPlayback(seconds, -config.countdownSeconds, config.missionDurationSeconds);
    const catalog = channelsFor(config.id);
    const linkedChannel =
      link.channel !== null && catalog?.available.includes(link.channel) ? link.channel : null;
    set({
      seconds: clock.value,
      playing: false,
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
    if (clock.value >= clock.maximum) clock.setPlaying(false);
    set({ seconds: clock.value, playing: clock.playing });
  },
  seek(seconds) {
    if (!Number.isFinite(seconds)) return;
    clock.value = seconds;
    set((state) => ({
      seconds: clock.value,
      seekRevision: state.seekRevision + 1,
      dashboardOverride: null,
    }));
  },
  setPlaying(playing) {
    clock.setPlaying(playing);
    set({ playing, seconds: clock.value });
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
