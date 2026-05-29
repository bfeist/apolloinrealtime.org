/**
 * Per-mission progressive dev harness.
 *
 * Boots a near-blank shell at `/dev/{11,13,17}/` that loads ONLY the typed
 * ESM modules that exist so far — no legacy `index.js` / `ajax.js` /
 * `navigator.js`. This is the surface where each Phase 4 / 4.5 / 5 module
 * is wired in as soon as it lands, so the author can verify it
 * behaviorally in a real browser against real mission config.
 *
 * See docs-plan/05-migration-plan.md §Verification "layer 2" and
 * docs-plan/08-progress-tracker.md.
 *
 * Mission id is read from `<body data-mission="11|13|17">`. The script
 * imports the matching typed config statically (all three are tiny) and
 * exposes it at `window.MISSION` for any module that still reads it.
 *
 * This module is dev-only scaffolding. It is excluded from the production
 * build (Phase 7 cutover removes the `/dev/` pages entirely).
 */

import { a11Config } from "../missions/11.config.js";
import { a13Config } from "../missions/13.config.js";
import { a17Config } from "../missions/17.config.js";
import { secondsToTimeStr } from "../shell/clock.js";
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
import { loadCrewStatusData, findCrewStatusIndex } from "../data/crewStatusData.js";
import { loadTelemetryData, findTelemetryIndex } from "../data/telemetryData.js";
import { loadOrbitData, findOrbitIndex } from "../data/orbitData.js";
import { createCommentaryPanel } from "../panels/commentary/index.js";
import { createTranscriptPanel } from "../panels/transcript/index.js";
import { createPhotoPanel } from "../panels/photo/index.js";
import type { PhotoUrlResolver } from "../panels/photo/index.js";
import { parseAsRollImg } from "../panels/photo/index.js";
import { createTelemetryPanel } from "../panels/telemetry/index.js";
import type { FrameOfReferenceRange } from "../panels/telemetry/index.js";
import { createCrewStatusPanel } from "../panels/crewStatus/index.js";
import { createDashboardPanel } from "../panels/dashboard/index.js";
import { createSearchPanel } from "../panels/search/index.js";
import type { MocrvizPanel } from "../panels/mocrviz/index.js";

const CONFIGS: Record<string, MissionConfig> = {
  "11": a11Config,
  "13": a13Config,
  "17": a17Config,
};

function readMissionId(): "11" | "13" | "17" | null {
  const id = document.body.dataset.mission;
  return id === "11" || id === "13" || id === "17" ? id : null;
}

/**
 * Resolve the "current-year" launch date for a mission.
 * Mirrors the legacy `index.js` pattern of prepending the current year
 * to `launchDateModernSuffix`, e.g. "2026" + "-04-11 19:13:00 GMT".
 * Returns `NaN` if the resulting string can't be parsed.
 */
function modernLaunchEpochMs(config: MissionConfig): number {
  const year = new Date().getFullYear().toString();
  return Date.parse(year + config.launchDateModernSuffix);
}

interface ClockReadout {
  modern: HTMLElement;
  historic: HTMLElement;
}

