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
import { loadVideoUrlData } from "../data/videoUrlData.js";
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
import { renderShell, setActiveTab, type ShellElements } from "./shell.js";

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
  // The photo panel paints both gallery + photodiv into a single container,
  // so mount it on the `.airt-photo` wrapper instead of just one slot.
  const wrap = shell.photoGallery.parentElement;
  if (!(wrap instanceof HTMLElement)) return;
  // Wipe the two skeleton hosts the shell rendered (`#photoGallery`,
  // `#photodiv`); the panel re-creates its own DOM and reuses the same
  // class names so per-panel CSS still applies.
  shell.photoGallery.remove();
  shell.photoDiv.remove();

  let data: PhotoData;
  try {
    data = await loadPhotoData(`/${config.id}/`);
  } catch (err) {
    wrap.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  const panel = createPhotoPanel({
    container: wrap,
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
  // Keep dashboard hidden until the user explicitly toggles it (Phase 6.5
  // will wire up the legacy #dashboardBtn). For now leave it built but
  // not visible — testing can flip the `hidden` attribute manually.
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

async function mountMocrvizPanel(
  config: MissionConfig,
  shell: ShellElements,
  ref: { value: number },
): Promise<void> {
  if (config.features?.mocrviz !== true) return;
  if (config.id !== "11" && config.id !== "13") return;
  shell.mocrvizHost.hidden = false;
  const mod = await import("../panels/mocrviz/index.js");
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

  // Listen for `airt:seek` from any source (GET input, navigator, future
  // deep-link parser) and rebroadcast it back into the seconds ref so
  // tickers pick it up on next interval.
  document.addEventListener("airt:seek", (e) => {
    const seconds = (e as CustomEvent<{ seconds: number }>).detail.seconds;
    if (Number.isFinite(seconds)) currentSecondsRef.value = seconds;
  });

  // Auto-advance the ref from the historic-launch wall clock when the
  // user hasn't recently seeked. (Simple model for now: always advance.
  // Phase 6.5 will add a "paused" toggle for the play/pause button.)
  if (Number.isFinite(historicEpoch)) {
    window.setInterval(() => {
      currentSecondsRef.value = Math.trunc((Date.now() - historicEpoch) / 1000);
    }, 1000);
  }

  const shell = renderShell(config);
  startClock(config, shell);
  wireGetInput(shell, currentSecondsRef);
  wireTabs(shell);
  setActiveTab(shell, "transcript");

  void mountNavigator(config, shell, currentSecondsRef);
  void mountTranscriptPanel(config, shell, currentSecondsRef);
  void mountTocPanel(config, shell, currentSecondsRef);
  void mountCommentaryPanel(config, shell, currentSecondsRef);
  void mountPhotoPanel(config, shell, currentSecondsRef);
  void mountDashboardPanel(config, shell, currentSecondsRef);
  void mountSearchPanel(config, shell);
  void mountMocrvizPanel(config, shell, currentSecondsRef);
  void mountDebugReadout(config, shell, currentSecondsRef);

  console.warn(`[missionApp] ${config.name} (${id}) ready (debug=${String(shell.debugVisible)})`);
});
