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

let loadPromise: Promise<YTNamespace> | null = null;

/** Player configuration keeps YouTube UI out of the mission-owned transport surface. */
export function youtubePlayerVars(origin: string): Readonly<Record<string, string | number>> {
  return {
    playsinline: 1,
    controls: 0,
    disablekb: 1,
    fs: 0,
    iv_load_policy: 3,
    cc_load_policy: 0,
    autohide: 1,
    modestbranding: 1,
    rel: 0,
    origin,
  };
}

/** Reconcile the real iframe state with the app's canonical playback intent. */
export function syncYouTubePlayback(
  player: Pick<YTPlayer, "playVideo" | "pauseVideo">,
  playerState: number,
  playing: boolean,
  states: YTPlayerStateConstants,
): void {
  if (playing && playerState !== states.PLAYING && playerState !== states.BUFFERING)
    player.playVideo();
  else if (
    !playing &&
    playerState !== states.PAUSED &&
    playerState !== states.CUED &&
    playerState !== states.UNSTARTED
  )
    player.pauseVideo();
}

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
