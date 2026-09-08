// Apollo 17 advanced its flight-plan GET from 065:00:00 to 067:40:00.
// The transcript, photographs, and media index retain that historical clock.
// Original /17/index.js setAutoScrollPoller applies the change one hour into
// the 064:00:00 recording; utteranceData.csv at 064:33:06 confirms the timing.
const a17ResetElapsed = 65 * 3600;
const a17ResetAdvance = 2 * 3600 + 40 * 60;

/** Convert the historical GET used by data and links to seconds since launch. */
export function missionGetToElapsed(config: MissionConfig, get: number): number {
  if (config.id !== "17" || get < a17ResetElapsed) return get;
  // The skipped GET interval has no elapsed duration. Manual links into it
  // resolve to the reset instant and canonicalize to 067:40:00 on playback.
  return Math.max(a17ResetElapsed, get - a17ResetAdvance);
}

/** Convert seconds since launch to the historical GET used by data and links. */
export function missionElapsedToGet(config: MissionConfig, elapsed: number): number {
  return config.id === "17" && elapsed >= a17ResetElapsed ? elapsed + a17ResetAdvance : elapsed;
}
