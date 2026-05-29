/**
 * Commentary data loader + indexer.
 *
 * Typed reference module for `indexes/commentaryData.csv` (Phase 5).
 *
 * Legacy origin: `legacy-src/{11,13,17}/ajax.js` `processCommentaryData()`.
 * In A13, `commentaryData.csv` has a two-column schema (`timeId|text`).
 * In A11 and A17, it has a four-column schema (`timeId|source|speaker|text`).
 * This loader normalizes both structures into a consistent typed entry.
 *
 * CSV schema variants:
 * 1. (A13): `timeId|text`
 * 2. (A11, A17): `timeId|source|speaker|text`
 *
 * Rows are skipped if `timeId` is empty or missing.
 */

import { loadCsv } from "./csvLoader.js";
import { timeIdToSeconds, timeIdToTimeStr } from "../shell/clock.js";

/**
 * Parse already-loaded split rows into a normalized {@link CommentaryData} view.
 * Skips rows with empty `timeId`.
 */
export function parseCommentaryData(rows: readonly string[][]): CommentaryData {
  const entries: CommentaryEntry[] = [];
  const timeIds: string[] = [];
  const byTimeId = new Map<string, number>();

  for (const row of rows) {
    const timeId = row[0];
    if (timeId === undefined || timeId === "") continue;

    let source = "";
    let speaker = "";
    let text = "";

    if (row.length <= 2) {
      // A13 format: timeId|text
      text = row[1] ?? "";
    } else {
      // A11/A17 format: timeId|source|speaker|text
      source = row[1] ?? "";
      speaker = row[2] ?? "";
      text = row[3] ?? "";
    }

    const idx = entries.length;
    entries.push({
      timeId,
      timeStr: timeIdToTimeStr(timeId),
      seconds: timeIdToSeconds(timeId),
      source,
      speaker,
      text,
    });
    timeIds.push(timeId);
    byTimeId.set(timeId, idx);
  }

  return { entries, timeIds, byTimeId };
}

/**
 * Fetch and parse `indexes/commentaryData.csv` for a mission.
 */
export async function loadCommentaryData(
  mediaRoot: string,
  options?: LoadCsvOptions,
): Promise<CommentaryData> {
  const url = `${mediaRoot}indexes/commentaryData.csv`;
  const rows = await loadCsv(url, options);
  return parseCommentaryData(rows);
}

/**
 * Find the closest commentary entry index whose time is &le; `seconds`.
 * Returns `-1` if no entry is found or the list is empty.
 *
 * Uses binary search on monotonically increasing `seconds`.
 */
export function findClosestCommentaryIndex(data: CommentaryData, seconds: number): number {
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
