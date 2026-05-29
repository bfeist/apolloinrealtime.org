/**
 * Crew status data loader + indexer.
 *
 * Typed reference module for `indexes/crewStatusData.csv` (Phase 5).
 *
 * Legacy origin: `legacy-src/{11,13,17}/ajax.js` `processCrewStatusData()`.
 * Each row has a start time and status text. End times are backfilled
 * from the next row's start (or the end of the mission).
 *
 * CSV schema (pipe-delimited):
 *   `startTimeStr|statusHtml`
 *
 *   startTimeStr — signed mission-time string, e.g. `"-35:17:28"`
 *   statusHtml   — status text, potentially containing HTML tags
 *
 * Rows are skipped if `startTimeStr` is empty.
 */

import { loadCsv } from "./csvLoader.js";
import { secondsToTimeStr, timeStrToSeconds } from "../shell/clock.js";

/**
 * Parse already-loaded split rows into a {@link CrewStatusData} view.
 * Skips empty lines or rows with empty start time.
 */
export function parseCrewStatusData(
  rows: readonly string[][],
  options: ParseCrewStatusOptions,
): CrewStatusData {
  const partial: { startTimeStr: string; startSeconds: number; statusHtml: string }[] = [];

  for (const row of rows) {
    const startTimeStr = row[0];
    if (startTimeStr === undefined || startTimeStr === "") continue;

    partial.push({
      startTimeStr,
      startSeconds: timeStrToSeconds(startTimeStr),
      statusHtml: row[1] ?? "",
    });
  }

  const entries: CrewStatusEntry[] = partial.map((item, idx) => {
    const next = partial[idx + 1];
    const endSeconds = next?.startSeconds ?? options.missionDurationSeconds;
    const endTimeStr = next?.startTimeStr ?? secondsToTimeStr(options.missionDurationSeconds);
    return {
      startTimeStr: item.startTimeStr,
      startSeconds: item.startSeconds,
      statusHtml: item.statusHtml,
      endTimeStr,
      endSeconds,
    };
  });

  return { entries };
}

/**
 * Fetch and parse `indexes/crewStatusData.csv` for a mission.
 */
export async function loadCrewStatusData(
  mediaRoot: string,
  options: ParseCrewStatusOptions & LoadCsvOptions,
): Promise<CrewStatusData> {
  const url = `${mediaRoot}indexes/crewStatusData.csv`;
  const rows = await loadCsv(url, options);
  return parseCrewStatusData(rows, options);
}

/**
 * Find the index of the crew status entry that contains `seconds` (start <= seconds < end).
 * Returns `-1` if no entry covers the time or if the list is empty.
 *
 * Uses binary search on monotonically increasing start times, then verifies the range constraint.
 */
export function findCrewStatusIndex(data: CrewStatusData, seconds: number): number {
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
  return seconds < entry.endSeconds ? idx : -1;
}
