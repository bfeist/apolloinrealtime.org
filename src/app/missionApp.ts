/**
 * Per-mission app entry — boots the typed Apollo {N} app at `/{N}/`.
 *
 * Builds the typed production shell (`src/app/shell.ts`), then mounts
 * every typed engine and panel into the shell's named slots. Append
 * `?debug=1` to the URL to also render the diagnostic-readout dump in
 * a side host (useful while Phase 6 hardens). Original implementations live
 * in the adjacent mission repositories.
 *
 * Mission id is read from `<body data-mission="11|13|17">`. The matching
 * typed `MissionConfig` is imported statically and exposed at
 * `window.MISSION` for any module that still reads it.
 */

import { a11Config } from "../missions/11.config.js";
import { a13Config } from "../missions/13.config.js";
import { a17Config } from "../missions/17.config.js";
import { secondsToTimeStr, timeIdToSeconds } from "../shell/clock.js";
import { ready } from "../dom/index.js";
import { NavigatorRenderer } from "../engines/navigator/renderer.js";
import { loadTocData, findClosestTocIndex } from "../data/tocData.js";
import { createTocPanel } from "../panels/toc/index.js";
import { loadMissionStagesData, findStageIndex } from "../data/missionStagesData.js";
import { loadVideoSegmentData, findVideoSegmentIndex } from "../data/videoSegmentData.js";
import { loadCommentaryData, findClosestCommentaryIndex } from "../data/commentaryData.js";
import { loadUtteranceData, findClosestUtteranceIndex } from "../data/utteranceData.js";
import { loadPhotoData, findClosestPhotoIndex } from "../data/photoData.js";
import { loadVideoUrlData, findVideoUrlIndex } from "../data/videoUrlData.js";
import { loadCrewStatusData } from "../data/crewStatusData.js";
import { loadTelemetryData } from "../data/telemetryData.js";
import { loadOrbitData } from "../data/orbitData.js";
import { createCommentaryPanel } from "../panels/commentary/index.js";
import { createTranscriptPanel } from "../panels/transcript/index.js";
import { createPhotoPanel } from "../panels/photo/index.js";
import type { PhotoUrlResolver } from "../panels/photo/index.js";
import { parseAsRollImg } from "../panels/photo/index.js";
import type { FrameOfReferenceRange } from "../panels/telemetry/index.js";
import { createDashboardPanel } from "../panels/dashboard/index.js";
import { createSearchPanel } from "../panels/search/index.js";
import type { MocrvizPanel } from "../panels/mocrviz/index.js";
import { channelsFor } from "../panels/mocrviz/channels.js";
import { createChannelActivity } from "../panels/mocrviz/channelActivity.js";
import { renderShell, setActiveTab, type ShellElements } from "./shell.js";
import { parseDeepLink } from "./deepLink.js";
import { MissionPlayback, realtimeGet } from "./playback.js";
import { mountMissionSplash } from "./missionSplash.js";
import {
  loadYouTubeIframeApi,
  syncYouTubePlayback,
  youtubePlayerVars,
} from "../engines/ytplayer/index.js";

const CONFIGS: Record<string, MissionConfig> = {
  "11": a11Config,
  "13": a13Config,
  "17": a17Config,
};
let seekRevision = 0;

function openMissionAbout(config: MissionConfig): void {
  const dialog = document.getElementById("aboutDialog");
  if (!(dialog instanceof HTMLDialogElement) || dialog.open) return;
  if (config.id === "17") dialog.show();
  else dialog.showModal();
}

function readMissionId(): "11" | "13" | "17" | null {
  const id = document.body.dataset.mission;
  return id === "11" || id === "13" || id === "17" ? id : null;
}

/** The historical date always describes the selected mission moment. */
function startClock(config: MissionConfig, shell: ShellElements, ref: MissionPlayback): void {
  startTicker(ref, (seconds) => {
    const date = new Date(Date.parse(config.launchDate) + seconds * 1000);
    shell.historicDate.textContent = date.toUTCString().slice(0, 16);
    shell.historicTime.textContent = `${date.toUTCString().slice(17, 25)} UTC`;
    if (document.activeElement !== shell.getInput) shell.getInput.value = secondsToTimeStr(seconds);
  });
}

function seekTo(seconds: number): void {
  document.dispatchEvent(new CustomEvent("airt:seek", { detail: { seconds } }));
}

function wireGetInput(shell: ShellElements): void {
  shell.getButton.addEventListener("click", () => {
    const parsed = parseDeepLink(`?t=${encodeURIComponent(shell.getInput.value.trim())}`).seek;
    const valid = parsed?.kind === "seconds";
    shell.getInput.setCustomValidity(valid ? "" : "Enter a time such as 055:54:53 or -02:00:00.");
    if (valid) seekTo(parsed.seconds);
    else shell.getInput.reportValidity();
  });
  shell.getInput.addEventListener("input", () => {
    shell.getInput.setCustomValidity("");
  });
  shell.getInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") shell.getButton.click();
  });
}