function buildShell(config: MissionConfig): ClockReadout {
  const root = document.getElementById("mission-root");
  if (!root) throw new Error("[dev/missionHarness] #mission-root missing");

  root.innerHTML = `
    <header>
      <h1>${config.name} <small>(${config.id})</small></h1>
      <p class="muted">
        Progressive dev shell — loads only typed ESM modules. No legacy
        <code>index.js</code> / <code>ajax.js</code> / <code>navigator.js</code>.
      </p>
    </header>

    <section class="card">
      <h2>clock</h2>
      <div class="row"><label>GET (modern launch year):</label><code id="get-modern">--:--:--</code></div>
      <div class="row"><label>GET (historic launch):</label><code id="get-historic">--:--:--</code></div>
      <div class="row muted">
        mission duration: ${secondsToTimeStr(config.missionDurationSeconds)} ·
        countdown: ${secondsToTimeStr(config.countdownSeconds)} ·
        default start: ${config.defaultStartTimeId}
      </div>
    </section>

    <section class="card">
      <h2>mission config</h2>
      <pre id="config-dump"></pre>
    </section>

    <section class="card">
      <h2>navigator (Paper.js renderer)</h2>
      <p class="muted">
        Typed <code>NavigatorRenderer</code> on the injected Paper.js scope.
        Tiers, nav boxes, cursor + hover nav-cursor; click a tier to seek.
        Data overlays (stage/video/photo ticks) are Phase 5.
      </p>
      <canvas id="navCanvas" width="1200" height="220"
        style="width:100%;height:220px;background:#0b0b0b;border:1px solid #2a2a2a;border-radius:4px;display:block"></canvas>
      <div class="row muted">last seek: <code id="nav-seek">(none)</code></div>
    </section>

    <section class="card">
      <h2>mission stages</h2>
      <p class="muted">
        Typed <code>loadMissionStagesData()</code> against
        <code>indexes/missionStagesData.csv</code>. Highlighted row =
        stage containing the live historic-launch GET.
      </p>
      <div class="row muted">status: <code id="stages-status">loading...</code></div>
      <ol id="stages-list" style="margin:0;padding:0 0 0 1.5em;font-family:'Roboto Mono',monospace;font-size:12px"></ol>
    </section>

    <section class="card">
      <h2>video segments</h2>
      <p class="muted">
        Typed <code>loadVideoSegmentData()</code> against
        <code>indexes/videoSegmentData.csv</code>. Total count + the segment
        (if any) covering the current GET.
      </p>
      <div class="row muted">status: <code id="segments-status">loading...</code></div>
      <div class="row muted">current segment: <code id="segments-current">(none)</code></div>
    </section>

    <section class="card">
      <h2>TOC panel (typed)</h2>
      <p class="muted">
        Typed <code>createTocPanel()</code> mounted in-page (no iframe).
        Highlights track live historic-launch GET; click a row to log a
        seek (no media player on this page).
      </p>
      <div class="row muted">last click: <code id="tocpanel-seek">(none)</code></div>
      <div id="tocpanel-host" style="max-height:240px;overflow:auto;background:#0b0b0b;border:1px solid #2a2a2a;border-radius:4px;padding:4px"></div>
    </section>

    <section class="card">
      <h2>TOC data</h2>
      <p class="muted">
        Typed <code>loadTocData()</code> against <code>indexes/TOCData.csv</code>.
        Highlighted row = nearest TOC entry &le; current historic-launch GET
        (the same rule as legacy <code>scrollToClosestTOC</code>).
      </p>
      <div class="row muted">status: <code id="toc-status">loading...</code></div>
      <ol id="toc-list" style="max-height:240px;overflow:auto;margin:0;padding:0 0 0 1.5em;font-family:'Roboto Mono',monospace;font-size:12px"></ol>
    </section>

    <section class="card" id="modules">
      <h2>typed modules wired in</h2>
      <ul>
        <li><code>src/shell/clock.ts</code> — live readout above</li>
        <li><code>src/engines/navigator/layout.ts</code> + <code>renderer.ts</code> — navigator above</li>
        <li><code>src/data/csvLoader.ts</code> + <code>src/data/tocData.ts</code> — TOC list above</li>
        <li><code>src/panels/toc/index.ts</code> — TOC panel above (jQuery-free, replaces <code>TOC.html</code> iframe)</li>
        <li><code>src/data/missionStagesData.ts</code> — mission stages list above</li>
        <li><code>src/data/videoSegmentData.ts</code> — video segments readout above</li>
        <li><code>src/data/commentaryData.ts</code> — commentary readout below</li>
        <li><code>src/data/utteranceData.ts</code> — transcript/utterance readout below</li>
        <li><code>src/data/photoData.ts</code> — photo ticks readout below</li>
        <li><code>src/data/videoUrlData.ts</code> — video URL segments readout below</li>
        <li><code>src/data/crewStatusData.ts</code> — crew status readout below</li>
        <li><code>src/data/telemetryData.ts</code> — telemetry readout below</li>
        <li><code>src/data/orbitData.ts</code> — orbit readout below</li>
        <li><code>src/panels/commentary/index.ts</code> — commentary panel below</li>
        <li><code>src/panels/transcript/index.ts</code> — transcript panel below</li>
        <li><code>src/panels/photo/index.ts</code> — photo panel below</li>
        <li><code>src/panels/telemetry/index.ts</code> — telemetry panel below</li>
        <li><code>src/panels/crewStatus/index.ts</code> — crew status panel below</li>
        <li><code>src/panels/dashboard/index.ts</code> — dashboard panel below</li>
        <li><code>src/panels/search/index.ts</code> — search panel below</li>
      </ul>
    </section>

    <section class="card">
      <h2>commentary data</h2>
      <p class="muted">
        Typed <code>loadCommentaryData()</code> against
        <code>indexes/commentaryData.csv</code>. Current entry at historic GET.
      </p>
      <div class="row muted">status: <code id="commentary-status">loading...</code></div>
      <div class="row muted">current: <code id="commentary-current">(none)</code></div>
    </section>

    <section class="card">
      <h2>utterance (transcript) data</h2>
      <p class="muted">
        Typed <code>loadUtteranceData()</code> against
        <code>indexes/utteranceData.csv</code>. Current utterance at historic GET.
      </p>
      <div class="row muted">status: <code id="utterance-status">loading...</code></div>
      <div class="row muted">current: <code id="utterance-current">(none)</code></div>
    </section>

    <section class="card">
      <h2>photo data</h2>
      <p class="muted">
        Typed <code>loadPhotoData()</code> against
        <code>indexes/photoData.csv</code>. Most recent photo at historic GET.
      </p>
      <div class="row muted">status: <code id="photo-status">loading...</code></div>
      <div class="row muted">current: <code id="photo-current">(none)</code></div>
    </section>

    <section class="card">
      <h2>video URL data</h2>
      <p class="muted">
        Typed <code>loadVideoUrlData()</code> against
        <code>indexes/videoURLData.csv</code>. Current video segment at historic GET.
      </p>
      <div class="row muted">status: <code id="videourl-status">loading...</code></div>
      <div class="row muted">current: <code id="videourl-current">(none)</code></div>
    </section>

    <section class="card">
      <h2>crew status data</h2>
      <p class="muted">
        Typed <code>loadCrewStatusData()</code> against
        <code>indexes/crewStatusData.csv</code>. Current crew status at historic GET.
      </p>
      <div class="row muted">status: <code id="crewstatus-status">loading...</code></div>
      <div class="row muted">current: <code id="crewstatus-current">(none)</code></div>
    </section>

    <section class="card">
      <h2>telemetry data</h2>
      <p class="muted">
        Typed <code>loadTelemetryData()</code> against
        <code>indexes/telemetryData.csv</code>. Current telemetry at historic GET.
      </p>
      <div class="row muted">status: <code id="telemetry-status">loading...</code></div>
      <div class="row muted">current: <code id="telemetry-current">(none)</code></div>
    </section>

    <section class="card">
      <h2>orbit data</h2>
      <p class="muted">
        Typed <code>loadOrbitData()</code> against
        <code>indexes/orbitData.csv</code>. Current orbit at historic GET (A17 only).
      </p>
      <div class="row muted">status: <code id="orbit-status">loading...</code></div>
      <div class="row muted">current: <code id="orbit-current">(none)</code></div>
    </section>

    <section class="card">
      <h2>commentary panel (typed)</h2>
      <p class="muted">
        Typed <code>createCommentaryPanel()</code>. Highlight tracks the
        nearest commentary entry to the live GET; click a row to log a seek.
      </p>
      <div class="row muted">last click: <code id="commentarypanel-seek">(none)</code></div>
      <div id="commentarypanel-host" style="max-height:240px;overflow:auto;background:#0b0b0b;border:1px solid #2a2a2a;border-radius:4px;padding:4px"></div>
    </section>

    <section class="card">
      <h2>transcript panel (typed)</h2>
      <p class="muted">
        Typed <code>createTranscriptPanel()</code>. Highlight tracks the
        nearest utterance to the live GET; click to log a seek.
      </p>
      <div class="row muted">last click: <code id="transcriptpanel-seek">(none)</code></div>
      <div id="transcriptpanel-host" style="max-height:240px;overflow:auto;background:#0b0b0b;border:1px solid #2a2a2a;border-radius:4px;padding:4px"></div>
    </section>

    <section class="card">
      <h2>photo panel (typed)</h2>
      <p class="muted">
        Typed <code>createPhotoPanel()</code>. Per-mission URL resolver
        picks the legacy LPI / ALSJ / media-CDN paths. Click a thumb to
        log a seek and load the full image below.
      </p>
      <div class="row muted">last click: <code id="photopanel-seek">(none)</code></div>
      <div id="photopanel-host" style="max-height:320px;overflow:auto;background:#0b0b0b;border:1px solid #2a2a2a;border-radius:4px;padding:4px"></div>
    </section>

    <section class="card">
      <h2>telemetry panel (typed)</h2>
      <p class="muted">
        Typed <code>createTelemetryPanel()</code> &mdash; interpolated velocity
        + distance at the live GET.
      </p>
      <div id="telemetrypanel-host" style="font-family:'Roboto Mono',monospace;font-size:12px"></div>
    </section>

    <section class="card">
      <h2>crew status panel (typed)</h2>
      <p class="muted">
        Typed <code>createCrewStatusPanel()</code> &mdash; current status +
        wake-up countdown when sleeping.
      </p>
      <div id="crewstatuspanel-host" style="font-family:'Roboto Mono',monospace;font-size:12px"></div>
    </section>

    <section class="card">
      <h2>dashboard panel (typed)</h2>
      <p class="muted">
        Typed <code>createDashboardPanel()</code> &mdash; composes mission day,
        stage, crew status, telemetry.
      </p>
      <div id="dashboardpanel-host" style="font-family:'Roboto Mono',monospace;font-size:12px"></div>
    </section>

    <section class="card">
      <h2>search panel (typed)</h2>
      <p class="muted">
        Typed <code>createSearchPanel()</code> &mdash; searches transcript +
        commentary + photo captions. Type 2+ chars to match.
      </p>
      <div class="row muted">last result: <code id="searchpanel-pick">(none)</code></div>
      <div id="searchpanel-host" style="max-height:320px;overflow:auto;background:#0b0b0b;border:1px solid #2a2a2a;border-radius:4px;padding:4px"></div>
    </section>

    <section class="card" id="mocrviz-card" hidden>
      <h2>MOCRviz panel (typed, audio MVP)</h2>
      <p class="muted">
        Typed <code>createMocrvizPanel()</code> &mdash; channel grid +
        HTMLAudioElement synced to historic GET. Waveform/canvas/paper.js
        rendering and transcript loader deferred to Phase 4.5b.
      </p>
      <div id="mocrvizpanel-host" style="font-family:'Roboto Mono',monospace;font-size:12px"></div>
    </section>
  `;

  const dump = root.querySelector("#config-dump");
  if (dump) dump.textContent = JSON.stringify(config, null, 2);

  const modern = root.querySelector("#get-modern");
  const historic = root.querySelector("#get-historic");
  if (!(modern instanceof HTMLElement) || !(historic instanceof HTMLElement)) {
    throw new Error("[dev/missionHarness] clock readout elements missing");
  }
  return { modern, historic };
}

