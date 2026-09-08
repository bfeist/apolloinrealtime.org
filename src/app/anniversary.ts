import { missionGetToElapsed } from "./missionTime.js";

/** Calendar anniversaries follow UTC, matching the mission's historical clock. */
export function missionAnniversary(config: MissionConfig, now = Date.now()) {
  const launch = new Date(config.launchDate);
  const year = new Date(now).getUTCFullYear();
  const launchEpoch = Date.UTC(
    year,
    launch.getUTCMonth(),
    launch.getUTCDate(),
    launch.getUTCHours(),
    launch.getUTCMinutes(),
    launch.getUTCSeconds(),
  );
  // Match the original sync's full recording window, using the GET bounds rather
  // than its stale countdown date literals. Both boundaries vary by mission.
  const start = launchEpoch - config.countdownSeconds * 1000;
  const end = launchEpoch + missionGetToElapsed(config, config.missionDurationSeconds) * 1000;
  return {
    years: Math.max(0, year - launch.getUTCFullYear() - (now < start ? 1 : 0)),
    isAnniversary: now >= start && now < end,
    launchEpoch,
  };
}
