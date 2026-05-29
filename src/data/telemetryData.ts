/**
 * Telemetry data loader + indexer.
 *
 * Typed reference module for `indexes/telemetryData.csv` (Phase 5).
 *
 * Legacy origin: `legacy-src/{11,13,17}/ajax.js` `processTelemetryData()`.
 * Normalizes telemetry positions, velocities, and distances relative to
 * Earth and Moon.
 *
 * CSV schema (pipe-delimited):
 *   `startTimeStr|velocityEarth|distanceEarth|distanceMoon|velocityMoon`
 *
 *   startTimeStr  — signed mission-time string, e.g. `"-35:17:28"`
 *   velocityEarth — velocity relative to Earth (miles per hour)
 *   distanceEarth — distance relative to Earth (nautical miles)
 *   distanceMoon  — distance relative to Moon (nautical miles)
 *   velocityMoon  — velocity relative to Moon (miles per hour)
 *
 * End times are backfilled from the next record's start time, or the end
 * of the mission.
 */

import { loadCsv } from "./csvLoader.js";
import { secondsToTimeStr, timeStrToSeconds } from "../shell/clock.js";

/**
 * Parse already-loaded split rows into a {@link TelemetryData} view.
 * Skips empty lines or rows with empty start time.
 */
export function parseTelemetryData(
  rows: readonly string[][],
  options: ParseTelemetryOptions,
): TelemetryData {
  const partial: {
    startTimeStr: string;
    startSeconds: number;
    velocityEarth: number;
    distanceEarth: number;
    distanceMoon: number;
    velocityMoon: number;
  }[] = [];

  for (const row of rows) {
    const startTimeStr = row[0];
    if (startTimeStr === undefined || startTimeStr === "") continue;

    const velE = row[1] ? parseFloat(row[1]) : Number.NaN;
    const distE = row[2] ? parseFloat(row[2]) : Number.NaN;
    const distM = row[3] ? parseFloat(row[3]) : Number.NaN;
    const velM = row[4] ? parseFloat(row[4]) : Number.NaN;

    partial.push({
      startTimeStr,
      startSeconds: timeStrToSeconds(startTimeStr),
      velocityEarth: velE,
      distanceEarth: distE,
      distanceMoon: distM,
      velocityMoon: velM,
    });
  }

  const entries: TelemetryEntry[] = partial.map((item, idx) => {
    const next = partial[idx + 1];
    const endSeconds = next?.startSeconds ?? options.missionDurationSeconds;
    const endTimeStr = next?.startTimeStr ?? secondsToTimeStr(options.missionDurationSeconds);
    return {
      ...item,
      endTimeStr,
      endSeconds,
    };
  });

  return { entries };
}

/**
 * Fetch and parse `indexes/telemetryData.csv` for a mission.
 */
export async function loadTelemetryData(
  mediaRoot: string,
  options: ParseTelemetryOptions & LoadCsvOptions,
): Promise<TelemetryData> {
  const url = `${mediaRoot}indexes/telemetryData.csv`;
  const rows = await loadCsv(url, options);
  return parseTelemetryData(rows, options);
}

/**
 * Find the index of the telemetry entry that contains `seconds` (start <= seconds < end).
 * Returns `-1` if no entry covers the time or if the list is empty.
 *
 * Uses binary search on monotonically increasing start times, then verifies the range constraint.
 */
export function findTelemetryIndex(data: TelemetryData, seconds: number): number {
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