function startClock(config: MissionConfig, readout: ClockReadout): void {
  const modernEpoch = modernLaunchEpochMs(config);
  const historicEpoch = Date.parse(config.launchDate);

  const tick = (): void => {
    const now = Date.now();
    if (Number.isFinite(modernEpoch)) {
      readout.modern.textContent = secondsToTimeStr(Math.trunc((now - modernEpoch) / 1000));
    } else {
      readout.modern.textContent = "(unparseable launchDateModernSuffix)";
    }
    if (Number.isFinite(historicEpoch)) {
      readout.historic.textContent = secondsToTimeStr(Math.trunc((now - historicEpoch) / 1000));
    } else {
      readout.historic.textContent = "(unparseable launchDate)";
    }
  };
  tick();
  window.setInterval(tick, 1000);
}

/**
 * Load the legacy `paper-full.js` for this mission (it sets a global `paper`
 * PaperScope) and resolve it as a {@link PaperScopeLike}. Paper.js is a
 * classic script, not an ESM module, so it's injected via a `<script>` tag.
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
      else reject(new Error("[dev/missionHarness] paper-full.js loaded but window.paper is unset"));
    };
    script.onerror = (): void => {
      reject(new Error(`[dev/missionHarness] failed to load ${script.src}`));
    };
    document.head.appendChild(script);
  });
}

/**
 * Mount the typed {@link NavigatorRenderer} on the dev page's `#navCanvas`,
 * driven by the live mission clock. Click-to-seek updates the displayed
 * mission time (no media player on this page) and the "last seek" readout.
 */
