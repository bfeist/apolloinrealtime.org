/**
 * Table-of-Contents data loader + indexer.
 *
 * Typed reference module for `indexes/TOCData.csv` (Phase 5 starter).
 *
 * Legacy origin: `legacy-src/{11,13,17}/ajax.js` `processTOCData()` and
 * `legacy-src/{11,13,17}/index.js` `scrollToClosestTOC()`. Each mission
 * stored three parallel globals:
 *
 *   - `gTOCData[]`     — `[timeStr, level, label]` rows (timeId at col 0
 *                         is rewritten to a timeStr via `timeIdToTimeStr`)
 *   - `gTOCIndex[]`    — raw timeIds in file order (used for nearest-time
 *                         scrubbing search)
 *   - `gTOCDataLookup` — `{ [timeId]: rowIndex }` map for O(1) lookup
 *
 * This module returns the same three views as a single typed object so
 * downstream panels (TOC sidebar, navigator tick overlay) can share it.
 *
 * CSV schema (pipe-delimited, no header):
 *   `timeId|level|label`
 *
 *   timeId  — signed mission-time id, e.g. `-351728` or `0050000`
 *   level   — "1" (top-level / chapter) or "2" (sub-item)
 *   label   — UTF-8 free text
 *
 * Empty rows (trailing newline) are skipped, mirroring the legacy
 * `data[0] !== ""` guard.
 */

import { loadCsv, type LoadCsvOptions } from "./csvLoader.js";
import { timeIdToSeconds, timeIdToTimeStr } from "../shell/clock.js";

/** TOC entry level: 1 = chapter heading, 2 = sub-item. */
export type TocLevel = 1 | 2;

export interface TocEntry {
  /** Raw timeId from the CSV, e.g. `"-351728"` or `"0050000"`. */
  readonly timeId: string;
  /** Human-readable time string (`"HHH:MM:SS"` / `"-HH:MM:SS"`). */
  readonly timeStr: string;
  /** Signed integer seconds from T-0. */
  readonly seconds: number;
  /** Heading level. Unrecognized values fall back to `2`. */
  readonly level: TocLevel;
  /** Free-text label. */
  readonly label: string;
}

export interface TocData {
  /** Entries in file order (the order they're displayed in the TOC). */
  readonly entries: readonly TocEntry[];
  /** timeIds in file order. Used for nearest-time binary/linear search. */
  readonly timeIds: readonly string[];
  /** `timeId -> entry index` lookup. */
  readonly byTimeId: ReadonlyMap<string, number>;
}

/**
 * Parse already-loaded pipe-delimited rows into a {@link TocData} view.
 * Skips rows whose first field is empty (matches legacy guard).
 */
export function parseTocData(rows: readonly string[][]): TocData {
  const entries: TocEntry[] = [];
  const timeIds: string[] = [];
  const byTimeId = new Map<string, number>();

  for (const row of rows) {
    const timeId = row[0];
    if (timeId === undefined || timeId === "") continue;
    const levelRaw = row[1] ?? "";
    const label = row[2] ?? "";
    const level: TocLevel = levelRaw === "1" ? 1 : 2;
    const idx = entries.length;
    entries.push({
      timeId,
      timeStr: timeIdToTimeStr(timeId),
      seconds: timeIdToSeconds(timeId),
      level,
      label,
    });
    timeIds.push(timeId);
    byTimeId.set(timeId, idx);
  }

  return { entries, timeIds, byTimeId };
}

/**
 * Fetch `indexes/TOCData.csv` for a mission and return the parsed view.
 *
 * `mediaRoot` is the mission's `webCdnRoot` (typically `/<missionId>/`
 * in this app; the legacy `cWebCdnRoot` value).
 */
export async function loadTocData(mediaRoot: string, options?: LoadCsvOptions): Promise<TocData> {
  const url = `${mediaRoot}indexes/TOCData.csv`;
  const rows = await loadCsv(url, options);
  return parseTocData(rows);
}

/**
 * Find the index of the TOC entry whose time is the greatest one
 * &le; `seconds`. Returns `-1` if `seconds` precedes the first entry, or
 * if the TOC is empty.
 *
 * Mirrors `scrollToClosestTOC` semantics: walk forward; the answer is the
 * entry *before* the first one whose timeId exceeds the search time. The
 * legacy code did a linear scan; this uses binary search since `timeIds`
 * is monotonically increasing (timeIds are zero-padded so lexical = numeric
 * for same-sign rows, but we compare on parsed seconds to be safe across
 * the negative→positive boundary).
 */
export function findClosestTocIndex(toc: TocData, seconds: number): number {
  const { entries } = toc;
  if (entries.length === 0) return -1;
  // Binary search for the rightmost entry with entry.seconds <= seconds.
  let lo = 0;
  let hi = entries.length; // exclusive
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const entry = entries[mid];
    if (entry !== undefined && entry.seconds <= seconds) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo - 1;
}
