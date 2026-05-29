/**
 * Telemetry panel.
 *
 * Phase 5 Track C — typed, jQuery-free replacement for the velocity +
 * distance display in legacy `updateDashboard()` (the `dashVelocity`,
 * `dashDistanceEarth`, `frameOfReferenceVelocitySpan`,
 * `frameOfReferenceDistanceSpan` blocks).
 *
 * The dashboard panel composes this one with stage + crew status; the
 * telemetry panel on its own just renders interpolated current velocity
 * and current distance, plus the frame of reference (Earth/Moon) used.
 */

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

/** Options for {@link createTelemetryPanel}. */
export interface TelemetryPanelOptions {
  container: HTMLElement;
  data: TelemetryData;
  /** Frame-of-reference ranges. Mission-specific (A13 has Earth/Moon
   * window around lunar approach; A17 has lunar-orbit windows). */
  frameRanges: readonly FrameOfReferenceRange[];
}

export interface TelemetryPanelHandle {
  /** Re-render at `currentSeconds`. */
  update: (currentSeconds: number) => void;
  destroy: () => void;
}

function fmt(n: number, decimals: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function createTelemetryPanel(options: TelemetryPanelOptions): TelemetryPanelHandle {
  const { container, data, frameRanges } = options;
  container.textContent = "";

  const wrap = document.createElement("div");
  wrap.className = "telemetry_panel";
  wrap.innerHTML = `
    <div class="row">
      <span class="label">Velocity (<span class="frame velocity-frame">--</span>):</span>
      <span class="value velocity-value">--</span>
    </div>
    <div class="row">
      <span class="label">Distance (<span class="frame distance-frame">--</span>):</span>
      <span class="value distance-value">--</span>
    </div>
  `;
  container.appendChild(wrap);

  const velocityFrameEl = wrap.querySelector(".velocity-frame");
  const distanceFrameEl = wrap.querySelector(".distance-frame");
  const velocityValueEl = wrap.querySelector(".velocity-value");
  const distanceValueEl = wrap.querySelector(".distance-value");
  if (
    velocityFrameEl === null ||
    distanceFrameEl === null ||
    velocityValueEl === null ||
    distanceValueEl === null
  ) {
    throw new Error("[panels/telemetry] template not mounted");
  }

  const update = (currentSeconds: number): void => {
    const d = computeTelemetryDisplay(data, frameRanges, currentSeconds);
    velocityFrameEl.textContent = d.frame;
    distanceFrameEl.textContent = d.frame;

    if (d.velocityFps === null) {
      velocityValueEl.textContent = "--";
    } else {
      const dec = d.velocityFps < 100 ? 2 : 1;
      velocityValueEl.textContent =
        `${fmt(d.velocityFps, dec)} fps · ` +
        `${fmt(d.velocityMph ?? 0, dec)} mph · ` +
        `${fmt(d.velocityKph ?? 0, dec)} km/h · ` +
        `Mach ${fmt(d.velocityMach ?? 0, 1)}`;
    }

    if (d.distanceNm === null) {
      distanceValueEl.textContent = "--";
    } else {
      const dec = d.distanceNm < 100 ? 2 : 1;
      distanceValueEl.textContent = `${fmt(d.distanceNm, dec)} nm · ${fmt(d.distanceKm ?? 0, dec)} km`;
    }
  };

  const destroy = (): void => {
    container.textContent = "";
  };

  return { update, destroy };
}
