/**
 * Search panel.
 *
 * Phase 5 Track C — typed, jQuery-free replacement for the legacy
 * `performSearch` / `getSearchResultHTML` / `searchResultClick` chain in
 * `legacy-src/{N}/index.js`. The legacy code searched a flat
 * `gSearchData` array that was concatenated from commentary +
 * utterances + photos at startup. Here we build the search index from
 * the typed data modules instead.
 */

import { delegate, on } from "../../dom/index.js";
import { utteranceTypeClass } from "../transcript/index.js";
import type { UtteranceTypeClass } from "../transcript/index.js";

/** Kind of search-index entry. Drives the result-row label + click action. */
export type SearchKind = "transcript" | "commentary" | "photo";

/** A single entry in the search index. */
export interface SearchItem {
  /** Mission time id of the underlying entry. */
  timeId: string;
  /** Human-readable mission time. */
  timeStr: string;
  /** Speaker / photo id / etc. (left column). */
  who: string;
  /** Text to search against AND to display. */
  words: string;
  /** Legacy speaker-type CSS class (always `utt_pao` for non-transcript). */
  uttType: UtteranceTypeClass;
  kind: SearchKind;
}

/** Inputs for {@link buildSearchIndex}. */
export interface SearchSources {
  utterances?: UtteranceData;
  commentary?: CommentaryData;
  photos?: PhotoData;
}

/**
 * Build a flat searchable index from typed data modules. Pure function —
 * exported for testing. Order is utterances, then commentary, then
 * photos (matches the legacy `gSearchData` concatenation order in
 * `processSearchData()`).
 */
export function buildSearchIndex(sources: SearchSources): SearchItem[] {
  const out: SearchItem[] = [];
  if (sources.utterances) {
    for (const u of sources.utterances.entries) {
      out.push({
        timeId: u.timeId,
        timeStr: u.timeStr,
        who: u.speaker,
        words: u.words,
        uttType: utteranceTypeClass(u.extra, u.speaker),
        kind: "transcript",
      });
    }
  }
  if (sources.commentary) {
    for (const c of sources.commentary.entries) {
      out.push({
        timeId: c.timeId,
        timeStr: c.timeStr,
        who: c.speaker,
        words: c.text,
        uttType: "utt_pao",
        kind: "commentary",
      });
    }
  }
  if (sources.photos) {
    for (const p of sources.photos.entries) {
      out.push({
        timeId: p.timeId,
        timeStr: p.timeStr,
        who: p.photoId,
        words: p.description,
        uttType: "utt_pao",
        kind: "photo",
      });
    }
  }
  return out;
}

/** A single search hit including the match position within `words`. */
export interface SearchHit {
  item: SearchItem;
  /** 0-based index of the match within `item.words` (case-insensitive). */
  matchStart: number;
  /** Length of the matched substring (= query length). */
  matchLength: number;
}

/**
 * Case-insensitive substring search across the index. Stops after `max`
 * hits (legacy cap was 500). Returns `[]` for queries shorter than 2
 * characters (mirrors legacy `if (searchText.length > 1)`).
 */
export function searchIndex(items: readonly SearchItem[], query: string, max = 500): SearchHit[] {
  const q = query.toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const item of items) {
    const pos = item.words.toLowerCase().indexOf(q);
    if (pos === -1) continue;
    hits.push({ item, matchStart: pos, matchLength: q.length });
    if (hits.length >= max) break;
  }
  return hits;
}

/** Options for {@link createSearchPanel}. */
export interface SearchPanelOptions {
  container: HTMLElement;
  /** Pre-built index (or pass `sources` and let the panel build it). */
  index?: readonly SearchItem[];
  /** Sources to build the index from if `index` not provided. */
  sources?: SearchSources;
  /** Callback when the user clicks a result. */
  onResult: (item: SearchItem) => void;
  /** Max hits to render. Default 500 (legacy cap). */
  maxHits?: number;
  /** Optional debounce in ms for input changes. Default 100. */
  debounceMs?: number;
}

export interface SearchPanelHandle {
  /** Programmatically set the search query (also triggers a re-render). */
  setQuery: (query: string) => void;
  /** Clear the input + results. */
  clear: () => void;
  destroy: () => void;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function createSearchPanel(options: SearchPanelOptions): SearchPanelHandle {
  const { container, onResult } = options;
  const maxHits = options.maxHits ?? 500;
  const debounceMs = options.debounceMs ?? 100;
  const index: readonly SearchItem[] = options.index ?? buildSearchIndex(options.sources ?? {});

  container.textContent = "";
  const wrap = document.createElement("div");
  wrap.className = "search_panel";
  const input = document.createElement("input");
  input.type = "text";
  input.id = "searchInputField";
  input.placeholder = "Search transcript, commentary, photos...";
  const resultsWrap = document.createElement("div");
  resultsWrap.id = "searchResultsDiv";
  const resultsTable = document.createElement("table");
  resultsTable.id = "searchResultsTable";
  resultsWrap.appendChild(resultsTable);
  wrap.appendChild(input);
  wrap.appendChild(resultsWrap);
  container.appendChild(wrap);

  const lookup = new Map<string, SearchItem>();

  const render = (query: string): void => {
    lookup.clear();
    const hits = searchIndex(index, query, maxHits);
    let html = "";
    for (const hit of hits) {
      const { item, matchStart, matchLength } = hit;
      const key = `${item.kind}:${item.timeId}:${String(matchStart)}`;
      lookup.set(key, item);
      const before = escapeHtml(item.words.slice(0, matchStart));
      const match = escapeHtml(item.words.slice(matchStart, matchStart + matchLength));
      const after = escapeHtml(item.words.slice(matchStart + matchLength));
      const wordsHtml = `${before}<span class="searchResultHighlight">${match}</span>${after}`;
      html +=
        `<tr class="utterance ${item.uttType}" data-key="${key}">` +
        `<td class="timestamp">${escapeHtml(item.timeStr)}<br>${item.kind}</td>` +
        `<td class="who ${item.uttType}">${escapeHtml(item.who)}</td>` +
        `<td class="spokenwords ${item.uttType}"> ${wordsHtml}</td>` +
        `</tr>`;
    }
    resultsTable.innerHTML = html;
  };

  let timer: number | null = null;
  const offInput = on(input, "input", () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      render(input.value);
    }, debounceMs);
  });

  const offClick = delegate(resultsTable, "click", "tr[data-key]", (_ev, tr) => {
    const key = tr.dataset.key;
    if (key === undefined) return;
    const item = lookup.get(key);
    if (item) onResult(item);
  });

  return {
    setQuery: (q: string): void => {
      input.value = q;
      render(q);
    },
    clear: (): void => {
      input.value = "";
      resultsTable.innerHTML = "";
      lookup.clear();
    },
    destroy: (): void => {
      if (timer !== null) window.clearTimeout(timer);
      offInput();
      offClick();
      container.textContent = "";
    },
  };
}
