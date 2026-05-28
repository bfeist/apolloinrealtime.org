/**
 * Clock + GET (Ground Elapsed Time) conversion utilities.
 *
 * Extracted from the legacy `public/{11,13,17}/index.js` files (Phase 4).
 * The three legacy implementations are byte-equivalent for these functions;
 * this typed module is the single source of truth going forward.
 *
 * Three interchangeable representations of mission time:
 *
 *   seconds : number   — signed integer seconds from T-0 (negative = pre-launch)
 *   timeStr : string   — "HHH:MM:SS" or "-HH:MM:SS" (leading minus replaces the
 *                        hundreds-of-hours zero, e.g. "-05:23:09")
 *   timeId  : string   — same as timeStr with the colons stripped:
 *                        "0050000" or "-050000". Used as a stable DOM id / map key.
 *
 * Hours field is three digits because Apollo missions exceed 100h GET.
 */

/** Left-pad a non-negative integer with zeros to the requested width. */
export function padZeros(num: number, size: number): string {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

/**
 * Convert signed seconds to a "HHH:MM:SS" (or "-HH:MM:SS") time string.
 *
 * Matches the legacy `secondsToTimeStr` exactly, including its quirks:
 *   - Fractional seconds are truncated toward zero (parseInt + Math.floor on |sec|).
 *   - Negative times use a leading "-" in place of the hundreds-of-hours digit.
 */
export function secondsToTimeStr(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const hours = Math.trunc(abs / 3600);
  const minutes = Math.trunc(abs / 60) % 60;
  const seconds = Math.floor(Math.trunc(abs) % 60);
  let timeStr = padZeros(hours, 3) + ":" + padZeros(minutes, 2) + ":" + padZeros(seconds, 2);
  if (totalSeconds < 0) {
    // Replace the leading zero of the hours field with "-" (legacy behavior).
    timeStr = "-" + timeStr.substring(1);
  }
  return timeStr;
}

/** Convert signed seconds to a timeId ("HHHMMSS" or "-HHMMSS"). */
export function secondsToTimeId(seconds: number): string {
  return secondsToTimeStr(seconds).split(":").join("");
}

/** Convert a timeId back to signed integer seconds. */
export function timeIdToSeconds(timeId: string): number {
  const sign = timeId.substring(0, 1);
  const hours = parseInt(timeId.substring(0, 3), 10);
  const minutes = parseInt(timeId.substring(3, 5), 10);
  const seconds = parseInt(timeId.substring(5, 7), 10);
  const signToggle = sign === "-" ? -1 : 1;
  return signToggle * (Math.abs(hours) * 3600 + minutes * 60 + seconds);
}

/** Convert a timeId to its colonized timeStr form. */
export function timeIdToTimeStr(timeId: string): string {
  return timeId.substring(0, 3) + ":" + timeId.substring(3, 5) + ":" + timeId.substring(5, 7);
}

/** Convert a timeStr to its compact timeId form. */
export function timeStrToTimeId(timeStr: string): string {
  return timeStr.split(":").join("");
}

/** Convert a timeStr to signed integer seconds. */
export function timeStrToSeconds(timeStr: string): number {
  const sign = timeStr.substring(0, 1);
  const hours = parseInt(timeStr.substring(0, 3), 10);
  const minutes = parseInt(timeStr.substring(4, 6), 10);
  const seconds = parseInt(timeStr.substring(7, 9), 10);
  const signToggle = sign === "-" ? -1 : 1;
  return Math.round(signToggle * (Math.abs(hours) * 3600 + minutes * 60 + seconds));
}
