/**
 * Typed production shell for /{11,13,17}/.
 *
 * Three-column production layout (Phase 6.5 — matches measured
 * apolloinrealtime.org/{N}/ at 1667×1005):
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ HEADER  (compact info ~30%  |  navigator canvas ~70%)            │
 *   ├──────────────────┬────────┬────────────────────────────────────┤
 *   │ LEFT  (~40%)     │ CHAN   │ RIGHT  (~56%)                       │
 *   │  • dashboard     │ narrow │  • photo viewer (default)           │
 *   │    overlay       │ vert.  │  • or video iframe (in seg)          │
 *   │  • tabs          │ ~70px  │  • far-right thumbnail rail          │
 *   │  • transcript /  │ strip  │                                      │
 *   │    TOC / commen. │        │                                      │
 *   └──────────────────┴────────┴────────────────────────────────────┘
 *
 * Stable mount-point IDs (typed engines/panels target these):
 *   #navCanvas              navigator (Paper.js)
 *   #player                 YouTube iframe player slot
 *   #missionElapsedTime     GET input
 *   #GETBtn                 GET "GO" button
 *   #historicalDate / #historicalTime  / #modernDate / #modernTime
 *                           clock readouts
 *   #transcriptTab / #tocTab / #commentaryTab
 *                           text-tab buttons
 *   #transcriptWrapper / #tocWrapper / #commentaryWrapper
 *                           text-tab content hosts
 *   #thirtytrack-container  audio channel strip
 *   #photoGallery           thumbnail rail
 *   #photodiv               main photo viewer
 *   #dashboardContent       mission-status dashboard slot
 *   #searchResultsTable     search overlay slot
 *   #mocrviz-host           MOCRviz audio controller slot
 *   #debug-host             ?debug=1 readout host
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
  /** Default-visible dashboard ("Mission Status") content slot. */
  dashboardContent: HTMLElement;
  /** Dashboard overlay wrapper — layered on top of the left-column video player.
      Auto-hides when current GET is inside a video segment (legacy
      manageOverlaysAutodisplay), unless the user manually toggled it. */
  dashboardOverlay: HTMLElement;
  /** Toggle button on the action row to show/hide dashboard overlay. */
  dashboardBtn: HTMLElement;
  /** Search overlay container (hidden by default; toggled by #searchBtn). */
  searchOverlay: HTMLElement;
  searchResults: HTMLElement;
  searchBtn: HTMLElement;
  searchClose: HTMLElement;
  /** YouTube player wrapper — lives in the LEFT column, under the
      dashboard overlay. (Production layout: dashboard sits on top of
      the video; clicking the dashboard close button reveals the video.) */
  playerWrapper: HTMLElement;
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
  const queryOne = (sel: string): HTMLElement => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) throw new Error(`[shell] ${sel} missing after render`);
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
    playerWrapper: get("player-iframe-wrapper"),
    dashboardOverlay: queryOne(".airt-dashboard-overlay"),
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
    dashboardBtn: get("dashboardBtn"),
    searchOverlay: get("searchOverlay"),
    searchResults: get("searchPanelHost"),
    searchBtn: get("searchBtn"),
    searchClose: get("searchClose"),
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

  // Per-mission right-column tab labels (legacy `app-tab` strip).
  const photoTabLabel = config.id === "17" ? "Photography" : "Photography";
  const showMocrTab = config.id === "11" || config.id === "13";
  const showSpacecraftTab = config.id === "13";

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
        <label class="airt-get__label" for="missionElapsedTime">Ground Elapsed Time (GET):</label>
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
      <canvas id="navCanvas" width="1200" height="160"
              aria-label="Mission navigator timeline"></canvas>
    </div>
  </header>

  <main class="airt-main">
    <!-- LEFT: video player (with dashboard overlay on top) + tabs + transcript host -->
    <section class="airt-left" aria-label="Mission video and transcript">
      <div class="airt-monitor airt-monitor--top">
        <!-- video player (always present, plays underneath the overlay) -->
        <div id="player-iframe-wrapper" class="airt-player-wrapper">
          <div id="player" class="airt-player"></div>
        </div>
        <!-- dashboard overlay sits on top of the player; auto-hides when
             current GET is inside a video segment (legacy
             manageOverlaysAutodisplay rule) -->
        <div class="airt-dashboard-overlay" data-overlay="dashboard">
          <div class="airt-overlay__head">
            <span class="airt-overlay__title">Mission Status</span>
            <button class="airt-overlay__close" type="button" data-close="dashboard" aria-label="Close">✕</button>
          </div>
          <div id="dashboardContent" class="airt-dashboard"></div>
        </div>
        <!-- search overlay (left column, legacy) -->
        <div id="searchOverlay" class="airt-search-overlay" hidden>
          <div class="airt-overlay__head">
            <span class="airt-overlay__title">Search</span>
            <button id="searchClose" class="airt-overlay__close" type="button" aria-label="Close">✕</button>
          </div>
          <div id="searchPanelHost" class="airt-search-overlay__results"></div>
        </div>
      </div>

      <div class="airt-tabs-wrapper">
        <div class="airt-button-row">
          <button id="transcriptTab" class="airt-tab is-active" type="button" role="tab" aria-selected="true"
                  title="Every word spoken on the mission">Transcript</button>
          <button id="tocTab" class="airt-tab" type="button" role="tab" aria-selected="false"
                  title="Points of interest throughout the mission">Mission Milestones</button>
          <button id="commentaryTab" class="airt-tab" type="button" role="tab" aria-selected="false"
                  title="Description of events and post-mission interviews with the crew">Commentary</button>
        </div>
        <div class="airt-button-row airt-button-row--small">
          <button id="searchBtn" class="airt-action-btn" type="button" title="Search mission" aria-label="Search">🔍</button>
          <button id="dashboardBtn" class="airt-action-btn" type="button" title="Show/hide Mission Status" aria-label="Dashboard">🎚</button>
          <button id="playPauseBtn" class="airt-action-btn" type="button" title="Play/Pause" aria-label="Play/Pause">⏸</button>
          <button id="soundBtn" class="airt-action-btn" type="button" title="Sound on/off" aria-label="Sound">🔊</button>
          <button id="fullscreenBtn" class="airt-action-btn" type="button" title="Fullscreen" aria-label="Fullscreen">⛶</button>
        </div>
      </div>

      <div class="airt-monitor airt-monitor--text">
        <div id="transcriptWrapper" class="airt-text-panel"
             role="tabpanel" aria-labelledby="transcriptTab"></div>
        <div id="tocWrapper" class="airt-text-panel"
             role="tabpanel" aria-labelledby="tocTab" hidden></div>
        <div id="commentaryWrapper" class="airt-text-panel"
             role="tabpanel" aria-labelledby="commentaryTab" hidden></div>
      </div>
    </section>
    <!-- /LEFT -->

    <!-- MIDDLE: narrow vertical channel strip -->
    <section class="airt-channels" aria-label="Mission Control channels">
      <div class="airt-channels__title">Mission Control Channels</div>
      <div id="thirtytrack-container" class="airt-channels__list"></div>
    </section>

    <!-- RIGHT: photo viewer + far-right vertical thumbnail rail -->
    <section class="airt-right" aria-label="Photography">
      <div class="airt-right__tabs">
        <button id="photoTab" class="airt-app-tab is-active" type="button">${escapeHtml(photoTabLabel)}</button>
        ${showMocrTab ? `<button id="mocrTab" class="airt-app-tab" type="button">Mission Control Audio</button>` : ""}
        ${showSpacecraftTab ? `<button id="spacecraftTab" class="airt-app-tab" type="button">Spacecraft Details</button>` : ""}
      </div>
      <div class="airt-right__body">
        <!-- big viewer (photodiv) + far-right vertical thumbnail rail (photoGallery) -->
        <div id="photodiv" class="airt-photodiv"></div>
        <div id="photoGallery" class="airt-photo-rail"></div>

        <!-- MOCRviz audio host overlays when MOCR tab is active -->
        <div id="mocrviz-host" class="airt-mocrviz-host" hidden></div>
      </div>
    </section>
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
