/**
 * Per-mission app entry — boots the typed Apollo {N} app at `/{N}/`.
 *
 * Builds the typed production shell (`src/app/shell.ts`), then mounts
 * every typed engine and panel into the shell's named slots. Append
 * `?debug=1` to the URL to also render the diagnostic-readout dump in
 * a side host (useful while Phase 6 hardens). The byte-for-byte legacy
 * oracle lives at `/legacy/{N}/`.
 *
 * Mission id is read from `<body data-mission="11|13|17">`. The matching
 * typed `MissionConfig` is imported statically and exposed at
 * `window.MISSION` for any module that still reads it.
 */

import { a11Config } from "../missions/11.config.js";
import { a13Config } from "../missions/13.config.js";
import { a17Config } from "../missions/17.config.js";
import { secondsToTimeStr, timeStrToSeconds } from "../shell/clock.js";
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
import { renderShell, setActiveTab, type ShellElements } from "./shell.js";
import { parseDeepLink } from "./deepLink.js";

const CONFIGS: Record<string, MissionConfig> = {
  "11": a11Config,
  "13": a13Config,
  "17": a17Config,
};

function readMissionId(): "11" | "13" | "17" | null {
  const id = document.body.dataset.mission;
  return id === "11" || id === "13" || id === "17" ? id : null;
}

/** Modern-year launch epoch ms ("if the mission launched this year"). */
function modernLaunchEpochMs(config: MissionConfig): number {
  const year = new Date().getFullYear().toString();
  return Date.parse(year + config.launchDateModernSuffix);
}

/**
 * Clock tick — formats both the historic-launch and modern-year GETs
 * plus the wall-clock date strings into the header readouts.
 */
function startClock(config: MissionConfig, shell: ShellElements): void {
  const modernEpoch = modernLaunchEpochMs(config);
  const historicEpoch = Date.parse(config.launchDate);

  const fmtDate = (epoch: number): string => {
    if (!Number.isFinite(epoch)) return "--";
    const d = new Date(Date.now() - (Date.now() - epoch < 0 ? 0 : 0));
    return d.toUTCString().slice(0, 16); // "Mon, 21 Jul 1969"
  };
  const fmtTime = (epoch: number): string => {
    if (!Number.isFinite(epoch)) return "--";
    const d = new Date();
    return d.toUTCString().slice(17, 25); // "16:50:00"
  };

  const tick = (): void => {
    const now = Date.now();
    if (Number.isFinite(historicEpoch)) {
      shell.historicDate.textContent = `T+${secondsToTimeStr(Math.trunc((now - historicEpoch) / 1000))}`;
      shell.historicTime.textContent = fmtDate(historicEpoch);
    } else {
      shell.historicDate.textContent = "(launchDate unparseable)";
    }
    if (Number.isFinite(modernEpoch)) {
      shell.modernDate.textContent = `if launched today: T+${secondsToTimeStr(Math.trunc((now - modernEpoch) / 1000))}`;
      shell.modernTime.textContent = fmtTime(modernEpoch);
    } else {
      shell.modernDate.textContent = "(modern suffix unparseable)";
    }
  };
  tick();
  window.setInterval(tick, 1000);
}

/**
 * Wire the GET input + GO button. The input accepts "HHH:MM:SS" (with
 * an optional leading "-" for pre-launch) and "GO" dispatches a `seek`
 * `CustomEvent` on `document` so any registered panel can react. The
 * navigator renderer's `onSeek` callback also fires this event so all
 * sources stay aligned.
 */