/** Wire the three tab buttons. */
function wireTabs(shell: ShellElements): void {
  shell.transcriptTab.addEventListener("click", () => {
    setActiveTab(shell, "transcript");
  });
  shell.tocTab.addEventListener("click", () => {
    setActiveTab(shell, "toc");
  });
  shell.commentaryTab.addEventListener("click", () => {
    setActiveTab(shell, "commentary");
  });
}

interface OverlayState {
  /** Mirrors legacy `gDashboardManuallyToggled`; seeking resets it. */
  dashboardManuallyToggled: boolean;
  /** Start time of the video segment that already auto-hid the dashboard. */
  lastVideoSegmentDashboardHidden: number | null;
}

function setDashboardVisible(shell: ShellElements, visible: boolean): void {
  shell.dashboardOverlay.hidden = !visible;
  shell.dashboardBtn.classList.toggle("is-active", visible);
}

function setSearchVisible(shell: ShellElements, state: OverlayState, visible: boolean): void {
  shell.searchOverlay.hidden = !visible;
  shell.searchBtn.classList.toggle("is-active", visible);
  if (visible) {
    // Legacy: search takes over the player area and dashboard is turned off.
    state.dashboardManuallyToggled = true;
    setDashboardVisible(shell, false);
    const input = shell.searchOverlay.querySelector<HTMLInputElement>("#searchInputField");
    input?.focus();
  } else {
    // Legacy: closing search re-enables automatic dashboard show/hide.
    state.dashboardManuallyToggled = false;
  }
}

/**
 * Wire small action buttons. Dashboard is an overlay on top of the video
 * player. By default it auto-shows when no video segment is active and
 * auto-hides when a video segment starts; manual user toggles disable
 * that automation until the next seek.
 */
function wireOverlays(shell: ShellElements): OverlayState {
  const state: OverlayState = {
    dashboardManuallyToggled: false,
    lastVideoSegmentDashboardHidden: null,
  };

  shell.dashboardBtn.addEventListener("click", () => {
    state.dashboardManuallyToggled = true;
    setDashboardVisible(shell, shell.dashboardOverlay.hasAttribute("hidden"));
  });
  shell.dashboardOverlay
    .querySelector("[data-close='dashboard']")
    ?.addEventListener("click", () => {
      state.dashboardManuallyToggled = true;
      setDashboardVisible(shell, false);
    });
  shell.searchBtn.addEventListener("click", () => {
    setSearchVisible(shell, state, shell.searchOverlay.hasAttribute("hidden"));
  });
  shell.searchClose.addEventListener("click", () => {
    setSearchVisible(shell, state, false);
  });
  document.addEventListener("airt:seek", () => {
    state.dashboardManuallyToggled = false;
    state.lastVideoSegmentDashboardHidden = null;
  });

  setDashboardVisible(shell, true);
  return state;
}

/**
 * Legacy `manageOverlaysAutodisplay` rule: video segments reveal the
 * underlying video by hiding the dashboard once per segment; outside
 * video segments the dashboard returns, unless the user manually toggled
 * it since the last seek.
 */
async function startDashboardAutodisplay(
  config: MissionConfig,
  shell: ShellElements,
  ref: { value: number },
  state: OverlayState,
): Promise<void> {
  let videos: VideoSegmentsData;
  try {
    videos = await loadVideoSegmentData(`/${config.id}/`);
  } catch (err) {
    console.warn("[missionApp] failed to load video URLs for dashboard auto-display", err);
    return;
  }
  startTicker(ref, (seconds) => {
    if (state.dashboardManuallyToggled || !shell.searchOverlay.hidden) return;
    const idx = findVideoSegmentIndex(videos, seconds);
    if (idx >= 0) {
      const segment = videos.segments[idx];
      if (!segment) return;
      if (state.lastVideoSegmentDashboardHidden !== segment.startSeconds) {
        state.lastVideoSegmentDashboardHidden = segment.startSeconds;
        setDashboardVisible(shell, false);
      }
      return;
    }
    state.lastVideoSegmentDashboardHidden = null;
    setDashboardVisible(shell, true);
  });
}

