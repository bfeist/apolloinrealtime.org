/**
 * Typed YouTube IFrame API loader.
 *
 * The three legacy `public/{11,13,17}/index.js` files each independently
 * inject `<script src="https://www.youtube.com/iframe_api">` into the
 * document and define a global `onYouTubeIframeAPIReady` callback. This
 * module collapses that into one promise-returning loader (Phase 4).
 *
 * Player construction (`new YT.Player(...)`) and the state-change wiring
 * stay with the caller for now — they are too entangled with mission state
 * (gMediaList, transcript scrolling, navigator redraws) to extract cleanly
 * until Phase 5 panel extraction.
 */

// Minimal subset of the YT.Player surface we use. The full type lives in
// `@types/youtube` if/when we depend on it; for now we declare what's needed.
export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  setPlaybackQuality(quality: string): void;
  loadVideoById(videoId: string, startSeconds?: number): void;
  getVideoUrl(): string;
}

export interface YTPlayerStateConstants {
  UNSTARTED: -1;
  ENDED: 0;
  PLAYING: 1;
  PAUSED: 2;
  BUFFERING: 3;
  CUED: 5;
}

export interface YTNamespace {
  Player: new (elementId: string, options: Record<string, unknown>) => YTPlayer;
  PlayerState: YTPlayerStateConstants;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loadPromise: Promise<YTNamespace> | null = null;

/**
 * Inject the YouTube IFrame API script (once across the page) and resolve
 * with the `YT` namespace when it's ready. Subsequent calls return the
 * same promise.
 */
export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (loadPromise) return loadPromise;

  // Already loaded by an earlier script (e.g. legacy `index.js`)? Use it.
  if (window.YT?.Player !== undefined) {
    loadPromise = Promise.resolve(window.YT);
    return loadPromise;
  }

  loadPromise = new Promise<YTNamespace>((resolve, reject) => {
    // Chain onto any existing onYouTubeIframeAPIReady so we don't clobber it.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = (): void => {
      if (typeof previous === "function") {
        try {
          previous();
        } catch (e) {
          console.error("[ytplayer] previous onYouTubeIframeAPIReady threw", e);
        }
      }
      if (window.YT) {
        resolve(window.YT);
      } else {
        reject(new Error("YT global missing after iframe_api ready callback"));
      }
    };

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = (): void => {
      reject(new Error("Failed to load youtube.com/iframe_api"));
    };
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(tag, firstScript);
    } else {
      document.head.appendChild(tag);
    }
  });

  return loadPromise;
}

/** Test-only: reset the cached promise so each test sees a fresh load. */
export function _resetForTests(): void {
  loadPromise = null;
}
