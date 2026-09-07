/** Shared YouTube API loading and transport reconciliation.
 * MissionVideo owns player creation, subscriptions, and destruction. */

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

  // Reuse the API when returning to a mission through React Router.
  if (window.YT?.Player !== undefined) {
    loadPromise = Promise.resolve(window.YT);
    return loadPromise;
  }

  loadPromise = new Promise<YTNamespace>((resolve, reject) => {
    // Chain onto any existing onYouTubeIframeAPIReady so we don't clobber it.
    const previous = window.onYouTubeIframeAPIReady;
    const tag = document.createElement("script");
    const cleanup = (): void => {
      tag.onerror = null;
      if (window.onYouTubeIframeAPIReady === onReady) {
        if (previous) window.onYouTubeIframeAPIReady = previous;
        else delete window.onYouTubeIframeAPIReady;
      }
    };
    const fail = (message: string): void => {
      cleanup();
      tag.remove();
      reject(new Error(message));
    };
    const onReady = (): void => {
      cleanup();
      if (typeof previous === "function") {
        try {
          previous();
        } catch (e) {
          console.error("[ytplayer] previous onYouTubeIframeAPIReady threw", e);
        }
      }
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        fail("YT global missing after iframe_api ready callback");
      }
    };
    window.onYouTubeIframeAPIReady = onReady;

    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = (): void => {
      fail("Failed to load youtube.com/iframe_api");
    };
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(tag, firstScript);
    } else {
      document.head.appendChild(tag);
    }
  }).catch((error: unknown) => {
    // A transient network failure must not disable later mission visits.
    loadPromise = null;
    throw error;
  });

  return loadPromise;
}

/** Test-only: reset the cached promise so each test sees a fresh load. */
export function _resetForTests(): void {
  loadPromise = null;
}
