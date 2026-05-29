/**
 * MOCRviz audio controller.
 *
 * Phase 4.5 — typed replacement for the legacy `gPlayer` + `gWaitForPlayer`
 * + `loadChannelSoundfile()` + per-frame play/pause/seek logic in
 * `public/{11,13}/MOCRviz/MOCRviz.js`.
 *
 * The controller owns one `HTMLAudioElement` and reacts to ticks from
 * the parent app's clock. The parent owns the canonical mission time;
 * the controller maps it to "seconds into the current tape" and keeps
 * the audio element in sync (load on tape boundary cross, seek on drift
 * beyond tolerance, play/pause to match parent state).
 *
 * No jQuery, no peaks.js, no AJAX — just HTMLAudioElement + the typed
 * {@link TapeRangesData} + the URL builders in `./urls.ts`.
 */

import { findTapeForGet } from "../../data/tapeRangesData.js";
import { audioUrl, type MocrMissionId } from "./urls.js";

/** Construction options for {@link MocrvizAudioController}. */
export interface MocrvizAudioControllerOptions {
  /** Mission whose URL/filename convention to use. */
  mission: MocrMissionId;
  /** MP3 CDN root (no trailing slash required). e.g. `https://media.../A13/MOCR_audio`. */
  audioRoot: string;
  /** Parsed tape ranges (from `loadTapeRangesData`). */
  tapes: TapeRangesData;
  /**
   * Drift tolerance in seconds. If `|audio.currentTime - desired|` exceeds
   * this, the controller seeks. Matches the legacy 2-second window.
   * Default `2`.
   */
  driftToleranceSeconds?: number;
  /**
   * Audio element factory. Real callers leave this unset (defaults to
   * `new Audio()`); tests inject a stub that satisfies the small subset
   * of the `HTMLAudioElement` API we actually use.
   */
  createAudio?: () => HtmlAudioLike;
  /**
   * Optional callback fired when the active tape changes. The handle is
   * the tape just loaded, or `null` when audio is unloaded (gap / T999 /
   * out-of-range).
   */
  onTapeChange?: (tape: TapeRange | null) => void;
}

/** Subset of HTMLAudioElement the controller uses. */
export interface HtmlAudioLike {
  src: string;
  currentTime: number;
  readonly paused: boolean;
  readonly duration: number;
  load: () => void;
  play: () => Promise<void> | void;
  pause: () => void;
}

/** Snapshot of the controller state for diagnostics. */
export interface MocrvizAudioState {
  readonly channel: number;
  readonly tape: TapeRange | null;
  readonly src: string;
  readonly desiredTapeOffsetSeconds: number;
  readonly isPlaying: boolean;
}

export class MocrvizAudioController {
  private readonly options: Required<
    Omit<MocrvizAudioControllerOptions, "onTapeChange" | "createAudio">
  > & {
    onTapeChange?: (tape: TapeRange | null) => void;
  };
  private readonly audio: HtmlAudioLike;
  private channel: number;
  private tape: TapeRange | null = null;
  private desiredPlaying = false;
  private desiredTapeOffset = 0;

  constructor(options: MocrvizAudioControllerOptions, initialChannel: number) {
    this.options = {
      mission: options.mission,
      audioRoot: options.audioRoot.replace(/\/+$/, ""),
      tapes: options.tapes,
      driftToleranceSeconds: options.driftToleranceSeconds ?? 2,
      ...(options.onTapeChange !== undefined && { onTapeChange: options.onTapeChange }),
    };
    const factory = options.createAudio ?? (() => new Audio());
    this.audio = factory();
    this.channel = initialChannel;
  }

  /** Currently active channel (1..60). */
  getChannel(): number {
    return this.channel;
  }

  /** Switch active channel. Next {@link tick} loads the new tape if needed. */
  setChannel(channel: number): void {
    if (channel === this.channel) return;
    this.channel = channel;
    // Force reload on next tick by clearing tape state. The tick will
    // pick the new tape by `(channel, currentSeconds)` and load it.
    this.tape = null;
    this.audio.src = "";
  }

  /** Last-known snapshot. */
  state(): MocrvizAudioState {
    return {
      channel: this.channel,
      tape: this.tape,
      src: this.audio.src,
      desiredTapeOffsetSeconds: this.desiredTapeOffset,
      isPlaying: this.desiredPlaying,
    };
  }

  /** Stop playback and clear src. Called when the panel unmounts. */
  destroy(): void {
    try {
      this.audio.pause();
    } catch {
      // ignore
    }
    this.audio.src = "";
    this.tape = null;
    this.desiredPlaying = false;
  }

  /**
   * React to a clock update from the parent app.
   *
   * @param currentGetSeconds - canonical mission time
   * @param isPlaying         - parent player's desired play state
   */
  tick(currentGetSeconds: number, isPlaying: boolean): void {
    this.desiredPlaying = isPlaying;

    const next = findTapeForGet(this.options.tapes, this.channel, currentGetSeconds);
    // Treat the legacy sentinel "T999" as "no audio".
    const usable = next !== null && next.tapeId !== "T999" ? next : null;

    if (usable === null) {
      // No tape for this (channel, get). Clear the player.
      if (this.tape !== null) {
        this.tape = null;
        this.audio.src = "";
        this.options.onTapeChange?.(null);
      }
      if (!this.audio.paused) this.audio.pause();
      return;
    }

    // Load the tape if it changed.
    if (this.tape?.tapeId !== usable.tapeId) {
      this.tape = usable;
      this.audio.src = audioUrl(
        this.options.audioRoot,
        this.options.mission,
        usable.tapeId,
        usable.channelBank,
        this.channel,
      );
      this.audio.load();
      this.options.onTapeChange?.(usable);
    }

    // Compute the desired position into the tape and sync.
    this.desiredTapeOffset = currentGetSeconds - usable.startSeconds;
    if (isPlaying) {
      const drift = Math.abs(this.audio.currentTime - this.desiredTapeOffset);
      if (Number.isFinite(this.audio.duration) && drift > this.options.driftToleranceSeconds) {
        this.audio.currentTime = this.desiredTapeOffset;
      }
      if (this.audio.paused) {
        const p = this.audio.play();
        // play() returns a Promise in modern browsers; swallow rejection
        // (autoplay block, race during channel change). The next tick
        // will retry.
        if (p instanceof Promise) p.catch(() => undefined);
      }
    } else {
      if (Number.isFinite(this.audio.duration)) {
        this.audio.currentTime = this.desiredTapeOffset;
      }
      if (!this.audio.paused) this.audio.pause();
    }
  }
}
