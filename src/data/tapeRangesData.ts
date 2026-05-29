/**
 * MOCR audio tape ranges loader + indexer.
 *
 * Typed reference module for `MOCRviz/data/tape_ranges.csv` (Phase 4.5).
 *
 * Legacy origin: `public/{11,13}/MOCRviz/MOCRviz.js`
 * `processTapeRangeData()` + `getTapeByGETseconds()`.
 *
 * CSV schema (pipe-delimited, no header):
 *   `tapeId|channelBank|startTimeStr|endTimeStr`
 *
 *   tapeId       — e.g. "T920", "T868a" (suffix letters allowed)
 *   channelBank  — "HR1U" | "HR1L" | "HR2U" | "HR2L"
 *                  HR1/HR2 distinguishes which Houston-Recorder bank the
 *                  tape lived in; U/L distinguishes "upper" / "lower"
 *                  recorder. The legacy code only used the HR1-vs-HR2
 *                  split for channel routing; U/L is part of the
 *                  filename, not a routing key.
 *   startTimeStr — signed mission-time string ("HHH:MM:SS" or "-HH:MM:SS")
 *   endTimeStr   — signed mission-time string
 *
 * Channel routing (matches legacy `getTapeByGETseconds`):
 *   channel <= 30 → look in HR1 tapes
 *   channel  > 30 → look in HR2 tapes
 *
 * Sentinel tape id "T999" indicates "no audio available for this range"
 * (legacy bails out when `tapeData[0] === "T999"` in
 * `loadChannelSoundfile`). We preserve T999 rows in the dataset but the
 * audio controller skips them.
 *
 * The legacy lookup is a linear scan; tape lists are <100 rows so a
 * linear range scan stays cheap and avoids the binary-search edge cases
 * with overlapping HR1U/HR1L ranges.
 */

import { loadCsv } from "./csvLoader.js";
import { timeStrToSeconds } from "../shell/clock.js";

/** Parse already-loaded pipe-delimited rows into a {@link TapeRangesData}. */
export function parseTapeRangesData(rows: readonly string[][]): TapeRangesData {
  const hr1: TapeRange[] = [];
  const hr2: TapeRange[] = [];
  for (const row of rows) {
    const tapeId = row[0];
    const channelBank = row[1];
    const startTimeStr = row[2];
    const endTimeStr = row[3];
    if (
      tapeId === undefined ||
      tapeId === "" ||
      (channelBank !== "HR1U" &&
        channelBank !== "HR1L" &&
        channelBank !== "HR2U" &&
        channelBank !== "HR2L")
    ) {
      continue;
    }
    if (startTimeStr === undefined || endTimeStr === undefined) continue;
    const entry: TapeRange = {
      tapeId,
      channelBank,
      startTimeStr,
      endTimeStr,
      startSeconds: timeStrToSeconds(startTimeStr),
      endSeconds: timeStrToSeconds(endTimeStr),
    };
    if (channelBank === "HR1U" || channelBank === "HR1L") hr1.push(entry);
    else hr2.push(entry);
  }
  hr1.sort((a, b) => a.startSeconds - b.startSeconds);
  hr2.sort((a, b) => a.startSeconds - b.startSeconds);
  return { hr1, hr2 };
}

/**
 * Fetch `MOCRviz/data/tape_ranges.csv` for a mission and return the
 * parsed view.
 */
export async function loadTapeRangesData(
  mediaRoot: string,
  options?: LoadCsvOptions,
): Promise<TapeRangesData> {
  // The CSV lives under the legacy MOCRviz asset folder (kept in
  // `public/{N}/MOCRviz/data/` as reference data). The same file shape
  // ships on the media CDN at `{mediaRoot}/MOCR_audio/data/tape_ranges.csv`;
  // by convention this module reads from the local copy via the
  // mission-relative path the harness passes in.
  const url = `${mediaRoot}MOCRviz/data/tape_ranges.csv`;
  const rows = await loadCsv(url, options);
  return parseTapeRangesData(rows);
}

/**
 * Find the tape covering `seconds` for `channel`, or `null` if none.
 *
 * Mirrors legacy `getTapeByGETseconds`:
 *   - channels 1..30 search HR1, channels 31..60 search HR2
 *   - inclusive `start <= seconds <= end` (matches legacy `>=` / `<=`)
 *   - first match wins (HR1U and HR1L overlap in time; legacy iterates
 *     the merged-and-sorted list and takes the first hit)
 *
 * Returns the typed {@link TapeRange}; the legacy returned a 4-element
 * array (`[tapeId, bank, start, end]`) which callers indexed positionally.
 */
export function findTapeForGet(
  data: TapeRangesData,
  channel: number,
  seconds: number,
): TapeRange | null {
  const list = channel <= 30 ? data.hr1 : data.hr2;
  for (const entry of list) {
    if (seconds >= entry.startSeconds && seconds <= entry.endSeconds) return entry;
  }
  return null;
}
