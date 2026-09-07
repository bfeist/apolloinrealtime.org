import { missionAnniversary } from "./anniversary.js";

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

/** Replay the mission day nearest today's time of day. */
export function realtimeGet(launchEpoch: number, currentGet: number, now = Date.now()): number {
  const day = 86400;
  const historicTime = launchEpoch / 1000 + currentGet;
  const delta = (((now / 1000 - historicTime) % day) + day) % day;
  return currentGet + (delta > day / 2 ? delta - day : delta);
}

/** During the anniversary, NOW follows the actual mission calendar day. */
export function missionRealtimeGet(
  config: MissionConfig,
  currentGet: number,
  now = Date.now(),
): number {
  const anniversary = missionAnniversary(config, now);
  const seconds = anniversary.isAnniversary
    ? (now - anniversary.launchEpoch) / 1000
    : realtimeGet(Date.parse(config.launchDate), currentGet, now);
  return Math.max(-config.countdownSeconds, Math.min(config.missionDurationSeconds, seconds));
}