/** Keep video, shared GET and transport synchronized, including same-segment seeks. */
async function mountVideoPlayer(
  config: MissionConfig,
  shell: ShellElements,
  ref: MissionPlayback,
): Promise<void> {
  try {
    const [data, yt] = await Promise.all([
      loadVideoUrlData(`/${config.id}/`),
      loadYouTubeIframeApi(),
    ]);
    let player: YTPlayer | null = null;
    let key = "";
    let appliedMute: boolean | null = null;
    const hideYouTubeCaptions = (): void => {
      if (player?.getOptions?.().includes("captions")) player.unloadModule?.("captions");
    };
    const sync = (forceSeek = false): void => {
      if (!player) return;
      const seconds = ref.value;
      const entry = data.entries[findVideoUrlIndex(data, seconds)];
      if (!entry) {
        player.pauseVideo();
        key = "";
        return;
      }
      const nextKey = `${entry.videoId}:${String(entry.startSeconds)}`;
      const offset = Math.max(0, seconds - entry.startSeconds);
      if (nextKey !== key) {
        key = nextKey;
        if (ref.playing) player.loadVideoById(entry.videoId, offset);
        else player.cueVideoById(entry.videoId, offset);
      } else if ((ref.playing || forceSeek) && Math.abs(player.getCurrentTime() - offset) > 2) {
        player.seekTo(offset, true);
      }
      // Commands such as loadVideoById() complete asynchronously. Inspect the
      // real player state on every synchronization pass so a late YouTube
      // transition can never override the mission transport button.
      syncYouTubePlayback(player, player.getPlayerState(), ref.playing, yt.PlayerState);
      const mute = ref.muted || ref.mocrActive;
      if (mute !== appliedMute) {
        if (mute) player.mute();
        else player.unMute();
        appliedMute = mute;
      }
    };
    new yt.Player("player", {
      width: "100%",
      height: "100%",
      playerVars: youtubePlayerVars(window.location.origin),
      events: {
        onReady: (event: { target: YTPlayer }): void => {
          player = event.target;
          hideYouTubeCaptions();
          sync();
          document.addEventListener("airt:seek", () => {
            sync(true);
          });
          document.addEventListener("airt:transport", () => {
            sync();
          });
          window.setInterval(() => {
            sync();
          }, 1000);
        },
        onStateChange: (): void => {
          hideYouTubeCaptions();
          sync();
        },
        onApiChange: (): void => {
          hideYouTubeCaptions();
        },
        onError: (): void => {
          shell.playerWrapper.dataset.mediaError = "true";
        },
      },
    });
  } catch (err) {
    console.warn("[missionApp] video unavailable", err);
    shell.player.textContent =
      "Video is unavailable. The mission timeline and historical material remain accessible.";
  }
}

/**
 * Load the legacy `paper-full.js` (it sets a global `paper` PaperScope)
 * and resolve it as a {@link PaperScopeLike}. Paper.js is a classic
 * script, not an ESM module, so it's injected via a `<script>` tag.
 */
function loadPaper(missionId: string): Promise<PaperScopeLike> {
  const existing = (window as unknown as { paper?: PaperScopeLike }).paper;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `/${missionId}/lib/paper-full.js`;
    script.onload = (): void => {
      const paper = (window as unknown as { paper?: PaperScopeLike }).paper;
      if (paper) resolve(paper);
      else reject(new Error("[missionApp] paper-full.js loaded but window.paper is unset"));
    };
    script.onerror = (): void => {
      reject(new Error(`[missionApp] failed to load ${script.src}`));
    };
    document.head.appendChild(script);
  });
}

/**
 * Mount the typed {@link NavigatorRenderer} on the shell's `#navCanvas`,
 * driven by the live mission clock. Click-to-seek dispatches the same
 * `airt:seek` event as the GET input.
 */
async function mountNavigator(
  config: MissionConfig,
  shell: ShellElements,
  currentSecondsRef: { value: number },
): Promise<void> {
  let paper: PaperScopeLike;
  try {
    paper = await loadPaper(config.id);
  } catch (err) {
    console.error(err);
    return;
  }

  // Load the four overlay datasets concurrently.
  const baseUrl = `/${config.id}/`;
  const [stagesResult, videoSegmentsResult, photosResult, tocResult, utterancesResult] =
    await Promise.allSettled([
      loadMissionStagesData(baseUrl, { missionDurationSeconds: config.missionDurationSeconds }),
      loadVideoSegmentData(baseUrl),
      loadPhotoData(baseUrl),
      loadTocData(baseUrl),
      loadUtteranceData(baseUrl),
    ]);

  const overlays: NavigatorOverlays = {
    ...(stagesResult.status === "fulfilled" && { stages: stagesResult.value }),
    ...(videoSegmentsResult.status === "fulfilled" && { videoSegments: videoSegmentsResult.value }),
    ...(photosResult.status === "fulfilled" && { photos: photosResult.value }),
    ...(tocResult.status === "fulfilled" && { toc: tocResult.value }),
    ...(utterancesResult.status === "fulfilled" && { utterances: utterancesResult.value }),
  };

  const renderer = new NavigatorRenderer(paper, {
    missionDurationSeconds: config.missionDurationSeconds,
    countdownSeconds: config.countdownSeconds,
    overlays,
    onSeek: (seconds) => {
      currentSecondsRef.value = seconds;
      shell.getInput.value = secondsToTimeStr(seconds);
      document.dispatchEvent(new CustomEvent("airt:seek", { detail: { seconds } }));
    },
  });
  renderer.mount(shell.navCanvas);

  startTicker(currentSecondsRef, (seconds) => {
    renderer.render(seconds);
  });
}

/**
 * Helper used by every panel mount: produces a 1-Hz `tick()` function
 * that feeds the latest seconds to `cb`. Seconds come from the shared
 * ref so manual seeks via the GET input / navigator update everything.
 */
