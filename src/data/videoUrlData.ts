/**
 * Video URL/Segment source data loader + indexer.
 *
 * Typed reference module for `indexes/videoURLData.csv` (Phase 5).
 *
 * Legacy origin: `legacy-src/{11,13,17}/ajax.js` `processVideoURLData()`.
 * Normalizes different column formats across missions into a consistent typed model.
 *
 * CSV schema variants:
 * 1. (A11): `sdVideoId|hdVideoId|startTimeStr|endTimeStr` (4 columns)
 * 2. (A13): `videoId|startTimeStr|endTimeStr` (3 columns)
 * 3. (A17): `index|videoId|startTimeStr|endTimeStr` (4 columns)
 *
 * Empty lines are skipped.
 */

import { loadCsv } from "./csvLoader.js";
import { timeStrToSeconds } from "../shell/clock.js";

/**
 * Parse already-loaded split rows into a {@link VideoUrlData} view.
 * Skips empty lines.
 */
export function parseVideoUrlData(rows: readonly string[][]): VideoUrlData {
  const entries: VideoUrlEntry[] = [];

  for (const row of rows) {
    const col0 = row[0];
    if (col0 === undefined || col0 === "") continue;

    let videoId = "";
    let sdVideoId = "";
    let hdVideoId = "";
    let startTimeStr = "";
    let endTimeStr = "";

    if (row.length === 3) {
      // A13 format: videoId|startTimeStr|endTimeStr
      videoId = col0;
      sdVideoId = col0;
      hdVideoId = col0;
      startTimeStr = row[1] ?? "";
      endTimeStr = row[2] ?? "";
    } else if (row.length >= 4) {
      const isA17 = /^\d+$/.test(col0);
      if (isA17) {
        // A17 format: index|videoId|startTimeStr|endTimeStr
        videoId = row[1] ?? "";
        sdVideoId = row[1] ?? "";
        hdVideoId = row[1] ?? "";
        startTimeStr = row[2] ?? "";
        endTimeStr = row[3] ?? "";
      } else {
        // A11 format: sdVideoId|hdVideoId|startTimeStr|endTimeStr
        videoId = row[1] ?? row[0] ?? ""; // Prefer HD or fall back to SD
        sdVideoId = row[0] ?? "";
        hdVideoId = row[1] ?? "";
        startTimeStr = row[2] ?? "";
        endTimeStr = row[3] ?? "";
      }
    } else {
      // Unknown format warning or skip
      continue;
    }

    entries.push({
      videoId,
      sdVideoId,
      hdVideoId,
      startTimeStr,
      endTimeStr,
      startSeconds: timeStrToSeconds(startTimeStr),
      endSeconds: timeStrToSeconds(endTimeStr),
    });
  }

  return { entries };
}

/**
 * Fetch and parse `indexes/videoURLData.csv` for a mission.
 */
export async function loadVideoUrlData(
  mediaRoot: string,
  options?: LoadCsvOptions,
): Promise<VideoUrlData> {
  const url = `${mediaRoot}indexes/videoURLData.csv`;
  const rows = await loadCsv(url, options);
  return parseVideoUrlData(rows);
}

/**
 * Find the index of the video URL segment that contains `seconds` (start <= seconds < end).
 * Returns `-1` if no segment covers the time or if the list is empty.
 *
 * Uses binary search on monotonically increasing start times, then verifies the range constraint.
 */
export function findVideoUrlIndex(data: VideoUrlData, seconds: number): number {
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
