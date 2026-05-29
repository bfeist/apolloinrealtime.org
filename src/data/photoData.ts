/**
 * Photo data loader + indexer.
 *
 * Typed reference module for `indexes/photoData.csv` (Phase 5).
 *
 * Legacy origin: `legacy-src/{11,13,17}/ajax.js` `processPhotoData()`.
 * Each mission loads pipe-split photo metadata rows.
 *
 * CSV schema (pipe-delimited):
 *   `timeId|photoId|filename|supportingFilename|description|credit`
 *
 *   timeId             — signed mission-time id, e.g. `-351008`
 *   photoId            — photo designation, e.g. `"69-HC-1269"` or `"AS13-60-8582"`
 *   filename           — primary large image filename
 *   supportingFilename — optional custom supporting image filename when stored locally
 *   description        — caption or description text
 *   credit             — source copyright or image credit (e.g. `"NASA"`, `"LPI"`)
 *
 * Empty lines are skipped.
 */

import { loadCsv } from "./csvLoader.js";
import { timeIdToSeconds, timeIdToTimeStr } from "../shell/clock.js";

/**
 * Parse already-loaded split rows into a {@link PhotoData} view.
 * Skips empty lines or rows with empty `timeId`.
 */
export function parsePhotoData(rows: readonly string[][]): PhotoData {
  const entries: PhotoEntry[] = [];
  const timeIds: string[] = [];
  const byTimeId = new Map<string, number>();

  for (const row of rows) {
    const timeId = row[0];
    if (timeId === undefined || timeId === "") continue;

    const photoId = row[1] ?? "";
    const filename = row[2] ?? "";
    const supportingFilename = row[3] ?? "";
    const description = row[4] ?? "";
    const credit = row[5] ?? "";

    const idx = entries.length;
    entries.push({
      timeId,
      timeStr: timeIdToTimeStr(timeId),
      seconds: timeIdToSeconds(timeId),
      photoId,
      filename,
      supportingFilename,
      description,
      credit,
    });
    timeIds.push(timeId);
    byTimeId.set(timeId, idx);
  }

  return { entries, timeIds, byTimeId };
}

/**
 * Fetch and parse `indexes/photoData.csv` for a mission.
 */
export async function loadPhotoData(
  mediaRoot: string,
  options?: LoadCsvOptions,
): Promise<PhotoData> {
  const url = `${mediaRoot}indexes/photoData.csv`;
  const rows = await loadCsv(url, options);
  return parsePhotoData(rows);
}

/**
 * Find the closest photo entry index whose time is &le; `seconds`.
 * Returns `-1` if no entry is found or the list is empty.
 *
 * Uses binary search on monotonically increasing `seconds`.
 */
export function findClosestPhotoIndex(data: PhotoData, seconds: number): number {
  const { entries } = data;
  if (entries.length === 0) return -1;

  let lo = 0;
  let hi = entries.length;
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
