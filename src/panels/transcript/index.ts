/**
 * Transcript (utterance) panel — windowed / lazy-loading.
 *
 * Phase 5 Track C + Phase 6.5 — typed, jQuery-free replacement for the
 * legacy `#utteranceTable` + `scrollTranscriptToTimeId` +
 * `repopulateTranscript` / `prependTranscript` / `appendUtterances` /
 * `trimUtterances` chain in `legacy-src/{N}/index.js`.
 *
 * Why windowed: A11 has ~30k utterances and A17 has ~17k. Rendering them
 * all at once produces a >500,000 px scroll-host and locks the main
 * thread for a noticeable beat on first paint. The legacy app uses a
 * sliding window: render ~100 rows around the current time, prepend
 * ~50 when scrolling backward, append ~50 when scrolling forward, and
 * trim anything beyond ~150 rows away from the current row.
 *
 * DOM shape mirrors the legacy `#utteranceTemplate`:
 *   `<tr class="utterance utt_{type} uttid{id}" id="uttid{id}">`
 * so the existing `.utterance`, `.utt_pao`, `.utt_capcom`, `.utt_mocr`,
 * `.utt_crew`, `.spokenwords` CSS continues to apply.
 *
 * Tuning constants mirror the legacy thresholds in
 * `legacy-src/13/index.js` around `scrollTranscriptToTimeId`:
 *   - INITIAL_HALF_WINDOW  = 50   // legacy: utteranceIndex - 50 .. + 50
 *   - PREPEND_CHUNK        = 50
 *   - APPEND_CHUNK         = 50
 *   - TRIM_THRESHOLD       = 150  // legacy: keep window <= 150 rows
 */

import { delegate, on } from "../../dom/index.js";

/** Legacy speaker-type CSS class name. */
export type UtteranceTypeClass = "utt_pao" | "utt_capcom" | "utt_mocr" | "utt_crew";

/** Options for {@link createTranscriptPanel}. */
export interface TranscriptPanelOptions {
  container: HTMLElement;
  data: UtteranceData;
  onSeek: (timeId: string) => void;
  activeBackground?: string;
}

export interface TranscriptPanelHandle {
  /** Snap the window to a new center timeId, highlighting that row. */
  setActiveTimeId: (timeId: string | null) => void;
  /** Number of rows currently rendered (for tests/debug). */
  renderedCount: () => number;
  destroy: () => void;
}

const DEFAULT_ACTIVE_BG = "#234";

// Legacy thresholds — see file header comment.
const INITIAL_HALF_WINDOW = 50;
const PREPEND_CHUNK = 50;
const APPEND_CHUNK = 50;
const TRIM_THRESHOLD = 150;
/** Scroll proximity (px) at which we treat the user as "near top/bottom"
    and load more rows in that direction. Mirrors the legacy "always
    have 50 rows above/below current" rule, applied to manual scroll. */
const NEAR_EDGE_PX = 200;

/** DOM id for the utterance row representing `timeId`. */
export function utteranceItemId(timeId: string): string {
  return `uttid${timeId}`;
}

/**
 * Map a row's speaker code (legacy `utteranceObject[3]`) and speaker
 * label to the legacy CSS class. Pure helper, exported for testing.
 */
export function utteranceTypeClass(speakerCode: string, speaker: string): UtteranceTypeClass {
  if (speakerCode === "P" || speaker === "") return "utt_pao";
  if (speakerCode === "C") return "utt_capcom";
  if (speakerCode === "F") return "utt_mocr";
  return "utt_crew";
}

/** Build a single `<tr>` for the row at `index`. Pure; tested separately. */
export function buildUtteranceRow(data: UtteranceData, index: number): HTMLTableRowElement {
  const entry = data.entries[index];
  if (!entry) throw new Error(`[transcript] no entry at index ${String(index)}`);
  const type = utteranceTypeClass(entry.extra, entry.speaker);
  const id = utteranceItemId(entry.timeId);
  const tr = document.createElement("tr");
  tr.id = id;
  tr.className = `utterance ${type} ${id}`;
  tr.dataset.timeid = entry.timeId;
  tr.dataset.index = String(index);

  const tsTd = document.createElement("td");
  tsTd.className = "timestamp";
  tsTd.textContent = entry.timeStr;
  tr.appendChild(tsTd);

  const whoTd = document.createElement("td");
  whoTd.className = `who ${type}`;
  whoTd.textContent = entry.speaker;
  tr.appendChild(whoTd);

  const wordsTd = document.createElement("td");
  wordsTd.className = `spokenwords ${type}`;
  wordsTd.textContent = entry.words;
  tr.appendChild(wordsTd);

  return tr;
}

