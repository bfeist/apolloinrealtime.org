/**
 * Typed production shell for /{11,13,17}/.
 *
 * Renders the per-mission HTML skeleton that the typed engines and
 * panels mount into. Replaces the diagnostic-readout view that lived
 * inline in `missionApp.ts` (still available via the `?debug=1` flag).
 *
 * Design goals (see docs-plan/05-migration-plan.md Phase 6 and
 * docs-plan/PHASE6-shell-analysis.md):
 *
 * - Single shared template, driven by `MissionConfig`. Per-mission deltas
 *   live in the config and in CSS overrides keyed off
 *   `<body data-mission="{N}">`.
 * - Stable mount-point IDs that the typed engines/panels target:
 *     #navCanvas        navigator (Paper.js)
 *     #player           YouTube iframe player
 *     #missionElapsedTime + #GETBtn   GET input + jump button
 *     #historicalDate / #historicalTime  modern + historic clock readouts
 *     #transcriptTab / #tocTab / #commentaryTab   tab buttons
 *     #transcriptWrapper / #tocWrapper / #commentaryWrapper   tab panels
 *     #thirtytrack-container   audio channel grid
 *     #photoGallery / #photodiv   photo panel slots
 *     #dashboardContent         dashboard panel slot
 *     #searchResultsTable       search panel slot
 *     #mocrviz-host             MOCRviz audio panel slot
 *     #debug-host               debug readout host (?debug=1 only)
 *
 * - Does NOT inject scripts; the entry (`missionApp.ts`) does that.
 * - Does NOT mutate the DOM after the first render; panels do that.
 */

import { secondsToTimeStr } from "../shell/clock.js";

export interface ShellElements {
  root: HTMLElement;
  modernDate: HTMLElement;
  modernTime: HTMLElement;
  historicDate: HTMLElement;
  historicTime: HTMLElement;
  getInput: HTMLInputElement;
  getButton: HTMLElement;
  navCanvas: HTMLCanvasElement;
  player: HTMLElement;
  transcriptTab: HTMLElement;
  tocTab: HTMLElement;
  commentaryTab: HTMLElement;
  transcriptWrapper: HTMLElement;
  tocWrapper: HTMLElement;
  commentaryWrapper: HTMLElement;
  channelGrid: HTMLElement;
  photoGallery: HTMLElement;
  photoDiv: HTMLElement;
  dashboardContent: HTMLElement;
  searchResults: HTMLElement;
  mocrvizHost: HTMLElement;
  debugHost: HTMLElement;
  /** True when `?debug=1` was on the URL (debug readout is visible). */
  debugVisible: boolean;
}

/**
 * Build the production shell DOM under `#mission-root` and return typed
 * handles to every mount point.
 */
export function renderShell(config: MissionConfig): ShellElements {
  const root = document.getElementById("mission-root");
  if (!root) throw new Error("[shell] #mission-root missing");
  document.body.dataset.mission = config.id;

  const debug = new URLSearchParams(window.location.search).get("debug") === "1";

  const html = buildHtml(config, debug);
  root.innerHTML = html;

  // Resolve every mount point. Throw early if anything is wrong — the
  // shell template is the single source of truth for these IDs.
  const get = (id: string): HTMLElement => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`[shell] #${id} missing after render`);
    return el;
  };
  const getInput = (id: string): HTMLInputElement => {
    const el = get(id);
    if (!(el instanceof HTMLInputElement)) throw new Error(`[shell] #${id} not an <input>`);
    return el;
  };
  const getCanvas = (id: string): HTMLCanvasElement => {
    const el = get(id);
    if (!(el instanceof HTMLCanvasElement)) throw new Error(`[shell] #${id} not a <canvas>`);
    return el;
  };

  return {
    root,
    modernDate: get("modernDate"),
    modernTime: get("modernTime"),
    historicDate: get("historicalDate"),
    historicTime: get("historicalTime"),
    getInput: getInput("missionElapsedTime"),
    getButton: get("GETBtn"),
    navCanvas: getCanvas("navCanvas"),
    player: get("player"),
    transcriptTab: get("transcriptTab"),
    tocTab: get("tocTab"),
    commentaryTab: get("commentaryTab"),
    transcriptWrapper: get("transcriptWrapper"),
    tocWrapper: get("tocWrapper"),
    commentaryWrapper: get("commentaryWrapper"),
    channelGrid: get("thirtytrack-container"),
    photoGallery: get("photoGallery"),
    photoDiv: get("photodiv"),
    dashboardContent: get("dashboardContent"),
    searchResults: get("searchResultsTable"),
    mocrvizHost: get("mocrviz-host"),
    debugHost: get("debug-host"),
    debugVisible: debug,
  };
}

/**
 * Switch between the transcript / TOC / commentary tabs. Sets
 * `data-active-tab` on the tab strip so CSS handles visibility — no
 * JS-driven inline styles.
 */
export function setActiveTab(
  shell: Pick<
    ShellElements,
    | "transcriptTab"
    | "tocTab"
    | "commentaryTab"
    | "transcriptWrapper"
    | "tocWrapper"
    | "commentaryWrapper"
  >,
  tab: "transcript" | "toc" | "commentary",
): void {
  const buttons: Record<typeof tab, HTMLElement> = {
    transcript: shell.transcriptTab,
    toc: shell.tocTab,
    commentary: shell.commentaryTab,
  };
  const wrappers: Record<typeof tab, HTMLElement> = {
    transcript: shell.transcriptWrapper,
    toc: shell.tocWrapper,
    commentary: shell.commentaryWrapper,
  };
  for (const key of ["transcript", "toc", "commentary"] as const) {
    const active = key === tab;
    buttons[key].classList.toggle("is-active", active);
    buttons[key].setAttribute("aria-selected", String(active));
    wrappers[key].hidden = !active;
  }
}

