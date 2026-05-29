/**
 * URL deep-link parsing for the typed mission app.
 *
 * Mirrors the supported query params from the legacy `initializePlayback`
 * in `public/{11,13,17}/index.js`:
 *
 *   ?t=HHH:MM:SS   jump to that GET (negative prefix allowed)
 *   ?t=rt          stay in live "real-time" mode (no manual seek)
 *   ?ch=N          select MOCR channel N (integer; A11/A13 only)
 *
 * Other legacy params (`?img=...`) are not handled yet — they require
 * the photo data to be loaded before the seek target is known, which is
 * a separate, async concern.
 */

import { timeStrToSeconds } from "../shell/clock.js";

export interface DeepLinkParams {
  /** Initial seek in seconds, or "rt" to remain in live wall-clock mode. */
  seek: { kind: "seconds"; seconds: number } | { kind: "rt" } | null;
  /** Initial MOCR channel id, or null if `?ch=` is absent or invalid. */
  channel: number | null;
}

/**
 * Parse a URL search string ("?t=075:31:12&ch=12" or similar) into typed
 * deep-link params. Unknown / malformed values are silently dropped so
 * a bad share-link never breaks app boot.
 */
export function parseDeepLink(search: string): DeepLinkParams {
  const params = new URLSearchParams(search);
  return {
    seek: parseSeek(params.get("t")),
    channel: parseChannel(params.get("ch")),
  };
}

function parseSeek(raw: string | null): DeepLinkParams["seek"] {
  if (raw === null) return null;
  const v = raw.trim();
  if (v === "") return null;
  if (v === "rt") return { kind: "rt" };
  // Accept "HHH:MM:SS" or "-HH:MM:SS" forms; tolerate "H:MM:SS" by
  // left-padding the hours field to 3 chars (legacy `timeStrToSeconds`
  // is index-based and requires the full HHH:MM:SS shape).
  const negative = v.startsWith("-");
  const body = negative ? v.slice(1) : v;
  if (!/^\d{1,3}:\d{2}:\d{2}$/.test(body)) return null;
  const [hh, mm, ss] = body.split(":");
  if (hh === undefined || mm === undefined || ss === undefined) return null;
  const padded = `${hh.padStart(3, "0")}:${mm}:${ss}`;
  const seconds = timeStrToSeconds(padded) * (negative ? -1 : 1);
  return Number.isFinite(seconds) ? { kind: "seconds", seconds } : null;
}

function parseChannel(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