async function mountNavigator(config: MissionConfig): Promise<void> {
  const canvas = document.getElementById("navCanvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const seekReadout = document.getElementById("nav-seek");

  let paper: PaperScopeLike;
  try {
    paper = await loadPaper(config.id);
  } catch (err) {
    console.error(err);
    return;
  }

  // Load the four overlay datasets concurrently. Use allSettled so that a
  // single CSV failure doesn't prevent the navigator from mounting.
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

  let currentSeconds = 0;
  const renderer = new NavigatorRenderer(paper, {
    missionDurationSeconds: config.missionDurationSeconds,
    countdownSeconds: config.countdownSeconds,
    overlays,
    onSeek: (seconds) => {
      currentSeconds = seconds;
      if (seekReadout) seekReadout.textContent = secondsToTimeStr(seconds);
    },
  });
  renderer.mount(canvas);

  // Advance the playback cursor once per second from the historic launch.
  const historicEpoch = Date.parse(config.launchDate);
  if (Number.isFinite(historicEpoch)) {
    currentSeconds = Math.trunc((Date.now() - historicEpoch) / 1000);
  }
  renderer.render(currentSeconds);
  window.setInterval(() => {
    if (Number.isFinite(historicEpoch)) {
      currentSeconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    }
    renderer.render(currentSeconds);
  }, 1000);
}

/**
 * Load `indexes/TOCData.csv` and render the parsed entries as a scrollable
 * list. The row whose time is the most recent &le; the live historic-launch
 * GET gets a highlight class on each clock tick.
 */
async function mountTocData(config: MissionConfig): Promise<void> {
  const listEl = document.getElementById("toc-list");
  const statusEl = document.getElementById("toc-status");
  if (!(listEl instanceof HTMLOListElement)) return;

  let toc: TocData;
  try {
    toc = await loadTocData(`/${config.id}/`);
  } catch (err) {
    if (statusEl) statusEl.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  if (statusEl) statusEl.textContent = `${String(toc.entries.length)} entries`;

  for (const entry of toc.entries) {
    const li = document.createElement("li");
    li.id = `tocdev-${entry.timeId}`;
    li.style.padding = "2px 4px";
    li.style.marginLeft = entry.level === 1 ? "0" : "1em";
    li.style.fontWeight = entry.level === 1 ? "bold" : "normal";
    li.textContent = `${entry.timeStr}  ${entry.label}`;
    listEl.appendChild(li);
  }

  const historicEpoch = Date.parse(config.launchDate);
  let lastHighlighted: HTMLElement | null = null;
  const update = (): void => {
    if (!Number.isFinite(historicEpoch)) return;
    const seconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    const idx = findClosestTocIndex(toc, seconds);
    if (idx < 0) return;
    const entry = toc.entries[idx];
    if (!entry) return;
    const el = document.getElementById(`tocdev-${entry.timeId}`);
    if (!el || el === lastHighlighted) return;
    if (lastHighlighted) lastHighlighted.style.background = "";
    el.style.background = "#234";
    lastHighlighted = el;
  };
  update();
  window.setInterval(update, 1000);
}

/**
 * Mount the typed {@link createTocPanel} into the dev page, driven by the
 * live historic-launch GET. Logs clicks to the "last click" readout instead
 * of seeking (there's no media player on this page).
 */
async function mountTocPanel(config: MissionConfig): Promise<void> {
  const host = document.getElementById("tocpanel-host");
  const seekReadout = document.getElementById("tocpanel-seek");
  if (!(host instanceof HTMLElement)) return;

  let toc: TocData;
  try {
    toc = await loadTocData(`/${config.id}/`);
  } catch (err) {
    host.textContent = `failed: ${(err as Error).message}`;
    return;
  }

  const panel = createTocPanel({
    container: host,
    data: toc,
    onSeek: (timeId) => {
      if (seekReadout) seekReadout.textContent = timeId;
    },
  });

  const historicEpoch = Date.parse(config.launchDate);
  let lastTimeId: string | null = null;
  const update = (): void => {
    if (!Number.isFinite(historicEpoch)) return;
    const seconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    const idx = findClosestTocIndex(toc, seconds);
    const entry = idx >= 0 ? toc.entries[idx] : undefined;
    const timeId = entry?.timeId ?? null;
    if (timeId === lastTimeId) return;
    panel.setActiveTimeId(timeId);
    lastTimeId = timeId;
  };
  update();
  window.setInterval(update, 1000);
}

/**
 * Load `indexes/missionStagesData.csv` and render the parsed stages as a
 * list. The stage covering the live historic-launch GET gets a highlight
 * class on each clock tick.
 */
async function mountMissionStages(config: MissionConfig): Promise<void> {
  const listEl = document.getElementById("stages-list");
  const statusEl = document.getElementById("stages-status");
  if (!(listEl instanceof HTMLOListElement)) return;

  let data: MissionStagesData;
  try {
    data = await loadMissionStagesData(`/${config.id}/`, {
      missionDurationSeconds: config.missionDurationSeconds,
    });
  } catch (err) {
    if (statusEl) statusEl.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  if (statusEl) statusEl.textContent = `${String(data.stages.length)} stages`;

  for (const [idx, stage] of data.stages.entries()) {
    const li = document.createElement("li");
    li.id = `stagedev-${String(idx)}`;
    li.style.padding = "2px 4px";
    li.textContent = `${stage.timeStr} \u2192 ${stage.endTimeStr}  ${stage.name}`;
    li.title = stage.description;
    listEl.appendChild(li);
  }

  const historicEpoch = Date.parse(config.launchDate);
  let lastHighlighted: HTMLElement | null = null;
  const update = (): void => {
    if (!Number.isFinite(historicEpoch)) return;
    const seconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    const idx = findStageIndex(data, seconds);
    if (idx < 0) {
      if (lastHighlighted) {
        lastHighlighted.style.background = "";
        lastHighlighted = null;
      }
      return;
    }
    const el = document.getElementById(`stagedev-${String(idx)}`);
    if (!el || el === lastHighlighted) return;
    if (lastHighlighted) lastHighlighted.style.background = "";
    el.style.background = "#234";
    lastHighlighted = el;
  };
  update();
  window.setInterval(update, 1000);
}

/**
 * Load `indexes/videoSegmentData.csv` and surface a count + the segment
 * (if any) covering the live historic-launch GET.
 */
async function mountVideoSegments(config: MissionConfig): Promise<void> {
  const statusEl = document.getElementById("segments-status");
  const currentEl = document.getElementById("segments-current");
  if (!statusEl || !currentEl) return;

  let data: VideoSegmentsData;
  try {
    data = await loadVideoSegmentData(`/${config.id}/`);
  } catch (err) {
    statusEl.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  statusEl.textContent = `${String(data.segments.length)} segments`;

  const historicEpoch = Date.parse(config.launchDate);
  const update = (): void => {
    if (!Number.isFinite(historicEpoch)) {
      currentEl.textContent = "(launch date unparseable)";
      return;
    }
    const seconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    const idx = findVideoSegmentIndex(data, seconds);
    if (idx < 0) {
      currentEl.textContent = "(none)";
      return;
    }
    const seg = data.segments[idx];
    if (!seg) {
      currentEl.textContent = "(none)";
      return;
    }
    currentEl.textContent = `#${String(idx)}  ${seg.startTimeStr} \u2192 ${seg.endTimeStr}`;
  };
  update();
  window.setInterval(update, 1000);
}

/**
 * Load `indexes/commentaryData.csv` and surface count + current entry at GET.
 */
async function mountCommentaryData(config: MissionConfig): Promise<void> {
  const statusEl = document.getElementById("commentary-status");
  const currentEl = document.getElementById("commentary-current");
  if (!statusEl || !currentEl) return;

  let data: CommentaryData;
  try {
    data = await loadCommentaryData(`/${config.id}/`);
  } catch (err) {
    statusEl.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  statusEl.textContent = `${String(data.entries.length)} entries`;

  const historicEpoch = Date.parse(config.launchDate);
  const update = (): void => {
    if (!Number.isFinite(historicEpoch)) return;
    const seconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    const idx = findClosestCommentaryIndex(data, seconds);
    if (idx < 0) {
      currentEl.textContent = "(none)";
      return;
    }
    const entry = data.entries[idx];
    if (!entry) {
      currentEl.textContent = "(none)";
      return;
    }
    currentEl.textContent = `${entry.timeStr}  ${entry.text.slice(0, 80)}…`;
  };
  update();
  window.setInterval(update, 1000);
}

/**
 * Load `indexes/utteranceData.csv` and surface count + current utterance at GET.
 */
async function mountUtteranceData(config: MissionConfig): Promise<void> {
  const statusEl = document.getElementById("utterance-status");
  const currentEl = document.getElementById("utterance-current");
  if (!statusEl || !currentEl) return;

  let data: UtteranceData;
  try {
    data = await loadUtteranceData(`/${config.id}/`);
  } catch (err) {
    statusEl.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  statusEl.textContent = `${String(data.entries.length)} entries`;

  const historicEpoch = Date.parse(config.launchDate);
  const update = (): void => {
    if (!Number.isFinite(historicEpoch)) return;
    const seconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    const idx = findClosestUtteranceIndex(data, seconds);
    if (idx < 0) {
      currentEl.textContent = "(none)";
      return;
    }
    const entry = data.entries[idx];
    if (!entry) {
      currentEl.textContent = "(none)";
      return;
    }
    currentEl.textContent = `${entry.timeStr}  [${entry.speaker}]  ${entry.words.slice(0, 80)}…`;
  };
  update();
  window.setInterval(update, 1000);
}

/**
 * Load `indexes/photoData.csv` and surface count + most recent photo at GET.
 */
async function mountPhotoData(config: MissionConfig): Promise<void> {
  const statusEl = document.getElementById("photo-status");
  const currentEl = document.getElementById("photo-current");
  if (!statusEl || !currentEl) return;

  let data: PhotoData;
  try {
    data = await loadPhotoData(`/${config.id}/`);
  } catch (err) {
    statusEl.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  statusEl.textContent = `${String(data.entries.length)} entries`;

  const historicEpoch = Date.parse(config.launchDate);
  const update = (): void => {
    if (!Number.isFinite(historicEpoch)) return;
    const seconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    const idx = findClosestPhotoIndex(data, seconds);
    if (idx < 0) {
      currentEl.textContent = "(none)";
      return;
    }
    const entry = data.entries[idx];
    if (!entry) {
      currentEl.textContent = "(none)";
      return;
    }
    currentEl.textContent = `${entry.timeStr}  ${entry.photoId}  ${entry.description.slice(0, 60)}`;
  };
  update();
  window.setInterval(update, 1000);
}

/**
 * Load `indexes/videoURLData.csv` and surface count + current video segment at GET.
 */
async function mountVideoUrlData(config: MissionConfig): Promise<void> {
  const statusEl = document.getElementById("videourl-status");
  const currentEl = document.getElementById("videourl-current");
  if (!statusEl || !currentEl) return;

  let data: VideoUrlData;
  try {
    data = await loadVideoUrlData(`/${config.id}/`);
  } catch (err) {
    statusEl.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  statusEl.textContent = `${String(data.entries.length)} entries`;

  const historicEpoch = Date.parse(config.launchDate);
  const update = (): void => {
    if (!Number.isFinite(historicEpoch)) return;
    const seconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    const idx = findVideoUrlIndex(data, seconds);
    if (idx < 0) {
      currentEl.textContent = "(none)";
      return;
    }
    const entry = data.entries[idx];
    if (!entry) {
      currentEl.textContent = "(none)";
      return;
    }
    currentEl.textContent = `#${String(idx)}  ${entry.startTimeStr} \u2192 ${entry.endTimeStr}  id=${entry.videoId}`;
  };
  update();
  window.setInterval(update, 1000);
}

/**
 * Load `indexes/crewStatusData.csv` and surface count + current crew status at GET.
 */
async function mountCrewStatusData(config: MissionConfig): Promise<void> {
  const statusEl = document.getElementById("crewstatus-status");
  const currentEl = document.getElementById("crewstatus-current");
  if (!statusEl || !currentEl) return;

  let data: CrewStatusData;
  try {
    data = await loadCrewStatusData(`/${config.id}/`, {
      missionDurationSeconds: config.missionDurationSeconds,
    });
  } catch (err) {
    statusEl.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  statusEl.textContent = `${String(data.entries.length)} entries`;

  const historicEpoch = Date.parse(config.launchDate);
  const update = (): void => {
    if (!Number.isFinite(historicEpoch)) return;
    const seconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    const idx = findCrewStatusIndex(data, seconds);
    if (idx < 0) {
      currentEl.textContent = "(none)";
      return;
    }
    const entry = data.entries[idx];
    if (!entry) {
      currentEl.textContent = "(none)";
      return;
    }
    currentEl.textContent = `${entry.startTimeStr}  ${entry.statusHtml.replace(/<[^>]*>/g, "").slice(0, 80)}`;
  };
  update();
  window.setInterval(update, 1000);
}

/**
 * Load `indexes/telemetryData.csv` and surface count + current telemetry at GET.
 */
async function mountTelemetryData(config: MissionConfig): Promise<void> {
  const statusEl = document.getElementById("telemetry-status");
  const currentEl = document.getElementById("telemetry-current");
  if (!statusEl || !currentEl) return;

  let data: TelemetryData;
  try {
    data = await loadTelemetryData(`/${config.id}/`, {
      missionDurationSeconds: config.missionDurationSeconds,
    });
  } catch (err) {
    statusEl.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  statusEl.textContent = `${String(data.entries.length)} entries`;

  const historicEpoch = Date.parse(config.launchDate);
  const update = (): void => {
    if (!Number.isFinite(historicEpoch)) return;
    const seconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    const idx = findTelemetryIndex(data, seconds);
    if (idx < 0) {
      currentEl.textContent = "(none)";
      return;
    }
    const entry = data.entries[idx];
    if (!entry) {
      currentEl.textContent = "(none)";
      return;
    }
    currentEl.textContent =
      `v\u2295${String(entry.velocityEarth)} mph  d\u2295${String(entry.distanceEarth)} nm  ` +
      `d\u2299${String(entry.distanceMoon)} nm  v\u2299${String(entry.velocityMoon)} mph`;
  };
  update();
  window.setInterval(update, 1000);
}

/**
 * Load `indexes/orbitData.csv` and surface count + current orbit at GET.
 * This CSV only exists for missions with lunar orbit (A17); A11/A13 will fail gracefully.
 */
async function mountOrbitData(config: MissionConfig): Promise<void> {
  const statusEl = document.getElementById("orbit-status");
  const currentEl = document.getElementById("orbit-current");
  if (!statusEl || !currentEl) return;

  let data: OrbitData;
  try {
    data = await loadOrbitData(`/${config.id}/`);
  } catch (err) {
    statusEl.textContent = `n/a (${(err as Error).message})`;
    return;
  }
  if (data.entries.length === 0) {
    statusEl.textContent = "0 entries (not applicable for this mission)";
    return;
  }
  statusEl.textContent = `${String(data.entries.length)} entries`;

  const historicEpoch = Date.parse(config.launchDate);
  const update = (): void => {
    if (!Number.isFinite(historicEpoch)) return;
    const seconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    const idx = findOrbitIndex(data, seconds);
    if (idx < 0) {
      currentEl.textContent = "(none)";
      return;
    }
    const entry = data.entries[idx];
    if (!entry) {
      currentEl.textContent = "(none)";
      return;
    }
    currentEl.textContent = `orbit ${entry.orbitNumber}  ${entry.startTimeStr} \u2192 ${entry.endTimeStr}`;
  };
  update();
  window.setInterval(update, 1000);
}

// ── typed panel mounts ────────────────────────────────────────────────────────

/**
 * Helper used by every panel mount: produces a 1-Hz `tick()` function that
 * computes current historic-launch seconds and feeds it to `cb`.
 */
function startTicker(config: MissionConfig, cb: (seconds: number) => void): void {
  const historicEpoch = Date.parse(config.launchDate);
  const tick = (): void => {
    if (!Number.isFinite(historicEpoch)) return;
    const seconds = Math.trunc((Date.now() - historicEpoch) / 1000);
    cb(seconds);
  };
  tick();
  window.setInterval(tick, 1000);
}

async function mountCommentaryPanel(config: MissionConfig): Promise<void> {
  const host = document.getElementById("commentarypanel-host");
  const seekEl = document.getElementById("commentarypanel-seek");
  if (!(host instanceof HTMLElement)) return;
  let data: CommentaryData;
  try {
    data = await loadCommentaryData(`/${config.id}/`);
  } catch (err) {
    host.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  const panel = createCommentaryPanel({
    container: host,
    data,
    onSeek: (timeId) => {
      if (seekEl) seekEl.textContent = timeId;
    },
  });
  let last: string | null = null;
  startTicker(config, (seconds) => {
    const idx = findClosestCommentaryIndex(data, seconds);
    const entry = idx >= 0 ? data.entries[idx] : undefined;
    const timeId = entry?.timeId ?? null;
    if (timeId === last) return;
    panel.setActiveTimeId(timeId);
    last = timeId;
  });
}

async function mountTranscriptPanel(config: MissionConfig): Promise<void> {
  const host = document.getElementById("transcriptpanel-host");
  const seekEl = document.getElementById("transcriptpanel-seek");
  if (!(host instanceof HTMLElement)) return;
  let data: UtteranceData;
  try {
    data = await loadUtteranceData(`/${config.id}/`);
  } catch (err) {
    host.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  const panel = createTranscriptPanel({
    container: host,
    data,
    onSeek: (timeId) => {
      if (seekEl) seekEl.textContent = timeId;
    },
  });
  let last: string | null = null;
  startTicker(config, (seconds) => {
    const idx = findClosestUtteranceIndex(data, seconds);
    const entry = idx >= 0 ? data.entries[idx] : undefined;
    const timeId = entry?.timeId ?? null;
    if (timeId === last) return;
    panel.setActiveTimeId(timeId);
    last = timeId;
  });
}

/**
 * Build the per-mission photo URL resolver. Mirrors the legacy
 * `populatePhotoGallery` / `loadPhotoHtml` switching logic across A11,
 * A13, and A17.
 */
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

    // A17: media CDN with flight/supporting routing.
    // Legacy templates (see legacy-src/17/index.html photoGalleryTemplate /
    // photoTemplate + populatePhotoGallery / loadPhotoHtml in index.js):
    //   thumb: {cdn}/images/{flight|supporting}/100/{filename}.jpg
    //   full:  {cdn}/images/flight/4175/{filename}.jpg
    //          {cdn}/images/supporting/2100/{filename}.jpg
    // The discriminant is the mag code (CSV field 2, our `entry.filename`).
    // When present → flight, image base name is `AS17-{photoId}`.
    // When empty → supporting, image base name is the bare `photoId`.
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

async function mountPhotoPanel(config: MissionConfig): Promise<void> {
  const host = document.getElementById("photopanel-host");
  const seekEl = document.getElementById("photopanel-seek");
  if (!(host instanceof HTMLElement)) return;
  let data: PhotoData;
  try {
    data = await loadPhotoData(`/${config.id}/`);
  } catch (err) {
    host.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  const panel = createPhotoPanel({
    container: host,
    data,
    resolveUrls: photoResolverFor(config),
    onSeek: (timeId) => {
      if (seekEl) seekEl.textContent = timeId;
    },
  });
  let last: string | null = null;
  startTicker(config, (seconds) => {
    const idx = findClosestPhotoIndex(data, seconds);
    const entry = idx >= 0 ? data.entries[idx] : undefined;
    const timeId = entry?.timeId ?? null;
    if (timeId === last) return;
    panel.setActiveTimeId(timeId);
    last = timeId;
  });
}

/**
 * Per-mission frame-of-reference ranges. A13 has a hardcoded Moon window
 * around lunar approach (075:06:08 → 085:59:00 in the legacy code); A11
 * and A17 default to all-Earth here pending the real per-mission ranges.
 */
function frameRangesFor(config: MissionConfig): FrameOfReferenceRange[] {
  if (config.id === "13") {
    return [{ startSeconds: 270368, endSeconds: 309540, frame: "Moon" }];
  }
  return [];
}

async function mountTelemetryPanel(config: MissionConfig): Promise<void> {
  const host = document.getElementById("telemetrypanel-host");
  if (!(host instanceof HTMLElement)) return;
  let data: TelemetryData;
  try {
    data = await loadTelemetryData(`/${config.id}/`, {
      missionDurationSeconds: config.missionDurationSeconds,
    });
  } catch (err) {
    host.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  const panel = createTelemetryPanel({
    container: host,
    data,
    frameRanges: frameRangesFor(config),
  });
  startTicker(config, (seconds) => {
    panel.update(seconds);
  });
}

async function mountCrewStatusPanel(config: MissionConfig): Promise<void> {
  const host = document.getElementById("crewstatuspanel-host");
  if (!(host instanceof HTMLElement)) return;
  let data: CrewStatusData;
  try {
    data = await loadCrewStatusData(`/${config.id}/`, {
      missionDurationSeconds: config.missionDurationSeconds,
    });
  } catch (err) {
    host.textContent = `failed: ${(err as Error).message}`;
    return;
  }
  const panel = createCrewStatusPanel({ container: host, data });
  startTicker(config, (seconds) => {
    panel.update(seconds);
  });
}

async function mountDashboardPanel(config: MissionConfig): Promise<void> {
  const host = document.getElementById("dashboardpanel-host");
  if (!(host instanceof HTMLElement)) return;
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
    host.textContent = "failed to load dashboard data";
    return;
  }
  const panel = createDashboardPanel({
    container: host,
    stages: stagesR.value,
    crewStatus: crewR.value,
    telemetry: telemR.value,
    telemetryFrameRanges: frameRangesFor(config),
    totalMissionDays: totalDays,
  });
  startTicker(config, (seconds) => {
    panel.update(seconds);
  });
}

async function mountSearchPanel(config: MissionConfig): Promise<void> {
  const host = document.getElementById("searchpanel-host");
  const pickEl = document.getElementById("searchpanel-pick");
  if (!(host instanceof HTMLElement)) return;
  const [uttR, comR, photoR] = await Promise.allSettled([
    loadUtteranceData(`/${config.id}/`),
    loadCommentaryData(`/${config.id}/`),
    loadPhotoData(`/${config.id}/`),
  ]);
  createSearchPanel({
    container: host,
    sources: {
      ...(uttR.status === "fulfilled" && { utterances: uttR.value }),
      ...(comR.status === "fulfilled" && { commentary: comR.value }),
      ...(photoR.status === "fulfilled" && { photos: photoR.value }),
    },
    onResult: (item) => {
      if (pickEl) pickEl.textContent = `${item.kind} @${item.timeStr}`;
    },
  });
}

async function mountMocrvizPanel(config: MissionConfig): Promise<void> {
  if (config.features?.mocrviz !== true) return;
  if (config.id !== "11" && config.id !== "13") return;
  const card = document.getElementById("mocrviz-card");
  const host = document.getElementById("mocrvizpanel-host");
  if (!(card instanceof HTMLElement) || !(host instanceof HTMLElement)) return;
  card.hidden = false;
  // Lazy-load the MOCRviz module so its catalog only ships when needed.
  const mod = await import("../panels/mocrviz/index.js");
  // The legacy MOCR audio CDN folder sits next to the mission media root.
  // For dev, the legacy `public/{N}/MOCRviz/*` is served from the same
  // origin so we can use a mission-relative path for the MP3 root too.
  const audioRoot = `/${config.id}/MOCRviz/MOCR_audio`;
  let panel: MocrvizPanel | null;
  try {
    panel = await mod.createMocrvizPanel({
      container: host,
      mission: config.id,
      mediaRoot: `/${config.id}/`,
      audioRoot,
    });
  } catch (err) {
    host.textContent = `failed to load MOCRviz: ${String(err)}`;
    return;
  }
  if (panel === null) return;
  startTicker(config, (seconds) => {
    panel.setClock(seconds, !host.querySelector<HTMLAudioElement>("audio")?.paused);
  });
}

ready(() => {
  const id = readMissionId();
  if (!id) {
    console.error("[dev/missionHarness] <body data-mission> missing or invalid");
    return;
  }
  const config = CONFIGS[id];
  if (!config) return;
  window.MISSION = config;
  const readout = buildShell(config);
  startClock(config, readout);
  void mountNavigator(config);
  void mountTocData(config);
  void mountTocPanel(config);
  void mountMissionStages(config);
  void mountVideoSegments(config);
  void mountCommentaryData(config);
  void mountUtteranceData(config);
  void mountPhotoData(config);
  void mountVideoUrlData(config);
  void mountCrewStatusData(config);
  void mountTelemetryData(config);
  void mountOrbitData(config);
  void mountCommentaryPanel(config);
  void mountTranscriptPanel(config);
  void mountPhotoPanel(config);
  void mountTelemetryPanel(config);
  void mountCrewStatusPanel(config);
  void mountDashboardPanel(config);
  void mountSearchPanel(config);
  void mountMocrvizPanel(config);
  console.warn(`[dev/missionHarness] ${config.name} (${id}) ready`);
});
