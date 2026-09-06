import { create } from "zustand";

/** Shared only by the room, activity canvas, and channel strip. Transport lives in missionStore. */
export const useMocrHover = create<{
  channel: number | null;
  setChannel: (channel: number | null) => void;
}>((set) => ({
  channel: null,
  setChannel: (channel) => {
    set({ channel });
  },
}));
