/**
 * Mission stages loader + indexer.
 *
 * Typed reference module for `indexes/missionStagesData.csv` (Phase 5).
 *
 * Legacy origin: `legacy-src/{11,13,17}/ajax.js` `processMissionStagesData()`.
 * The legacy code stored `gMissionStages[]` as `[startTimeStr, name,
 * description, endTimeStr]`, where `endTimeStr` was back-filled with the
 * next row's start time and the final row's end was
 * `secondsToTimeStr(cMissionDurationSeconds)`.
 *
 * This module returns the same logical view in a typed form, plus
 * `seconds`/`endSeconds` for direct numeric comparisons.
 *
 * CSV schema (pipe-delimited, no header):
 *   `timeStr|name|description`
 *
 *   timeStr     — signed mission-time string, e.g. `-35:17:28` or
 *                 `055:54:56` (parsed by {@link timeStrToSeconds}).
 *   name        — short stage label (e.g. `Launch`, `Earth Orbit`).
 *   description — longer free-text description shown in the UI.
 *
 * Empty leading-field rows are skipped (mirrors the legacy `data[0] !== ""`
 * guard).
 */

import { loadCsv, type LoadCsvOptions } from "./csvLoader.js";
import { secondsToTimeStr, timeStrToSeconds } from "../shell/clock.js";

export interface MissionStage {
  /** Stage start as a signed mission-time string, e.g. `"-35:17:28"`. */
  readonly timeStr: string;
  /** Stage start as signed integer seconds from T-0. */
  readonly seconds: number;
  /** Short stage label. */
  readonly name: string;
  /** Longer free-text description. */
  readonly description: string;
  /** Stage end as a signed mission-time string (= next stage start, or
   * mission end for the final stage). */
  readonly endTimeStr: string;
  /** Stage end as signed integer seconds from T-0. */
  readonly endSeconds: number;
}

export interface MissionStagesData {
  /** Stages in file order. */
  readonly stages: readonly MissionStage[];
}

export interface ParseMissionStagesOptions {
  /** Total mission duration in seconds; used as the final stage's
   * `endSeconds` (legacy behavior). */
  missionDurationSeconds: number;
}

/**
 * Parse already-loaded pipe-delimited rows into a {@link MissionStagesData}
 * view. Empty leading-field rows are skipped. The final stage's end is set
 * from `options.missionDurationSeconds` (matches legacy
 * `secondsToTimeStr(cMissionDurationSeconds)`).
 */
export function parseMissionStagesData(
  rows: readonly string[][],
  options: ParseMissionStagesOptions,
): MissionStagesData {
  const partial: { timeStr: string; seconds: number; name: string; description: string }[] = [];
  for (const row of rows) {
    const timeStr = row[0];
    if (timeStr === undefined || timeStr === "") continue;
    partial.push({
      timeStr,
      seconds: timeStrToSeconds(timeStr),
      name: row[1] ?? "",
      description: row[2] ?? "",
    });
  }

  const stages: MissionStage[] = partial.map((stage, idx) => {
    const next = partial[idx + 1];
    const endSeconds = next?.seconds ?? options.missionDurationSeconds;
    const endTimeStr = next?.timeStr ?? secondsToTimeStr(options.missionDurationSeconds);
    return { ...stage, endTimeStr, endSeconds };
  });

  return { stages };
}

/**
 * Fetch `indexes/missionStagesData.csv` for a mission and return the parsed
 * view. `mediaRoot` is the mission's `webCdnRoot` (typically `/<missionId>/`
 * in this app).
 */
export async function loadMissionStagesData(
  mediaRoot: string,
  options: ParseMissionStagesOptions & LoadCsvOptions,
): Promise<MissionStagesData> {
  const url = `${mediaRoot}indexes/missionStagesData.csv`;
  const rows = await loadCsv(url, options);
  return parseMissionStagesData(rows, options);
}

/**
 * Find the index of the stage containing `seconds`, i.e. the stage `s` for
 * which `s.seconds <= seconds < s.endSeconds`. Returns `-1` if `seconds`
 * precedes the first stage or follows the last one (or the list is empty).
 *
 * Uses binary search on `seconds` (stages are monotonically increasing).
 */
export function findStageIndex(data: MissionStagesData, seconds: number): number {
  const { stages } = data;
  if (stages.length === 0) return -1;
  const first = stages[0];
  const last = stages[stages.length - 1];
  if (!first || !last) return -1;
  if (seconds < first.seconds) return -1;
  if (seconds >= last.endSeconds) return -1;
  let lo = 0;
  let hi = stages.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const stage = stages[mid];
    if (stage !== undefined && stage.seconds <= seconds) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo - 1;
}