// ── private ────────────────────────────────────────────────────────────────

function buildHtml(config: MissionConfig, debug: boolean): string {
  const missionName = escapeHtml(config.name);
  const startTimeStr = secondsToTimeStr(0);

  // Default deep-link GET = legacy `cDefaultStartTimeId`, converted to
  // the input's HHH:MM:SS display.
  const defaultGet = formatDefaultGet(config.defaultStartTimeId) ?? startTimeStr;

  return `
<div class="airt-app" role="application" aria-label="${missionName}">
  <header class="airt-header">
    <a class="airt-header__logo"
       href="/"
       aria-label="Apollo in Real Time home"
       style="background-image: url('/${config.id}/img/Apollo_${config.id}-insignia100.png')"></a>

    <div class="airt-header__info">
      <p class="airt-header__pretitle">${escapeHtml(preTitleFor(config))}</p>
      <h1 class="airt-header__title">${missionName}</h1>
      <p class="airt-header__subtitle">Real-Time Mission Experience</p>
      <div class="airt-clock">
        <div class="airt-clock__row">
          <span id="historicalDate" class="airt-clock__date"></span>
          <span id="historicalTime" class="airt-clock__time"></span>
        </div>
        <div class="airt-clock__row airt-clock__row--modern" title="If the mission had launched this year">
          <span id="modernDate" class="airt-clock__date"></span>
          <span id="modernTime" class="airt-clock__time"></span>
        </div>
      </div>
      <div class="airt-get">
        <label class="airt-get__label" for="missionElapsedTime">GET</label>
        <input
          id="missionElapsedTime"
          class="airt-get__input"
          type="text"
          size="9"
          value="${escapeHtml(defaultGet)}"
          aria-label="Ground Elapsed Time" />
        <button id="GETBtn" class="airt-btn airt-btn--accent" type="button">GO</button>
      </div>
    </div>

    <div class="airt-header__navigator">
      <canvas id="navCanvas" width="1200" height="220"
              aria-label="Mission navigator timeline"></canvas>
    </div>
  </header>

  <main class="airt-main">
    <section class="airt-video" aria-label="Mission video">
      <div class="airt-video__player">
        <div id="player" class="airt-video__iframe"></div>
        <div id="dashboardContent" class="airt-overlay airt-overlay--dashboard" hidden></div>
        <div class="airt-overlay airt-overlay--search" data-overlay="search" hidden>
          <div id="searchResultsTable" class="airt-search__results"></div>
        </div>
      </div>
      <div class="airt-video__tabs" role="tablist" aria-label="Mission content">
        <button id="transcriptTab" class="airt-tab is-active"
                type="button" role="tab" aria-selected="true">Transcript</button>
        <button id="tocTab" class="airt-tab"
                type="button" role="tab" aria-selected="false">Index</button>
        <button id="commentaryTab" class="airt-tab"
                type="button" role="tab" aria-selected="false">Commentary</button>
      </div>
      <div class="airt-video__output">
        <div id="transcriptWrapper" class="airt-panel airt-panel--transcript"
             role="tabpanel" aria-labelledby="transcriptTab"></div>
        <div id="tocWrapper" class="airt-panel airt-panel--toc"
             role="tabpanel" aria-labelledby="tocTab" hidden></div>
        <div id="commentaryWrapper" class="airt-panel airt-panel--commentary"
             role="tabpanel" aria-labelledby="commentaryTab" hidden></div>
      </div>
    </section>

    <aside class="airt-side">
      <section class="airt-channels" aria-label="Mission Control channels">
        <h2 class="airt-channels__title">Mission Control Channels</h2>
        <div id="thirtytrack-container" class="airt-channels__grid"></div>
        <div id="mocrviz-host" class="airt-channels__viz" hidden></div>
      </section>

      <section class="airt-photo" aria-label="Photo gallery">
        <div id="photodiv" class="airt-photo__main"></div>
        <div id="photoGallery" class="airt-photo__gallery"></div>
      </section>
    </aside>
  </main>

  <div id="debug-host" class="airt-debug" ${debug ? "" : "hidden"}></div>
</div>`.trim();
}

/**
 * Pre-title text per mission. Mirrors the legacy `.pre-title` strings
 * from each `index.html`. Falls back to a generic line if unknown.
 */
function preTitleFor(config: MissionConfig): string {
  switch (config.id) {
    case "11":
      return "The First Landing on the Moon";
    case "13":
      return "The Third Lunar Landing Attempt";
    case "17":
      return "The Last Landing on the Moon";
    default:
      return "Apollo in Real Time";
  }
}

/**
 * Convert the legacy `defaultStartTimeId` ("-000102" → "-00:01:02",
 * "0010000" → "001:00:00") into the HHH:MM:SS string the GET input
 * displays. Returns `null` if the value can't be parsed.
 */
function formatDefaultGet(timeId: string): string | null {
  if (typeof timeId !== "string" || timeId.length === 0) return null;
  const negative = timeId.startsWith("-");
  const digits = negative ? timeId.slice(1) : timeId;
  if (!/^\d+$/.test(digits) || digits.length < 5) return null;
  // last 2 chars = seconds, prev 2 = minutes, rest = hours.
  const ss = digits.slice(-2);
  const mm = digits.slice(-4, -2);
  const hh = digits.slice(0, -4).padStart(3, "0");
  return `${negative ? "-" : ""}${hh}:${mm}:${ss}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