export function createTranscriptPanel(options: TranscriptPanelOptions): TranscriptPanelHandle {
  const { container, data, onSeek } = options;
  const activeBg = options.activeBackground ?? DEFAULT_ACTIVE_BG;

  container.textContent = "";
  const wrap = document.createElement("div");
  wrap.className = "transcript_container utteranceDiv";
  wrap.id = "utteranceDiv";
  const table = document.createElement("table");
  table.id = "utteranceTable";
  table.className = "utteranceTable";
  wrap.appendChild(table);
  container.appendChild(wrap);

  // Window state — `start` and `end` are inclusive index bounds.
  // Initialized to "unset" via -1 sentinel so the first setActiveTimeId
  // call seeds the window.
  let start = -1;
  let end = -1;
  let activeEl: HTMLElement | null = null;
  let activeIndex = -1;
  /** Set true while we programmatically scroll, so the scroll handler
      doesn't interpret it as a manual scroll near an edge. */
  let suppressScroll = false;

  const repopulate = (centerIndex: number): void => {
    let s = centerIndex - INITIAL_HALF_WINDOW;
    let e = centerIndex + INITIAL_HALF_WINDOW;
    if (s < 0) s = 0;
    if (e >= data.entries.length) e = data.entries.length - 1;
    table.textContent = "";
    const frag = document.createDocumentFragment();
    for (let i = s; i <= e; i++) frag.appendChild(buildUtteranceRow(data, i));
    table.appendChild(frag);
    start = s;
    end = e;
  };

  const prepend = (count: number): void => {
    const newStart = Math.max(0, start - count);
    if (newStart === start) return;
    const frag = document.createDocumentFragment();
    for (let i = newStart; i < start; i++) frag.appendChild(buildUtteranceRow(data, i));
    // preserve scroll: measure first row offset before+after.
    const prevHeight = wrap.scrollHeight;
    const prevTop = wrap.scrollTop;
    table.insertBefore(frag, table.firstChild);
    start = newStart;
    // re-anchor scrollTop so the user stays visually put.
    suppressScroll = true;
    wrap.scrollTop = prevTop + (wrap.scrollHeight - prevHeight);
    // release on next frame so smooth scroll doesn't trigger edge re-fetch.
    requestAnimationFrame(() => {
      suppressScroll = false;
    });
  };

  const append = (count: number): void => {
    const newEnd = Math.min(data.entries.length - 1, end + count);
    if (newEnd === end) return;
    const frag = document.createDocumentFragment();
    for (let i = end + 1; i <= newEnd; i++) frag.appendChild(buildUtteranceRow(data, i));
    table.appendChild(frag);
    end = newEnd;
  };

  /** Trim rows far from the active row to keep the window bounded. */
  const trim = (): void => {
    if (activeIndex < 0) return;
    const total = end - start + 1;
    const toRemove = total - TRIM_THRESHOLD;
    if (toRemove <= 0) return;
    const distFromStart = activeIndex - start;
    const distFromEnd = end - activeIndex;
    suppressScroll = true;
    if (distFromStart > distFromEnd) {
      // trim from top — preserve visual position of activeEl
      const prevTop = activeEl?.offsetTop ?? wrap.scrollTop;
      for (let i = 0; i < toRemove; i++) {
        const first = table.firstElementChild;
        if (!first) break;
        first.remove();
      }
      start += toRemove;
      const newTop = activeEl?.offsetTop ?? wrap.scrollTop;
      wrap.scrollTop = wrap.scrollTop - (prevTop - newTop);
    } else {
      // trim from bottom — no scroll adjustment needed
      for (let i = 0; i < toRemove; i++) {
        const last = table.lastElementChild;
        if (!last) break;
        last.remove();
      }
      end -= toRemove;
    }
    requestAnimationFrame(() => {
      suppressScroll = false;
    });
  };

  const off = delegate(wrap, "click", "tr.utterance", (_ev, tr) => {
    const timeId = tr.dataset.timeid;
    if (timeId !== undefined && timeId !== "") onSeek(timeId);
  });

  // Manual scroll: extend the window when the user reaches an edge.
  const offScroll = on(wrap, "scroll", () => {
    if (suppressScroll) return;
    const nearTop = wrap.scrollTop < NEAR_EDGE_PX;
    const nearBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < NEAR_EDGE_PX;
    if (nearTop && start > 0) prepend(PREPEND_CHUNK);
    if (nearBottom && end < data.entries.length - 1) append(APPEND_CHUNK);
  });

  const setActiveTimeId = (timeId: string | null): void => {
    if (timeId === null || !data.byTimeId.has(timeId)) {
      if (activeEl !== null) {
        activeEl.style.backgroundColor = "";
        activeEl = null;
        activeIndex = -1;
      }
      return;
    }
    const idx = data.byTimeId.get(timeId);
    if (idx === undefined) return;

    // Seed or jump the window if the row isn't currently in DOM.
    if (start === -1 || idx < start || idx > end) {
      repopulate(idx);
    } else {
      // Row is in DOM; just extend the window if we're near an edge
      // (legacy: "always have 50 lines above/below current").
      if (idx < start + INITIAL_HALF_WINDOW && start > 0) {
        prepend(PREPEND_CHUNK);
      }
      if (idx > end - INITIAL_HALF_WINDOW && end < data.entries.length - 1) {
        append(APPEND_CHUNK);
      }
    }

    const el = wrap.querySelector<HTMLElement>(`#${CSS.escape(utteranceItemId(timeId))}`);
    if (el === null) return;
    if (activeEl !== null && activeEl !== el) activeEl.style.backgroundColor = "";
    el.style.backgroundColor = activeBg;
    suppressScroll = true;
    el.scrollIntoView({ block: "center" });
    requestAnimationFrame(() => {
      suppressScroll = false;
    });
    activeEl = el;
    activeIndex = idx;

    trim();
  };

  const renderedCount = (): number => (start === -1 ? 0 : end - start + 1);

  const destroy = (): void => {
    off();
    offScroll();
    container.textContent = "";
    activeEl = null;
    activeIndex = -1;
    start = -1;
    end = -1;
  };

  return { setActiveTimeId, renderedCount, destroy };
}
