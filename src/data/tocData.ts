/**
 * Table-of-Contents data loader + indexer.
 *
 * Typed reference module for `indexes/TOCData.csv`.
 *
 * Legacy origin: the adjacent mission webroots' `ajax.js` `processTOCData()` and
 * `index.js` `scrollToClosestTOC()`. Each mission
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

import { loadCsv } from "./csvLoader.js";
import { createTimeIndex } from "./timeIndex.js";
import { timeIdToSeconds, timeIdToTimeStr } from "../shell/clock.js";

/**
 * Parse already-loaded pipe-delimited rows into a {@link TocData} view.
 * Skips rows whose first field is empty (matches legacy guard).
 */
export function parseTocData(rows: readonly string[][]): TocData {
  const entries: TocEntry[] = [];

  for (const row of rows) {
    // A13 includes "046.4338": normalize its stray hours separator before
    // the fixed-width clock parser can misread it as 046:00:43.
    const timeId = row[0]?.replace(/^(\d{3})\.(\d{4})$/, "$1$2");
    if (timeId === undefined || timeId === "") continue;
    const levelRaw = row[1] ?? "";
    const label = row[2] ?? "";
    const level: TocLevel = levelRaw === "1" ? 1 : 2;
    entries.push({
      timeId,
      timeStr: timeIdToTimeStr(timeId),
      seconds: timeIdToSeconds(timeId),
      level,
      label,
    });
  }

  return createTimeIndex(entries);
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
 * The parser sorts source rows chronologically, so binary search can compare
 * numeric seconds across both the countdown and post-launch mission.
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