function startTicker(currentSecondsRef: { value: number }, cb: (seconds: number) => void): void {
  const tick = (): void => {
    cb(currentSecondsRef.value);
  };
  tick();
  document.addEventListener("airt:seek", tick);
  document.addEventListener("airt:transport", tick);
  window.setInterval(tick, 1000);
}

// ── panel mounts ──────────────────────────────────────────────────────────────

async function mountTranscriptPanel(
  config: MissionConfig,
  shell: ShellElements,
  ref: { value: number },
): Promise<void> {
  let data: UtteranceData;
  try {
    data = await loadUtteranceData(`/${config.id}/`);
  } catch (err) {
    shell.transcriptWrapper.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  const panel = createTranscriptPanel({
    container: shell.transcriptWrapper,
    data,
    speakerLabels: config.speakerLabels,
    onSeek: (timeId) => {
      seekTo(timeIdToSeconds(timeId));
    },
  });
  let last: string | null = null;
  startTicker(ref, (seconds) => {
    const idx = findClosestUtteranceIndex(data, seconds);
    const entry = idx >= 0 ? data.entries[idx] : undefined;
    const timeId = entry?.timeId ?? null;
    if (timeId === last) return;
    panel.setActiveTimeId(timeId);
    last = timeId;
  });
}

async function mountTocPanel(
  config: MissionConfig,
  shell: ShellElements,
  ref: { value: number },
): Promise<void> {
  let toc: TocData;
  try {
    toc = await loadTocData(`/${config.id}/`);
  } catch (err) {
    shell.tocWrapper.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  const panel = createTocPanel({
    container: shell.tocWrapper,
    data: toc,
    onSeek: (timeId) => {
      seekTo(timeIdToSeconds(timeId));
    },
  });
  let last: string | null = null;
  startTicker(ref, (seconds) => {
    const idx = findClosestTocIndex(toc, seconds);
    const entry = idx >= 0 ? toc.entries[idx] : undefined;
    const timeId = entry?.timeId ?? null;
    if (timeId === last) return;
    panel.setActiveTimeId(timeId);
    last = timeId;
  });
}

async function mountCommentaryPanel(
  config: MissionConfig,
  shell: ShellElements,
  ref: { value: number },
): Promise<void> {
  let data: CommentaryData;
  try {
    data = await loadCommentaryData(`/${config.id}/`);
  } catch (err) {
    shell.commentaryWrapper.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  const panel = createCommentaryPanel({
    container: shell.commentaryWrapper,
    data,
    speakerLabels: config.speakerLabels,
    onSeek: (timeId) => {
      seekTo(timeIdToSeconds(timeId));
    },
  });
  let last: string | null = null;
  startTicker(ref, (seconds) => {
    const idx = findClosestCommentaryIndex(data, seconds);
    const entry = idx >= 0 ? data.entries[idx] : undefined;
    const timeId = entry?.timeId ?? null;
    if (timeId === last) return;
    panel.setActiveTimeId(timeId);
    last = timeId;
  });
}

/** Per-mission photo URL resolver. Mirrors legacy `populatePhotoGallery`. */
function photoResolverFor(config: MissionConfig): PhotoUrlResolver {
  const mediaRoot = config.mediaRoot;
  return (entry) => {
    if (config.id === "13") {
      const lpi = config.lpiImageRoot ?? "";
      const alsj = config.alsjImageRoot ?? "";
      const parts = parseAsRollImg(entry.photoId, "13");
      if (parts) {
        return {
          thumb: `${lpi}/thumb/AS13/${parts.rollNum}/${parts.imgNum}.jpg`,
          full: `${lpi}/medium/AS13/${parts.rollNum}/${parts.imgNum}.jpg`,
          highRes: `${lpi}/print/AS13/${parts.rollNum}/${parts.imgNum}.jpg`,
        };
      }
      if (entry.supportingFilename !== "") {
        const url = `${mediaRoot}/images/supporting/${entry.supportingFilename}`;
        return { thumb: url, full: url, highRes: url };
      }
      const url = `${alsj}/${entry.filename}`;
      return { thumb: url, full: url, highRes: url };
    }

    if (config.id === "11") {
      const lpi = config.lpiCdnRoot ?? "";
      const parts = parseAsRollImg(entry.photoId, "11");
      if (parts) {
        const thumb = `${lpi}/resources/apollo/images/thumb/AS11/${parts.rollNum}/${parts.imgNum}.jpg`;
        const full =
          entry.filename !== ""
            ? `${mediaRoot}/images/NASA_photos/${entry.filename}`
            : entry.supportingFilename ||
              `${lpi}/resources/apollo/images/print/AS11/${parts.rollNum}/${parts.imgNum}.jpg`;
        return { thumb, full, highRes: full };
      }
      if (entry.supportingFilename !== "") {
        return {
          thumb: entry.supportingFilename,
          full: entry.supportingFilename,
          highRes: entry.supportingFilename,
        };
      }
      const url = `${mediaRoot}/images/NASA_photos/${entry.filename}`;
      return { thumb: url, full: url, highRes: url };
    }

    // A17
    const isFlight = entry.filename !== "";
    const subdir = isFlight ? "flight" : "supporting";
    const base = isFlight ? `AS17-${entry.photoId}` : entry.photoId;
    const fullSize = isFlight ? "4175" : "2100";
    return {
      thumb: `${mediaRoot}/images/${subdir}/100/${base}.jpg`,
      full: `${mediaRoot}/images/${subdir}/${fullSize}/${base}.jpg`,
      highRes: `${mediaRoot}/images/${subdir}/${fullSize}/${base}.jpg`,
    };
  };
}

async function mountPhotoPanel(
  config: MissionConfig,
  shell: ShellElements,
  ref: { value: number },
): Promise<void> {
  const initialSeekRevision = seekRevision;
  let data: PhotoData;
  try {
    data = await loadPhotoData(`/${config.id}/`);
  } catch (err) {
    shell.photoDiv.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  const panel = createPhotoPanel({
    gallery: shell.photoGallery,
    viewer: shell.photoDiv,
    data,
    resolveUrls: photoResolverFor(config),
    onSeek: (timeId) => {
      seekTo(timeIdToSeconds(timeId));
    },
  });
  const requestedPhoto = new URLSearchParams(window.location.search).get("img");
  const linkedPhoto = data.entries.find((entry) => entry.photoId === requestedPhoto);
  if (linkedPhoto && seekRevision === initialSeekRevision) seekTo(linkedPhoto.seconds);
  let last: string | null = null;
  startTicker(ref, (seconds) => {
    const idx = findClosestPhotoIndex(data, seconds);
    const entry = idx >= 0 ? data.entries[idx] : undefined;
    const timeId = entry?.timeId ?? null;
    if (timeId === last) return;
    panel.setActiveTimeId(timeId);
    last = timeId;
  });
}

function frameRangesFor(config: MissionConfig): FrameOfReferenceRange[] {
  if (config.id === "13") {
    return [{ startSeconds: 270368, endSeconds: 309540, frame: "Moon" }];
  }
  return [];
}

async function mountDashboardPanel(
  config: MissionConfig,
  shell: ShellElements,
  ref: { value: number },
): Promise<void> {
  const totalDays = Math.ceil(config.missionDurationSeconds / 86400);
  const [stagesR, crewR, telemR] = await Promise.allSettled([
    loadMissionStagesData(`/${config.id}/`, {
      missionDurationSeconds: config.missionDurationSeconds,
    }),
    loadCrewStatusData(`/${config.id}/`, {
      missionDurationSeconds: config.missionDurationSeconds,
    }),
    loadTelemetryData(`/${config.id}/`, {
      missionDurationSeconds: config.missionDurationSeconds,
    }),
  ]);
  if (
    stagesR.status !== "fulfilled" ||
    crewR.status !== "fulfilled" ||
    telemR.status !== "fulfilled"
  ) {
    shell.dashboardContent.textContent = "failed to load dashboard data";
    return;
  }
  // Dashboard is visible by default as an overlay on top of the video
  // player. `startDashboardAutodisplay` hides it automatically during
  // video segments unless the user manually toggled it.
  const panel = createDashboardPanel({
    container: shell.dashboardContent,
    stages: stagesR.value,
    crewStatus: crewR.value,
    telemetry: telemR.value,
    telemetryFrameRanges: frameRangesFor(config),
    totalMissionDays: totalDays,
  });
  startTicker(ref, (seconds) => {
    panel.update(seconds);
  });
  if (config.id === "17") {
    const host = document.createElement("div");
    shell.dashboardContent.append(host);
    const mod = await import("../panels/biometrics/index.js");
    const biometrics = await mod.createBiometricsPanel({ container: host });
    startTicker(ref, (seconds) => {
      biometrics.update(seconds);
    });
  }
}

async function mountSearchPanel(config: MissionConfig, shell: ShellElements): Promise<void> {
  const [uttR, comR, photoR] = await Promise.allSettled([
    loadUtteranceData(`/${config.id}/`),
    loadCommentaryData(`/${config.id}/`),
    loadPhotoData(`/${config.id}/`),
  ]);
  createSearchPanel({
    container: shell.searchResults,
    speakerLabels: config.speakerLabels,
    sources: {
      ...(uttR.status === "fulfilled" && { utterances: uttR.value }),
      ...(comR.status === "fulfilled" && { commentary: comR.value }),
      ...(photoR.status === "fulfilled" && { photos: photoR.value }),
    },
    onResult: (item) => {
      seekTo(timeIdToSeconds(item.timeId));
      shell.searchOverlay.hidden = true;
      shell.searchBtn.classList.remove("is-active");
    },
  });
}

function mountMocrvizPanel(
  config: MissionConfig,
  shell: ShellElements,
  ref: MissionPlayback,
  initialChannel: number | null,
): void {
  const catalog = channelsFor(config.id);
  if (!catalog || (config.id !== "11" && config.id !== "13")) {
    shell.channelGrid.parentElement?.setAttribute("hidden", "");
    return;
  }
  const mission = config.id;
  const photoTab = document.getElementById("photoTab");
  const mocrTab = document.getElementById("mocrTab");
  const spacecraftTab = document.getElementById(mission === "11" ? "samplesTab" : "spacecraftTab");
  const spacecraftHost = document.getElementById(
    mission === "11" ? "samples-host" : "spacecraft-host",
  );
  let spacecraft: { setVisible: (visible: boolean) => void } | null = null;
  let spacecraftVisible = false;
  let auxiliaryLoading: Promise<void> | null = null;
  spacecraftTab?.addEventListener("click", () => {
    show(false);
    spacecraftVisible = true;
    shell.photoDiv.hidden = true;
    shell.photoGallery.hidden = true;
    photoTab?.classList.remove("is-active");
    spacecraftTab.classList.add("is-active");
    if (spacecraft) spacecraft.setVisible(true);
    else if (spacecraftHost && !auxiliaryLoading) {
      spacecraftHost.hidden = false;
      spacecraftHost.textContent = "Loading...";
      auxiliaryLoading = (async (): Promise<void> => {
        try {
          spacecraft =
            mission === "11"
              ? await (
                  await import("../panels/samples/index.js")
                ).createSamplesPanel(spacecraftHost, { onSeek: seekTo })
              : (await import("../panels/spacecraft/index.js")).mountSpacecraftPanel(
                  spacecraftHost,
                );
          spacecraft.setVisible(spacecraftVisible);
        } catch (error) {
          console.warn("Mission information could not be loaded", error);
          spacecraftHost.textContent =
            "This information could not be loaded. Reopen the tab to retry.";
          auxiliaryLoading = null;
        }
      })();
    }
  });
  let panel: MocrvizPanel | null = null;
  let mounting: Promise<void> | null = null;
  let selected =
    initialChannel !== null && catalog.available.includes(initialChannel)
      ? initialChannel
      : catalog.defaultChannel;
  const buttons = new Map<number, HTMLButtonElement>();
  const channelActivity = createChannelActivity(
    mission,
    (active) => {
      for (const [id, button] of buttons) {
        button.classList.toggle("is-speaking", active.includes(id));
      }
    },
    `${config.mediaRoot}/MOCR_audio`,
  );
  const highlight = (channel: number): void => {
    selected = channel;
    for (const [id, button] of buttons) {
      button.classList.toggle("is-active", id === channel && ref.mocrActive);
      button.setAttribute("aria-pressed", String(id === channel && ref.mocrActive));
    }
  };
  const highlightHover = (channel: number | null): void => {
    for (const [id, button] of buttons) button.classList.toggle("is-hovered", id === channel);
  };
  const tick = (): void => {
    channelActivity.update(ref.value);
    panel?.setMuted(ref.muted);
    panel?.setClock(ref.value, ref.playing && ref.mocrActive);
  };
  const mount = async (): Promise<void> => {
    shell.mocrvizHost.textContent = "Loading Mission Control recordings...";
    try {
      const mod = await import("../panels/mocrviz/index.js");
      panel = await mod.createMocrvizPanel({
        container: shell.mocrvizHost,
        mission,
        mediaRoot: `/${mission}/`,
        audioRoot: `${config.mediaRoot}/MOCR_audio`,
        countdownSeconds: config.countdownSeconds,
        onSeek: seekTo,
        onChannelChange: highlight,
        onChannelHover: highlightHover,
      });
      panel?.setChannel(selected);
      tick();
    } catch (error) {
      console.warn("Mission Control unavailable", error);
      shell.mocrvizHost.textContent =
        "Mission Control recordings could not be loaded. Reopen this tab to try again.";
      mounting = null;
    }
  };
  const show = (visible: boolean): void => {
    spacecraftVisible = false;
    spacecraft?.setVisible(false);
    if (spacecraftHost) spacecraftHost.hidden = true;
    spacecraftTab?.classList.remove("is-active");
    ref.mocrActive = visible;
    shell.mocrvizHost.closest(".airt-right")?.classList.toggle("is-mocrviz-active", visible);
    shell.mocrvizHost.hidden = !visible;
    shell.photoDiv.hidden = visible;
    shell.photoGallery.hidden = visible;
    photoTab?.classList.toggle("is-active", !visible);
    mocrTab?.classList.toggle("is-active", visible);
    photoTab?.setAttribute("aria-selected", String(!visible));
    mocrTab?.setAttribute("aria-selected", String(visible));
    highlight(selected);
    if (visible && !mounting) mounting = mount();
    tick();
    document.dispatchEvent(new Event("airt:transport"));
  };
  for (const id of catalog.available) {
    const info = catalog.all.find((channel) => channel.id === id);
    if (!info) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.id = `btn-ch${String(id)}`;
    button.className = "thirtybtn-channel";
    button.textContent = info.label;
    button.title = `${info.label}: ${info.description}`;
    button.addEventListener("click", () => {
      selected = id;
      show(true);
      panel?.setChannel(id);
      tick();
    });
    button.addEventListener("pointerenter", () => {
      panel?.setHoveredChannel(id);
    });
    button.addEventListener("pointerleave", () => {
      panel?.setHoveredChannel(null);
    });
    button.addEventListener("focus", () => {
      panel?.setHoveredChannel(id);
    });
    button.addEventListener("blur", () => {
      panel?.setHoveredChannel(null);
    });
    shell.channelGrid.append(button);
    buttons.set(id, button);
  }
  photoTab?.addEventListener("click", () => {
    show(false);
  });
  mocrTab?.addEventListener("click", () => {
    show(true);
  });
  startTicker(ref, tick);
  // Legacy MOCRviz advances its visualization at 10 Hz. Keep that smooth cadence
  // local to this relatively expensive panel instead of accelerating every panel.
  window.setInterval(() => {
    if (ref.mocrActive && ref.playing) tick();
  }, 100);
  if (initialChannel !== null) show(true);
}

async function mountDebugReadout(
  config: MissionConfig,
  shell: ShellElements,
  ref: { value: number },
): Promise<void> {
  if (!shell.debugVisible) return;
  shell.debugHost.innerHTML = `
    <h2>config</h2>
    <pre id="dbg-config"></pre>
    <h2>data counts</h2>
    <ul id="dbg-counts"></ul>
    <h2>current entries</h2>
    <dl id="dbg-current"></dl>
  `;
  const cfgEl = document.getElementById("dbg-config");
  if (cfgEl) cfgEl.textContent = JSON.stringify(config, null, 2);

  // Load everything in parallel; surface counts + current entries.
  const baseUrl = `/${config.id}/`;
  const [tocR, stagesR, segsR, comR, uttR, photoR, vidR, crewR, telemR, orbitR] =
    await Promise.allSettled([
      loadTocData(baseUrl),
      loadMissionStagesData(baseUrl, { missionDurationSeconds: config.missionDurationSeconds }),
      loadVideoSegmentData(baseUrl),
      loadCommentaryData(baseUrl),
      loadUtteranceData(baseUrl),
      loadPhotoData(baseUrl),
      loadVideoUrlData(baseUrl),
      loadCrewStatusData(baseUrl, { missionDurationSeconds: config.missionDurationSeconds }),
      loadTelemetryData(baseUrl, { missionDurationSeconds: config.missionDurationSeconds }),
      loadOrbitData(baseUrl),
    ]);

  const counts = [
    ["toc", tocR.status === "fulfilled" ? tocR.value.entries.length : "fail"],
    ["stages", stagesR.status === "fulfilled" ? stagesR.value.stages.length : "fail"],
    ["videoSegments", segsR.status === "fulfilled" ? segsR.value.segments.length : "fail"],
    ["commentary", comR.status === "fulfilled" ? comR.value.entries.length : "fail"],
    ["utterance", uttR.status === "fulfilled" ? uttR.value.entries.length : "fail"],
    ["photo", photoR.status === "fulfilled" ? photoR.value.entries.length : "fail"],
    ["videoUrl", vidR.status === "fulfilled" ? vidR.value.entries.length : "fail"],
    ["crewStatus", crewR.status === "fulfilled" ? crewR.value.entries.length : "fail"],
    ["telemetry", telemR.status === "fulfilled" ? telemR.value.entries.length : "fail"],
    ["orbit", orbitR.status === "fulfilled" ? orbitR.value.entries.length : "n/a"],
  ] as const;
  const countsList = document.getElementById("dbg-counts");
  if (countsList) {
    countsList.innerHTML = counts
      .map(([k, v]) => `<li>${k}: <code>${String(v)}</code></li>`)
      .join("");
  }

  // Update "current entry" stamps once per second.
  const dl = document.getElementById("dbg-current");
  if (!dl) return;
  const update = (): void => {
    const seconds = ref.value;
    const rows: string[] = [];
    rows.push(`<dt>GET</dt><dd>${secondsToTimeStr(seconds)}</dd>`);
    if (stagesR.status === "fulfilled") {
      const idx = findStageIndex(stagesR.value, seconds);
      const s = idx >= 0 ? stagesR.value.stages[idx] : undefined;
      rows.push(`<dt>stage</dt><dd>${s ? `${s.timeStr} ${s.name}` : "(none)"}</dd>`);
    }
    if (segsR.status === "fulfilled") {
      const idx = findVideoSegmentIndex(segsR.value, seconds);
      const s = idx >= 0 ? segsR.value.segments[idx] : undefined;
      rows.push(`<dt>segment</dt><dd>${s ? `${s.startTimeStr} → ${s.endTimeStr}` : "(none)"}</dd>`);
    }
    dl.innerHTML = rows.join("");
  };
  update();
  window.setInterval(update, 1000);
}

// ── boot ──────────────────────────────────────────────────────────────────────

ready(() => {
  const id = readMissionId();
  if (!id) {
    console.error("[missionApp] <body data-mission> missing or invalid");
    return;
  }
  const config = CONFIGS[id];
  if (!config) return;
  window.MISSION = config;

  const deepLink = parseDeepLink(window.location.search);
  const initialGet =
    deepLink.seek?.kind === "seconds"
      ? deepLink.seek.seconds
      : timeIdToSeconds(config.defaultStartTimeId);
  const currentSecondsRef = new MissionPlayback(
    initialGet,
    -config.countdownSeconds,
    config.missionDurationSeconds,
  );
  if (deepLink.seek?.kind === "rt") {
    currentSecondsRef.value = realtimeGet(Date.parse(config.launchDate), initialGet);
  }
  const shell = renderShell(config);
  document.addEventListener("airt:seek", (event) => {
    seekRevision++;
    currentSecondsRef.value = (event as CustomEvent<{ seconds: number }>).detail.seconds;
    shell.getInput.value = secondsToTimeStr(currentSecondsRef.value);
  });
  startClock(config, shell, currentSecondsRef);
  wireGetInput(shell);
  wireTabs(shell);
  const overlayState = wireOverlays(shell);
  setActiveTab(shell, "transcript");
  const transport = (): void => {
    const play = document.getElementById("playPauseBtn");
    if (play) {
      play.textContent = currentSecondsRef.playing ? "Pause" : "Play";
      play.setAttribute("aria-label", currentSecondsRef.playing ? "Pause" : "Play");
      play.setAttribute("aria-pressed", String(currentSecondsRef.playing));
    }
    const videoPlay = document.getElementById("videoPlaybackBtn");
    videoPlay?.setAttribute(
      "aria-label",
      currentSecondsRef.playing ? "Pause mission video" : "Play mission video",
    );
    videoPlay?.setAttribute("aria-pressed", String(currentSecondsRef.playing));
    videoPlay?.setAttribute(
      "title",
      currentSecondsRef.playing ? "Pause the mission" : "Play the mission",
    );
    const sound = document.getElementById("soundBtn");
    sound?.setAttribute("aria-pressed", String(currentSecondsRef.muted));
    sound?.setAttribute("title", currentSecondsRef.muted ? "Unmute sound" : "Mute sound");
    document.dispatchEvent(new Event("airt:transport"));
  };
  document.getElementById("playPauseBtn")?.addEventListener("click", () => {
    currentSecondsRef.setPlaying(!currentSecondsRef.playing);
    transport();
  });
  document.getElementById("videoPlaybackBtn")?.addEventListener("click", () => {
    currentSecondsRef.setPlaying(!currentSecondsRef.playing);
    transport();
  });
  document.getElementById("soundBtn")?.addEventListener("click", () => {
    currentSecondsRef.muted = !currentSecondsRef.muted;
    transport();
  });
  document.getElementById("realtimeBtn")?.addEventListener("click", () => {
    seekTo(realtimeGet(Date.parse(config.launchDate), currentSecondsRef.value));
    currentSecondsRef.setPlaying(true);
    transport();
  });
  document.getElementById("fullscreenBtn")?.addEventListener("click", () => {
    const action = document.fullscreenElement
      ? document.exitFullscreen()
      : shell.root.requestFullscreen();
    void action.catch((error: unknown) => {
      console.warn("Fullscreen unavailable", error);
    });
  });
  document.getElementById("shareBtn")?.addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("t", secondsToTimeStr(currentSecondsRef.value));
    const selected = shell.channelGrid.querySelector(".is-active");
    if (currentSecondsRef.mocrActive && selected)
      url.searchParams.set("ch", selected.id.replace("btn-ch", ""));
    const input = document.getElementById("shareUrl");
    const dialog = document.getElementById("shareDialog");
    if (input instanceof HTMLInputElement && dialog instanceof HTMLDialogElement) {
      input.value = url.toString();
      dialog.showModal();
      input.select();
    }
  });
  document.getElementById("aboutBtn")?.addEventListener("click", () => {
    openMissionAbout(config);
  });
  mountMissionSplash({
    config,
    container: shell.root,
    onEnter: (seconds) => {
      seekTo(seconds);
      currentSecondsRef.setPlaying(true);
      transport();
    },
    onAbout: () => {
      openMissionAbout(config);
    },
  });
  document.addEventListener("airt:playing", (event) => {
    currentSecondsRef.setPlaying((event as CustomEvent<boolean>).detail);
    transport();
  });
  transport();
  void mountNavigator(config, shell, currentSecondsRef);
  void mountVideoPlayer(config, shell, currentSecondsRef);
  void mountTranscriptPanel(config, shell, currentSecondsRef);
  void mountTocPanel(config, shell, currentSecondsRef);
  void mountCommentaryPanel(config, shell, currentSecondsRef);
  void mountPhotoPanel(config, shell, currentSecondsRef);
  void mountDashboardPanel(config, shell, currentSecondsRef);
  void startDashboardAutodisplay(config, shell, currentSecondsRef, overlayState);
  void mountSearchPanel(config, shell);
  mountMocrvizPanel(config, shell, currentSecondsRef, deepLink.channel);
  void mountDebugReadout(config, shell, currentSecondsRef);
});
