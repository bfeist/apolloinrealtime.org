/**
 * Video segments loader + indexer.
 *
 * Typed reference module for `indexes/videoSegmentData.csv` (Phase 5).
 *
 * Legacy origin: `legacy-src/{11,13,17}/ajax.js` `processVideoSegmentData()`.
 * The legacy code stored `gVideoSegments[]` as `[startTimeStr, endTimeStr,
 * <unused>]` — a flat list of (start, end) windows used to draw availability
 * rectangles on the navigator's tier-1 strip.
 *
 * CSV schema (pipe-delimited, no header):
 *   `startTimeStr|endTimeStr|`
 *
 *   startTimeStr — signed mission-time string, e.g. `-35:17:28`.
 *   endTimeStr   — signed mission-time string.
 *   (third column is present but empty in the corpus; preserved as `extra`)
 *
 * Empty leading-field rows are skipped (mirrors the legacy `data[0] !== ""`
 * guard).
 */

import { loadCsv } from "./csvLoader.js";
import { timeStrToSeconds } from "../shell/clock.js";

/**
 * Parse already-loaded pipe-delimited rows into a {@link VideoSegmentsData}
 * view. Empty leading-field rows are skipped.
 */
export function parseVideoSegmentData(rows: readonly string[][]): VideoSegmentsData {
  const segments: VideoSegment[] = [];
  for (const row of rows) {
    const startTimeStr = row[0];
    if (startTimeStr === undefined || startTimeStr === "") continue;
    const endTimeStr = row[1] ?? "";
    segments.push({
      startTimeStr,
      endTimeStr,
      startSeconds: timeStrToSeconds(startTimeStr),
      endSeconds: endTimeStr === "" ? Number.NaN : timeStrToSeconds(endTimeStr),
      extra: row[2] ?? "",
    });
  }
  return { segments };
}

/**
 * Fetch `indexes/videoSegmentData.csv` for a mission and return the parsed
 * view.
 */
export async function loadVideoSegmentData(
  mediaRoot: string,
  options?: LoadCsvOptions,
): Promise<VideoSegmentsData> {
  const url = `${mediaRoot}indexes/videoSegmentData.csv`;
  const rows = await loadCsv(url, options);
  return parseVideoSegmentData(rows);
}

/**
 * Find the index of the segment containing `seconds` (start <= seconds <
 * end). Returns `-1` if no segment contains the time or the list is empty.
 *
 * Segments are assumed monotonic in start time; the corpus satisfies this.
 * Uses binary search on `startSeconds`, then verifies `endSeconds` (segments
 * are non-overlapping in the corpus but may have gaps, so a found-by-start
 * candidate must still be range-checked).
 */
export function findVideoSegmentIndex(data: VideoSegmentsData, seconds: number): number {
  const { segments } = data;
  if (segments.length === 0) return -1;
  let lo = 0;
  let hi = segments.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const seg = segments[mid];
    if (seg !== undefined && seg.startSeconds <= seconds) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  const idx = lo - 1;
  if (idx < 0) return -1;
  const seg = segments[idx];
  if (!seg) return -1;
  if (Number.isNaN(seg.endSeconds)) return idx; // unknown end -> assume open-ended
  return seconds < seg.endSeconds ? idx : -1;
}
