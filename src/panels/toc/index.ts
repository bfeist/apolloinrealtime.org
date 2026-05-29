/**
 * Table-of-Contents panel.
 *
 * Phase 5 Track C — first typed panel extraction. Replaces the legacy
 * `TOC.html` iframe + jQuery DOM glue (`scrollTOCToTimeId`,
 * `parent.seekToTime`, `iFrameTOC`) with an in-page ESM module that:
 *
 *   - builds the same DOM shape as `TOC.html` (so the existing
 *     `.TOC_container`, `ul.TOC1`/`ul.TOC2`, `.tocitem`, `.TOCTimestamp`,
 *     `.TOC_item` CSS in `styles.css` continues to apply unchanged),
 *   - accepts a typed `onSeek(timeId)` callback (no `parent.*` calls),
 *   - exposes `setActiveTimeId(timeId)` (the legacy
 *     `scrollTOCToTimeId` behavior: highlight + scroll-into-view), and
 *   - is jQuery-free (uses native `scrollIntoView`, `addEventListener`).
 *
 * The panel renders from a {@link TocData} object (already loaded by
 * `src/data/tocData.ts`). Legacy callers will continue to use the iframe
 * until their call site itself converts to ESM (per the wire-up lesson
 * in `08-progress-tracker.md`); the typed panel is exercised on
 * `/dev/{N}/` in the meantime.
 *
 * Legacy origin:
 *   - `legacy-src/{11,13,17}/index.html` `<iframe id="iFrameTOC">`
 *   - `legacy-src/{11,13,17}/index.js` `scrollTOCToTimeId`
 *   - `public/{11,13,17}/TOC.html` static-built TOC markup
 *   - `legacy-src/{11,13,17}/styles.css` `.TOC_container` etc.
 */

import { delegate } from "../../dom/index.js";

/** Options for {@link createTocPanel}. */
export interface TocPanelOptions {
  /** Container element. Cleared and populated with the panel DOM. */
  container: HTMLElement;
  /** Parsed TOC data (from `src/data/tocData.ts`). */
  data: TocData;
  /** Called when the user clicks a TOC item. Receives the raw timeId. */
  onSeek: (timeId: string) => void;
  /**
   * CSS background applied to the active row. Defaults to the legacy
   * `cBackground_color_active` value used by `scrollTOCToTimeId`.
   */
  activeBackground?: string;
}

/** Handle returned by {@link createTocPanel}. */
export interface TocPanelHandle {
  /**
   * Highlight + scroll-to the row for `timeId`. If `timeId` is `null` or
   * not present in the TOC, the current highlight is cleared. Mirrors
   * legacy `scrollTOCToTimeId(timeId)` semantics: the legacy code was a
   * silent no-op when `timeId` wasn't in `gTOCDataLookup`; this version
   * also clears on `null` so callers can drop the highlight explicitly.
   */
  setActiveTimeId: (timeId: string | null) => void;
  /** Tear down listeners and empty the container. */
  destroy: () => void;
}

/**
 * One contiguous run of TOC entries at the same level — what becomes
 * a single `<ul class="TOCli TOC{level}">` block in the rendered DOM.
 */
export interface TocGroup {
  readonly level: TocLevel;
  readonly items: readonly TocEntry[];
}

/**
 * Group consecutive TOC entries by level. Pure helper — exported so the
 * grouping logic can be unit-tested in Node without a DOM.
 *
 * Matches the legacy `TOC.html` layout, which emitted one `<ul class="TOC1">`
 * for each run of level-1 chapter rows, with `<ul class="TOC2">` blocks
 * between them for the level-2 sub-items.
 */
export function groupTocEntries(entries: readonly TocEntry[]): TocGroup[] {
  const groups: TocGroup[] = [];
  let current: { level: TocLevel; items: TocEntry[] } | null = null;
  for (const entry of entries) {
    // TS doesn't narrow `current` to non-null through an optional-chain
    // equality check, so this stays as an explicit null guard.
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (current === null || current.level !== entry.level) {
      current = { level: entry.level, items: [entry] };
      groups.push(current);
      continue;
    }
    current.items.push(entry);
  }
  return groups;
}

/** DOM id for the `<li>` that represents `timeId`. */
export function tocItemId(timeId: string): string {
  return `tocid${timeId}`;
}

const DEFAULT_ACTIVE_BG = "#3b3b6e";

/**
 * Mount a TOC panel into `options.container`. Returns a handle for the
 * caller to drive highlight updates as the clock advances.
 */
export function createTocPanel(options: TocPanelOptions): TocPanelHandle {
  const { container, data, onSeek } = options;
  const activeBg = options.activeBackground ?? DEFAULT_ACTIVE_BG;

  container.textContent = "";

  const root = document.createElement("div");
  root.className = "TOC_container";

  for (const group of groupTocEntries(data.entries)) {
    const ul = document.createElement("ul");
    ul.className = `TOCli TOC${String(group.level)}`;
    for (const entry of group.items) {
      const li = document.createElement("li");
      li.className = "tocitem";
      li.id = tocItemId(entry.timeId);
      li.dataset.timeid = entry.timeId;

      const tsSpan = document.createElement("span");
      tsSpan.className = "TOCTimestamp";
      tsSpan.textContent = entry.timeStr;
      li.appendChild(tsSpan);

      const labelSpan = document.createElement("span");
      labelSpan.className = "TOC_item";
      labelSpan.textContent = ` ${entry.label}`;
      li.appendChild(labelSpan);

      ul.appendChild(li);
    }
    root.appendChild(ul);
  }

  container.appendChild(root);

  // Delegated click → onSeek. Mirrors the legacy
  // `onclick="parent.seekToTime('{timeId}')"` inline handlers, but jQuery-
  // and iframe-free.
  const off = delegate(root, "click", ".tocitem", (_ev, li) => {
    const timeId = li.dataset.timeid;
    if (timeId !== undefined && timeId !== "") onSeek(timeId);
  });

  let activeEl: HTMLElement | null = null;

  const setActiveTimeId = (timeId: string | null): void => {
    if (timeId === null || !data.byTimeId.has(timeId)) {
      if (activeEl !== null) {
        activeEl.style.background = "";
        activeEl = null;
      }
      return;
    }
    const el = root.querySelector<HTMLElement>(`#${CSS.escape(tocItemId(timeId))}`);
    if (el === null || el === activeEl) return;
    if (activeEl !== null) activeEl.style.background = "";
    el.style.background = activeBg;
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
