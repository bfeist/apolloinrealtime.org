/**
 * Orbit data loader + indexer.
 *
 * Typed reference module for `indexes/orbitData.csv` (Phase 5).
 *
 * Legacy origin: `legacy-src/{11,13,17}/ajax.js` `processOrbitData()`.
 * Manages lunar orbit sequence indexes and their duration windows.
 *
 * CSV schema (pipe-delimited):
 *   `startTimeStr|orbitNumber`
 *
 *   startTimeStr — signed mission-time string, e.g. `"076:02:00"`
 *   orbitNumber  — orbit sequence number, e.g. `"1"`
 *
 * End times are backfilled from the next record's start time.
 * For the final record, the end time is set to its own start time,
 * resulting in a duration of 0 (matches legacy behavior).
 */

import { loadCsv } from "./csvLoader.js";
import { timeStrToSeconds } from "../shell/clock.js";

/**
 * Parse already-loaded split rows into an {@link OrbitData} view.
 * Skips empty lines or rows with empty start time.
 */
export function parseOrbitData(rows: readonly string[][]): OrbitData {
  const partial: { startTimeStr: string; startSeconds: number; orbitNumber: string }[] = [];

  for (const row of rows) {
    const startTimeStr = row[0];
    if (startTimeStr === undefined || startTimeStr === "") continue;

    partial.push({
      startTimeStr,
      startSeconds: timeStrToSeconds(startTimeStr),
      orbitNumber: row[1] ?? "",
    });
  }

  const entries: OrbitEntry[] = partial.map((item, idx) => {
    const next = partial[idx + 1];
    const endSeconds = next?.startSeconds ?? item.startSeconds;
    const endTimeStr = next?.startTimeStr ?? item.startTimeStr;
    return {
      ...item,
      endTimeStr,
      endSeconds,
    };
  });

  return { entries };
}

/**
 * Fetch and parse `indexes/orbitData.csv` for a mission.
 */
export async function loadOrbitData(
  mediaRoot: string,
  options?: LoadCsvOptions,
): Promise<OrbitData> {
  const url = `${mediaRoot}indexes/orbitData.csv`;
  const rows = await loadCsv(url, options);
  return parseOrbitData(rows);
}

/**
 * Find the index of the orbit entry that contains `seconds` (start <= seconds < end, or start == seconds for last 0-duration entry).
 * Returns `-1` if no entry covers the time or if the list is empty.
 *
 * Uses binary search on monotonically increasing start times, then verifies the range constraint.
 */
export function findOrbitIndex(data: OrbitData, seconds: number): number {
  const { entries } = data;
  if (entries.length === 0) return -1;

  let lo = 0;
  let hi = entries.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const entry = entries[mid];
    if (entry !== undefined && entry.startSeconds <= seconds) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const idx = lo - 1;
  if (idx < 0) return -1;
  const entry = entries[idx];
  if (!entry) return -1;

  // For the final zero-duration entry, handle exact match
  if (entry.startSeconds === entry.endSeconds) {
    return seconds === entry.startSeconds ? idx : -1;
  }

  return seconds < entry.endSeconds ? idx : -1;
}