function wireGetInput(shell: ShellElements, currentSecondsRef: { value: number }): void {
  const dispatchSeek = (seconds: number): void => {
    currentSecondsRef.value = seconds;
    shell.getInput.value = secondsToTimeStr(seconds);
    document.dispatchEvent(new CustomEvent("airt:seek", { detail: { seconds } }));
  };
  shell.getButton.addEventListener("click", () => {
    const raw = shell.getInput.value.trim();
    const negative = raw.startsWith("-");
    const body = negative ? raw.slice(1) : raw;
    try {
      const seconds = timeStrToSeconds(body) * (negative ? -1 : 1);
      if (Number.isFinite(seconds)) dispatchSeek(seconds);
    } catch (err) {
      console.warn("[missionApp] bad GET input:", err);
    }
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
  let videos: VideoUrlData;
  try {
    videos = await loadVideoUrlData(`/${config.id}/`);
  } catch (err) {
    console.warn("[missionApp] failed to load video URLs for dashboard auto-display", err);
    return;
  }
  startTicker(ref, (seconds) => {
    if (state.dashboardManuallyToggled || !shell.searchOverlay.hidden) return;
    const idx = findVideoUrlIndex(videos, seconds);
    if (idx >= 0) {
      const segment = videos.entries[idx];
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

/**
 * Minimal YouTube embed surface. The player sits in the left-column
 * monitor underneath the dashboard overlay. When current GET enters a
 * `videoURLData.csv` range, load that video's iframe and seek to the
 * offset inside the segment; otherwise leave the last frame/blank player
 * behind the dashboard.
 */
async function mountVideoPlayer(
  config: MissionConfig,
  shell: ShellElements,
  ref: { value: number },
): Promise<void> {
  let data: VideoUrlData;
  try {
    data = await loadVideoUrlData(`/${config.id}/`);
  } catch (err) {
    console.warn("[missionApp] failed to load video URL data", err);
    return;
  }

  let lastVideoKey = "";
  startTicker(ref, (seconds) => {
    const idx = findVideoUrlIndex(data, seconds);
    if (idx < 0) return;
    const entry = data.entries[idx];
    if (!entry || entry.videoId === "") return;
    const startOffset = Math.max(0, Math.floor(seconds - entry.startSeconds));
    // Only rebuild when changing segment/video. Avoid resetting playback
    // once a second while still inside the same segment.
    const key = `${entry.videoId}:${String(entry.startSeconds)}`;
    if (key === lastVideoKey) return;
    lastVideoKey = key;
    const src = new URL(`https://www.youtube.com/embed/${encodeURIComponent(entry.videoId)}`);
    src.searchParams.set("start", String(startOffset));
    src.searchParams.set("autoplay", "1");
    src.searchParams.set("mute", "1");
    src.searchParams.set("playsinline", "1");
    shell.player.innerHTML = `<iframe title="Mission video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen src="${src.toString()}"></iframe>`;
  });
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
  const [stagesResult, videoSegmentsResult, photosResult, tocResult] = await Promise.allSettled([
    loadMissionStagesData(baseUrl, { missionDurationSeconds: config.missionDurationSeconds }),
    loadVideoSegmentData(baseUrl),
    loadPhotoData(baseUrl),
    loadTocData(baseUrl),
  ]);

  const overlays: NavigatorOverlays = {
    ...(stagesResult.status === "fulfilled" && { stages: stagesResult.value }),
    ...(videoSegmentsResult.status === "fulfilled" && { videoSegments: videoSegmentsResult.value }),
    ...(photosResult.status === "fulfilled" && { photos: photosResult.value }),
    ...(tocResult.status === "fulfilled" && { toc: tocResult.value }),
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

  renderer.render(currentSecondsRef.value);
  window.setInterval(() => {
    renderer.render(currentSecondsRef.value);
  }, 1000);
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
    onSeek: (timeId) => {
      console.warn("[missionApp] transcript seek", timeId);
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
      console.warn("[missionApp] TOC seek", timeId);
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
    onSeek: (timeId) => {
      console.warn("[missionApp] commentary seek", timeId);
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
        };
      }
      if (entry.supportingFilename !== "") {
        const url = `${mediaRoot}/images/supporting/${entry.supportingFilename}`;
        return { thumb: url, full: url };
      }
      const url = `${alsj}/${entry.filename}`;
      return { thumb: url, full: url };
    }

    if (config.id === "11") {
      const lpi = config.lpiCdnRoot ?? "";
      const parts = parseAsRollImg(entry.photoId, "11");
      if (parts) {
        const thumb = `${lpi}/resources/apollo/images/thumb/AS11/${parts.rollNum}/${parts.imgNum}.jpg`;
        return { thumb, full: thumb };
      }
      if (entry.supportingFilename !== "") {
        return {
          thumb: entry.supportingFilename,
          full: entry.supportingFilename,
        };
      }
      const url = `${mediaRoot}/images/NASA_photos/${entry.filename}`;
      return { thumb: url, full: url };
    }

    // A17
    const isFlight = entry.filename !== "";
    const subdir = isFlight ? "flight" : "supporting";
    const base = isFlight ? `AS17-${entry.photoId}` : entry.photoId;
    const fullSize = isFlight ? "4175" : "2100";
    return {
      thumb: `${mediaRoot}/images/${subdir}/100/${base}.jpg`,
      full: `${mediaRoot}/images/${subdir}/${fullSize}/${base}.jpg`,
    };
  };
}

async function mountPhotoPanel(
  config: MissionConfig,
  shell: ShellElements,
  ref: { value: number },
): Promise<void> {
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
      console.warn("[missionApp] photo seek", timeId);
    },
  });
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
}

async function mountSearchPanel(config: MissionConfig, shell: ShellElements): Promise<void> {
  const [uttR, comR, photoR] = await Promise.allSettled([
    loadUtteranceData(`/${config.id}/`),
    loadCommentaryData(`/${config.id}/`),
    loadPhotoData(`/${config.id}/`),
  ]);
  createSearchPanel({
    container: shell.searchResults,
    sources: {
      ...(uttR.status === "fulfilled" && { utterances: uttR.value }),
      ...(comR.status === "fulfilled" && { commentary: comR.value }),
      ...(photoR.status === "fulfilled" && { photos: photoR.value }),
    },
    onResult: (item) => {
      console.warn("[missionApp] search pick", item);
    },
  });
}

function renderChannelStrip(
  config: MissionConfig,
  shell: ShellElements,
  panel: MocrvizPanel | null,
): void {
  const catalog = channelsFor(config.id);
  shell.channelGrid.textContent = "";
  if (catalog === null) {
    shell.channelGrid.parentElement?.setAttribute("hidden", "");
    return;
  }

  const buttons = new Map<number, HTMLButtonElement>();
  const redacted = new Set(catalog.redacted);
  for (const info of catalog.all) {
    const wrap = document.createElement("div");
    wrap.className = "buttondiv";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = `btn-ch${String(info.id)}`;
    btn.className = "thirtybtn-channel";
    btn.textContent = info.label;
    btn.title = `${String(info.id)}. ${info.description}`;
    btn.disabled = redacted.has(info.id) || !catalog.available.includes(info.id);
    if (info.id === catalog.defaultChannel) btn.classList.add("is-active");
    btn.addEventListener("click", () => {
      if (btn.disabled || panel === null) return;
      panel.setChannel(info.id);
      for (const [id, button] of buttons) button.classList.toggle("is-active", id === info.id);
    });
    wrap.append(btn);
    shell.channelGrid.append(wrap);
    buttons.set(info.id, btn);
  }
}

async function mountMocrvizPanel(
  config: MissionConfig,
  shell: ShellElements,
  ref: { value: number },
): Promise<void> {
  if (config.features?.mocrviz !== true) {
    renderChannelStrip(config, shell, null);
    return;
  }
  if (config.id !== "11" && config.id !== "13") {
    renderChannelStrip(config, shell, null);
    return;
  }

  // Render the production middle-strip immediately; audio-panel loading is
  // allowed to lag/fail without leaving the layout empty.
  renderChannelStrip(config, shell, null);

  let mod: typeof import("../panels/mocrviz/index.js");
  try {
    mod = await import("../panels/mocrviz/index.js");
  } catch (err) {
    console.warn("[missionApp] failed to import MOCRviz panel", err);
    return;
  }
  const audioRoot = `/${config.id}/MOCRviz/MOCR_audio`;
  let panel: MocrvizPanel | null;
  try {
    panel = await mod.createMocrvizPanel({
      container: shell.mocrvizHost,
      mission: config.id,
      mediaRoot: `/${config.id}/`,
      audioRoot,
    });
  } catch (err) {
    shell.mocrvizHost.textContent = `failed to load MOCRviz: ${String(err)}`;
    return;
  }
  if (panel === null) return;

  // Production default is Photography; MOCR audio is a right-column tab.
  shell.mocrvizHost.hidden = true;
  renderChannelStrip(config, shell, panel);

  const photoTab = document.getElementById("photoTab");
  const mocrTab = document.getElementById("mocrTab");
  photoTab?.addEventListener("click", () => {
    shell.mocrvizHost.hidden = true;
    photoTab.classList.add("is-active");
    mocrTab?.classList.remove("is-active");
  });
  mocrTab?.addEventListener("click", () => {
    shell.mocrvizHost.hidden = false;
    mocrTab.classList.add("is-active");
    photoTab?.classList.remove("is-active");
  });

  startTicker(ref, (seconds) => {
    panel.setClock(seconds, !shell.mocrvizHost.querySelector<HTMLAudioElement>("audio")?.paused);
  });
}

// ── debug readout (?debug=1) ──────────────────────────────────────────────────

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

  // Shared seconds reference — the navigator, GET input, and every panel
  // ticker read from / write to this single mutable cell.
  const historicEpoch = Date.parse(config.launchDate);
  const currentSecondsRef = {
    value: Number.isFinite(historicEpoch) ? Math.trunc((Date.now() - historicEpoch) / 1000) : 0,
  };

  const liveModeRef = { value: true };

  // Deep-link params (`?t=HHH:MM:SS`, `?t=rt`, `?ch=N`). Mirrors legacy
  // `initializePlayback`. A `t=` seek pins the ref and disables live
  // mode so manual visual QA and Playwright diffs land on a stable GET.
  const deepLink = parseDeepLink(window.location.search);
  if (deepLink.seek?.kind === "seconds") {
    currentSecondsRef.value = deepLink.seek.seconds;
    liveModeRef.value = false;
  }

  // Listen for `airt:seek` from any source (GET input, navigator, future
  // deep-link parser) and rebroadcast it back into the seconds ref so
  // tickers pick it up on next interval. Manual seeks intentionally exit
  // live wall-clock mode; otherwise the next 1-Hz tick immediately snaps
  // back to today's historic clock and makes visual QA impossible.
  document.addEventListener("airt:seek", (e) => {
    const seconds = (e as CustomEvent<{ seconds: number }>).detail.seconds;
    if (Number.isFinite(seconds)) {
      currentSecondsRef.value = seconds;
      liveModeRef.value = false;
    }
  });

  // Auto-advance the ref from the historic-launch wall clock only while
  // in live mode. A future #realtimeBtn will restore `liveModeRef.value`.
  if (Number.isFinite(historicEpoch)) {
    window.setInterval(() => {
      if (liveModeRef.value) {
        currentSecondsRef.value = Math.trunc((Date.now() - historicEpoch) / 1000);
      }
    }, 1000);
  }

  const shell = renderShell(config);
  // If a deep-link `?t=` pinned a specific GET, reflect it in the input
  // immediately so the user/test can see the intent. Without this the
  // input keeps its `defaultStartTimeId`-derived placeholder until the
  // first tick lands.
  if (deepLink.seek?.kind === "seconds") {
    shell.getInput.value = secondsToTimeStr(deepLink.seek.seconds);
  }
  startClock(config, shell);
  wireGetInput(shell, currentSecondsRef);
  wireTabs(shell);
  const overlayState = wireOverlays(shell);
  setActiveTab(shell, "transcript");

  void mountNavigator(config, shell, currentSecondsRef);
  void mountVideoPlayer(config, shell, currentSecondsRef);
  void mountTranscriptPanel(config, shell, currentSecondsRef);
  void mountTocPanel(config, shell, currentSecondsRef);
  void mountCommentaryPanel(config, shell, currentSecondsRef);
  void mountPhotoPanel(config, shell, currentSecondsRef);
  void mountDashboardPanel(config, shell, currentSecondsRef);
  void startDashboardAutodisplay(config, shell, currentSecondsRef, overlayState);
  void mountSearchPanel(config, shell);
  void mountMocrvizPanel(config, shell, currentSecondsRef);
  void mountDebugReadout(config, shell, currentSecondsRef);

  console.warn(`[missionApp] ${config.name} (${id}) ready (debug=${String(shell.debugVisible)})`);
});
