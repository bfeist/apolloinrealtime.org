/**
 * Commentary panel.
 *
 * Phase 5 Track C — typed, jQuery-free replacement for the legacy
 * `#commentaryTable` + `scrollCommentaryToTimeId` / `repopulateCommentary`
 * / `prependCommentary` / `appendCommentary` / `trimCommentary` chain in
 * `legacy-src/{N}/index.js`.
 *
 * The legacy code maintained a sliding 100-item window with manual
 * prepend/append/trim because rendering all ~5k commentary rows through
 * jQuery on a 2014 browser was too slow. With native DOM + a single
 * `<table>` insertion this is no longer needed, so the typed panel just
 * renders all entries and uses native `scrollIntoView` — same behavior,
 * far less code.
 *
 * Mirrors the legacy DOM shape so existing `styles.css` rules
 * (`.commentary`, `.utt_pao`, `.spokenwords`, `.attribution`, etc.)
 * continue to apply: `<tr class="commentary utt_pao comid{id}"
 * id="comid{id}">` with timestamp / who / words cells.
 */

import { delegate } from "../../dom/index.js";

/** Options for {@link createCommentaryPanel}. */
export interface CommentaryPanelOptions {
  /** Container element. Cleared and populated with the panel DOM. */
  container: HTMLElement;
  /** Parsed commentary data (from `src/data/commentaryData.ts`). */
  data: CommentaryData;
  /** Called when the user clicks a commentary row. */
  onSeek: (timeId: string) => void;
  /**
   * Optional attribution-link override. Legacy A13 hard-coded an
   * `<a href="https://history.nasa.gov/afj/ap13fj/index.html" target="AFJ">AFJ</a>`
   * regardless of the per-row `source` field. The typed panel exposes
   * this as an option; default uses `entry.source` if non-empty.
   */
  attributionRenderer?: (entry: CommentaryEntry) => string;
  /** Active-row background (defaults to legacy `cBackground_color_active`). */
  activeBackground?: string;
}

/** Handle returned by {@link createCommentaryPanel}. */
export interface CommentaryPanelHandle {
  /** Highlight + scroll-to the row for `timeId`. `null` clears. */
  setActiveTimeId: (timeId: string | null) => void;
  /** Tear down listeners and empty the container. */
  destroy: () => void;
}

const DEFAULT_ACTIVE_BG = "#3b3b6e";

/** DOM id for the commentary row representing `timeId`. */
export function commentaryItemId(timeId: string): string {
  return `comid${timeId}`;
}

/**
 * Default attribution renderer: emit a plain text `(source)` span when
 * the row has a source, otherwise empty. The legacy code wraps a link;
 * callers can pass `attributionRenderer` to do the same.
 */
export function defaultAttribution(entry: CommentaryEntry): string {
  return entry.source === "" ? "" : `(${entry.source})`;
}

export function createCommentaryPanel(options: CommentaryPanelOptions): CommentaryPanelHandle {
  const { container, data, onSeek } = options;
  const renderAttr = options.attributionRenderer ?? defaultAttribution;
  const activeBg = options.activeBackground ?? DEFAULT_ACTIVE_BG;

  container.textContent = "";

  const wrap = document.createElement("div");
  wrap.className = "commentary_container";
  const table = document.createElement("table");
  table.id = "commentaryTable";

  for (const entry of data.entries) {
    const tr = document.createElement("tr");
    const id = commentaryItemId(entry.timeId);
    tr.id = id;
    tr.className = `commentary utt_pao ${id}`;
    tr.dataset.timeid = entry.timeId;

    const tsTd = document.createElement("td");
    tsTd.className = "timestamp";
    tsTd.textContent = entry.timeStr;
    tr.appendChild(tsTd);

    const whoTd = document.createElement("td");
    const wordsTd = document.createElement("td");
    const comType = entry.speaker === "" ? "com_support" : "com_main";

    if (entry.speaker !== "") {
      whoTd.className = `who ${comType}`;
      whoTd.textContent = entry.speaker;
      wordsTd.className = `spokenwords ${comType}`;
    } else {
      // Legacy: omit the `who` cell entirely and colspan the words.
      wordsTd.className = `spokenwords ${comType}`;
      wordsTd.colSpan = 2;
    }
    if (entry.speaker !== "") tr.appendChild(whoTd);

    // Spoken words + attribution. Attribution comes from a caller-
    // supplied renderer (legacy A13 wrapped a hard-coded AFJ link).
    wordsTd.textContent = entry.text;
    const attrHtml = renderAttr(entry);
    if (attrHtml !== "") {
      const attrSpan = document.createElement("span");
      attrSpan.className = "attribution";
      // attributionRenderer returns trusted markup; mirrors the legacy
      // hand-built `<a>` tag. Callers must not pass untrusted text.
      attrSpan.innerHTML = ` ${attrHtml}`;
      wordsTd.appendChild(attrSpan);
    }
    tr.appendChild(wordsTd);

    table.appendChild(tr);
  }

  wrap.appendChild(table);
  container.appendChild(wrap);

  const off = delegate(wrap, "click", "tr.commentary", (_ev, tr) => {
    const timeId = tr.dataset.timeid;
    if (timeId !== undefined && timeId !== "") onSeek(timeId);
  });

  let activeEl: HTMLElement | null = null;

  const setActiveTimeId = (timeId: string | null): void => {
    if (timeId === null || !data.byTimeId.has(timeId)) {
      if (activeEl !== null) {
        activeEl.style.backgroundColor = "";
        activeEl = null;
      }
      return;
    }
    const el = wrap.querySelector<HTMLElement>(`#${CSS.escape(commentaryItemId(timeId))}`);
    if (el === null || el === activeEl) return;
    if (activeEl !== null) activeEl.style.backgroundColor = "";
    el.style.backgroundColor = activeBg;
    el.scrollIntoView({ block: "nearest" });
    activeEl = el;
  };

  const destroy = (): void => {
    off();
    container.textContent = "";
    activeEl = null;
  };

  return { setActiveTimeId, destroy };
}
