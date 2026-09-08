import { missionAnniversary } from "./anniversary.js";
import { missionElapsedToGet, missionGetToElapsed } from "./missionTime.js";

/** One mission clock. Media and panels consume this state; they never own GET. */
export class MissionPlayback {
  private seconds: number;
  private anchor: number;
  playing = false;
  muted = false;
  mocrActive = false;

  constructor(
    initialSeconds: number,
    readonly minimum: number,
    readonly maximum: number,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.seconds = Math.max(minimum, Math.min(maximum, initialSeconds));
    this.anchor = now();
  }

  get value(): number {
    return Math.min(
      this.maximum,
      this.seconds + (this.playing ? (this.now() - this.anchor) / 1000 : 0),
    );
  }

  set value(seconds: number) {
    if (!Number.isFinite(seconds)) return;
    this.seconds = Math.max(this.minimum, Math.min(this.maximum, seconds));
    this.anchor = this.now();
  }

  setPlaying(playing: boolean): void {
    this.value = this.value;
    this.playing = playing;
  }
}

/** Calendar-day repeats preserve UTC time of day and reset at anniversary start. */
export function missionRealtimeGet(config: MissionConfig, now = Date.now()): number {
  const anniversary = missionAnniversary(config, now);
  if (anniversary.isAnniversary)
    return missionElapsedToGet(config, (now - anniversary.launchEpoch) / 1000);

  const nextLaunch = new Date(anniversary.launchEpoch);
  const start = nextLaunch.getTime() - config.countdownSeconds * 1000;
  if (now >= start) nextLaunch.setUTCFullYear(nextLaunch.getUTCFullYear() + 1);
  const nextStart = nextLaunch.getTime() - config.countdownSeconds * 1000;
  const duration =
    (config.countdownSeconds + missionGetToElapsed(config, config.missionDurationSeconds)) * 1000;
  const day = 86400000;
  const period = Math.ceil(duration / day) * day;
  // Whole-day shifts retain today's UTC clock time. Each regular repeat plays
  // all coverage, then repeats part of the final day to fill the remaining hours.
  // Anchor to the upcoming anniversary so New Year/month changes cannot reset
  // playback. After anniversary end, changing the anchor can join a partial replay.
  let offset = (((now - nextStart) % period) + period) % period;
  if (offset >= duration) offset -= day;
  return missionElapsedToGet(config, -config.countdownSeconds + offset / 1000);
}
