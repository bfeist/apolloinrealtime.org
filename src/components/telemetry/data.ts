/** Frame of reference used for current telemetry. */
export type FrameOfReference = "Earth" | "Moon";

/** A continuous range during which one frame of reference applies. */
export interface FrameOfReferenceRange {
  /** Inclusive start seconds. */
  startSeconds: number;
  /** Exclusive end seconds. */
  endSeconds: number;
  frame: FrameOfReference;
}

/**
 * Decide the frame of reference for `currentSeconds` given a list of
 * ranges. Outside any range, defaults to `"Earth"` (matches legacy
 * fall-through). Ranges are tested in order.
 */
export function frameOfReferenceAt(
  ranges: readonly FrameOfReferenceRange[],
  currentSeconds: number,
): FrameOfReference {
  for (const r of ranges) {
    if (currentSeconds >= r.startSeconds && currentSeconds < r.endSeconds) {
      return r.frame;
    }
  }
  return "Earth";
}

/**
 * Linear interpolation of a numeric field between adjacent telemetry
 * samples. Mirrors the legacy `dashVelocity` / `dashDistanceEarth`
 * scan-and-interpolate loop in `updateDashboard()`.
 *
 * Picks the most recent entry with `prev <= currentSeconds` whose field
 * is not NaN, and the next entry with `next > currentSeconds` whose
 * field is not NaN, and linearly interpolates between them. Returns
 * `null` if either bracketing sample is missing or the segment is
 * degenerate (`startSeconds === endSeconds`).
 *
 * Pure function — exported for unit testing.
 */
export function interpolateTelemetryField(
  entries: readonly TelemetryEntry[],
  currentSeconds: number,
  field: "velocityEarth" | "distanceEarth" | "distanceMoon" | "velocityMoon",
): number | null {
  let prev: TelemetryEntry | null = null;
  let next: TelemetryEntry | null = null;
  for (const entry of entries) {
    if (!Number.isFinite(entry[field])) continue;
    if (entry.startSeconds <= currentSeconds) {
      prev = entry;
    } else {
      next = entry;
      break;
    }
  }
  if (prev === null) return null;
  if (next === null) return prev[field];
  const range = next.startSeconds - prev.startSeconds;
  if (range <= 0) return prev[field];
  const t = (currentSeconds - prev.startSeconds) / range;
  return prev[field] + t * (next[field] - prev[field]);
}

/** Computed display values for a single render pass. */
export interface TelemetryDisplay {
  frame: FrameOfReference;
  velocityFps: number | null;
  velocityMph: number | null;
  velocityKph: number | null;
  velocityMach: number | null;
  distanceNm: number | null;
  distanceKm: number | null;
}

/** Conversion + Mach factor constants pulled from the legacy code. */
const FPS_TO_KPH = 1.09728;
const FPS_TO_MPH = 0.681818;
const FPS_TO_MACH = 0.00088863;
const NM_TO_KM = 1.852;

/**
 * Compute the full display tuple for `currentSeconds`. Pure function —
 * exported for testing.
 */
export function computeTelemetryDisplay(
  data: TelemetryData,
  ranges: readonly FrameOfReferenceRange[],
  currentSeconds: number,
): TelemetryDisplay {
  const frame = frameOfReferenceAt(ranges, currentSeconds);
  const velocityField = frame === "Earth" ? "velocityEarth" : "velocityMoon";
  const distanceField = frame === "Earth" ? "distanceEarth" : "distanceMoon";

  const fps = interpolateTelemetryField(data.entries, currentSeconds, velocityField);
  const nm = interpolateTelemetryField(data.entries, currentSeconds, distanceField);

  return {
    frame,
    velocityFps: fps,
    velocityMph: fps === null ? null : fps * FPS_TO_MPH,
    velocityKph: fps === null ? null : fps * FPS_TO_KPH,
    velocityMach: fps === null ? null : fps * FPS_TO_MACH,
    distanceNm: nm,
    distanceKm: nm === null ? null : nm * NM_TO_KM,
  };
}
