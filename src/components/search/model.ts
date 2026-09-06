import { displaySpeakerLabel, utteranceTypeClass } from "../transcript/model.js";
import type { UtteranceTypeClass } from "../transcript/model.js";

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
export function buildSearchIndex(
  sources: SearchSources,
  speakerLabels: Readonly<Record<string, string>> = {},
): SearchItem[] {
  const out: SearchItem[] = [];
  if (sources.utterances) {
    for (const u of sources.utterances.entries) {
      out.push({
        timeId: u.timeId,
        timeStr: u.timeStr,
        who: displaySpeakerLabel(u.speaker, speakerLabels),
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
        who: displaySpeakerLabel(c.speaker, speakerLabels),
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
