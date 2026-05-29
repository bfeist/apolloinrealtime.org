/**
 * Utterance (transcript) data loader + indexer.
 *
 * Typed reference module for `indexes/utteranceData.csv` (Phase 5).
 *
 * Legacy origin: `legacy-src/{11,13,17}/ajax.js` `processUtteranceData()`.
 * Each mission loads pipe-split transcript rows.
 *
 * CSV schema (pipe-delimited):
 *   `timeId|speaker|words|extra`
 *
 *   timeId  — signed mission-time id, e.g. `-044959`
 *   speaker — speaker abbreviation or name, e.g. `"PAO"`, `"CDR"`, `"CC"`
 *   words   — spoken words text
 *   extra   — optional 4th field (e.g. `"P"`, `"C"`, or empty)
 *
 * Rows with empty `timeId` are skipped.
 */

import { loadCsv } from "./csvLoader.js";
import { timeIdToSeconds, timeIdToTimeStr } from "../shell/clock.js";

/**
 * Parse already-loaded split rows into an {@link UtteranceData} view.
 * Skips rows with empty `timeId`.
 */
export function parseUtteranceData(rows: readonly string[][]): UtteranceData {
  const entries: UtteranceEntry[] = [];
  const timeIds: string[] = [];
  const byTimeId = new Map<string, number>();

  for (const row of rows) {
    const timeId = row[0];
    if (timeId === undefined || timeId === "") continue;

    const speaker = row[1] ?? "";
    const words = row[2] ?? "";
    const extra = row[3] ?? "";

    const idx = entries.length;
    entries.push({
      timeId,
      timeStr: timeIdToTimeStr(timeId),
      seconds: timeIdToSeconds(timeId),
      speaker,
      words,
      extra,
    });
    timeIds.push(timeId);
    byTimeId.set(timeId, idx);
  }

  return { entries, timeIds, byTimeId };
}

/**
 * Fetch and parse `indexes/utteranceData.csv` for a mission.
 */
export async function loadUtteranceData(
  mediaRoot: string,
  options?: LoadCsvOptions,
): Promise<UtteranceData> {
  const url = `${mediaRoot}indexes/utteranceData.csv`;
  const rows = await loadCsv(url, options);
  return parseUtteranceData(rows);
}

/**
 * Find the closest transcript/utterance entry index whose time is &le; `seconds`.
 * Returns `-1` if no entry is found or the list is empty.
 *
 * Uses binary search on monotonically increasing `seconds`.
 */
export function findClosestUtteranceIndex(data: UtteranceData, seconds: number): number {
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
