/**
 * Navigator layout + coordinate math.
 *
 * Extracted from `legacy-src/{11,13,17}/navigator.js` (Phase 4). This module
 * is the pure-math subset of the navigator: tier sizing, pixels-per-second,
 * seconds<->x mapping per tier, and the zoom-pane (nav box) position +
 * derived "start seconds" anchors that feed tier 2 and tier 3.
 *
 * Paper.js rendering, mouse handlers, and the mutable `g*` globals stay in
 * the legacy file for now — they get untangled when the caller itself
 * converts to ESM in Phase 5 (per the wire-up lesson in
 * `/memories/repo/airt2.md`). This module has no Paper.js or DOM dependency
 * and is safe to use from any context.
 *
 * Variable name mapping (legacy -> typed):
 *   gNavZoomFactor           -> NavigatorLayoutInput.zoomFactor (default 25)
 *   gNavigatorWidth/Height   -> NavigatorLayoutInput.width/height
 *   cMissionDurationSeconds  -> NavigatorLayoutInput.missionDurationSeconds
 *   cCountdownSeconds        -> NavigatorLayoutInput.countdownSeconds
 *   gTierNTop/Left/Width/Height/PixelsPerSecond/SecondsPerPixel
 *                            -> NavigatorLayout.tierN.{top,left,width,height,pixelsPerSecond,secondsPerPixel}
 *   gTierSpacing             -> NavigatorLayout.tierSpacing
 *   gFontScaleFactor         -> NavigatorLayout.fontScaleFactor
 *   gTier1/2NavBoxLocX       -> result of computeTier{1,2}NavBoxX(...)
 *   gTier2/3StartSeconds     -> result of tier{2,3}StartSecondsFromNavBoxX(...)
 */

/** Legacy `gNavZoomFactor` default. */
export const DEFAULT_NAV_ZOOM_FACTOR = 25;

/**
 * Compute the full navigator layout from canvas size + mission timing.
 *
 * Mirrors `setDynamicWidthVariables()` in the legacy navigator exactly.
 */
export function computeLayout(input: NavigatorLayoutInput): NavigatorLayout {
  const { width, height, missionDurationSeconds, countdownSeconds } = input;
  const zoomFactor = input.zoomFactor ?? DEFAULT_NAV_ZOOM_FACTOR;

  const totalSpanSeconds = missionDurationSeconds + countdownSeconds;

  const fontScaleFactor = Math.floor(height * 0.02) - 1;
  const tierSpacing = height * 0.05;

  const tier1Height = height * 0.17;
  const tier2Height = height * 0.23;
  const tier3Height = height * 0.5;

  const tier1Top = 1;
  const tier2Top = tier1Height + tierSpacing;
  const tier3Top = tier2Top + tier2Height + tierSpacing;

  const tier1Width = width - width * 0.06;
  const tier2Width = width - width * 0.03;
  const tier3Width = width;

  const tier1Left = (width - tier1Width) / 2;
  const tier2Left = (width - tier2Width) / 2;
  const tier3Left = (width - tier3Width) / 2;

  const tier1PixelsPerSecond = tier1Width / totalSpanSeconds;
  const tier1SecondsPerPixel = totalSpanSeconds / tier1Width;
  const tier2PixelsPerSecond = tier2Width / (totalSpanSeconds / zoomFactor);
  const tier2SecondsPerPixel = totalSpanSeconds / zoomFactor / tier2Width;
  const tier3PixelsPerSecond = tier3Width / (totalSpanSeconds / zoomFactor / zoomFactor);
  const tier3SecondsPerPixel = totalSpanSeconds / zoomFactor / zoomFactor / tier3Width;

  return {
    width,
    height,
    zoomFactor,
    missionDurationSeconds,
    countdownSeconds,
    totalSpanSeconds,
    fontScaleFactor,
    tierSpacing,
    tier1: {
      top: tier1Top,
      left: tier1Left,
      width: tier1Width,
      height: tier1Height,
      pixelsPerSecond: tier1PixelsPerSecond,
      secondsPerPixel: tier1SecondsPerPixel,
    },
    tier2: {
      top: tier2Top,
      left: tier2Left,
      width: tier2Width,
      height: tier2Height,
      pixelsPerSecond: tier2PixelsPerSecond,
      secondsPerPixel: tier2SecondsPerPixel,
    },
    tier3: {
      top: tier3Top,
      left: tier3Left,
      width: tier3Width,
      height: tier3Height,
      pixelsPerSecond: tier3PixelsPerSecond,
      secondsPerPixel: tier3SecondsPerPixel,
    },
    tier1NavBoxWidth: tier1Width / zoomFactor,
    tier2NavBoxWidth: tier2Width / zoomFactor,
  };
}

// ── Tier 1: full-mission axis (anchored at -countdownSeconds) ────────────────

/** `tier1Left + (seconds + countdownSeconds) * tier1PixelsPerSecond`. */
export function tier1SecondsToX(layout: NavigatorLayout, seconds: number): number {
  return layout.tier1.left + (seconds + layout.countdownSeconds) * layout.tier1.pixelsPerSecond;
}

/** Inverse of {@link tier1SecondsToX}. */
export function tier1XToSeconds(layout: NavigatorLayout, x: number): number {
  return (x - layout.tier1.left) * layout.tier1.secondsPerPixel - layout.countdownSeconds;
}

// ── Tier 2: zoom pane 1 (anchored at tier2StartSeconds) ──────────────────────

export function tier2SecondsToX(
  layout: NavigatorLayout,
  seconds: number,
  tier2StartSeconds: number,
): number {
  return layout.tier2.left + (seconds - tier2StartSeconds) * layout.tier2.pixelsPerSecond;
}

export function tier2XToSeconds(
  layout: NavigatorLayout,
  x: number,
  tier2StartSeconds: number,
): number {
  return (x - layout.tier2.left) * layout.tier2.secondsPerPixel + tier2StartSeconds;
}

/**
 * Clamp a mouse-derived seconds value to the visible tier 2 range.
 * Mirrors the inline clamp in the legacy `paper.view.onMouseMove` /
 * `onMouseUp` handlers for tier 2.
 */
export function clampTier2MouseSeconds(
  layout: NavigatorLayout,
  mouseSeconds: number,
  tier2StartSeconds: number,
): number {
  const max = tier2StartSeconds + layout.tier2.width * layout.tier2.secondsPerPixel;
  if (mouseSeconds < tier2StartSeconds) return tier2StartSeconds;
  if (mouseSeconds > max) return max;
  return mouseSeconds;
}

// ── Tier 3: zoom pane 2 (anchored at tier3StartSeconds) ──────────────────────

export function tier3SecondsToX(
  layout: NavigatorLayout,
  seconds: number,
  tier3StartSeconds: number,
): number {
  return layout.tier3.left + (seconds - tier3StartSeconds) * layout.tier3.pixelsPerSecond;
}

export function tier3XToSeconds(
  layout: NavigatorLayout,
  x: number,
  tier3StartSeconds: number,
): number {
  return (x - layout.tier3.left) * layout.tier3.secondsPerPixel + tier3StartSeconds;
}

// ── Nav box positions + derived "start seconds" anchors ──────────────────────

/**
 * Clamped x-coordinate of the tier 1 nav box (the zoom-pane-1 indicator) for
 * a given current mission seconds. Mirrors `drawTier1NavBox()`.
 */
export function computeTier1NavBoxX(layout: NavigatorLayout, currentSeconds: number): number {
  const locX = tier1SecondsToX(layout, currentSeconds);
  const x = locX - layout.tier1NavBoxWidth / 2;
  const min = layout.tier1.left;
  const max = layout.tier1.left + layout.tier1.width - layout.tier1NavBoxWidth;
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

/**
 * Derive `gTier2StartSeconds` from the tier 1 nav box position.
 * Mirrors the assignment in `drawTier1NavBox()`.
 */
export function tier2StartSecondsFromNavBoxX(
  layout: NavigatorLayout,
  tier1NavBoxX: number,
): number {
  return (
    layout.tier1.secondsPerPixel * (tier1NavBoxX - layout.tier1.left) - layout.countdownSeconds
  );
}

/**
 * Clamped x-coordinate of the tier 2 nav box for a given current seconds and
 * the active tier2 anchor. Mirrors `drawTier2NavBox()`.
 */
export function computeTier2NavBoxX(
  layout: NavigatorLayout,
  currentSeconds: number,
  tier2StartSeconds: number,
): number {
  const locX = tier2SecondsToX(layout, currentSeconds, tier2StartSeconds);
  const x = locX - layout.tier2NavBoxWidth / 2;
  const min = layout.tier2.left;
  const max = layout.tier2.left + layout.tier2.width - layout.tier2NavBoxWidth;
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

/**
 * Derive `gTier3StartSeconds` from the tier 2 nav box position.
 * Mirrors the assignment in `drawTier2NavBox()`.
 */
export function tier3StartSecondsFromNavBoxX(
  layout: NavigatorLayout,
  tier2NavBoxX: number,
  tier2StartSeconds: number,
): number {
  return (tier2NavBoxX - layout.tier2.left) * layout.tier2.secondsPerPixel + tier2StartSeconds;
}

// ── Hit-testing: mouse point -> { tier, seconds } ────────────────────────────

/**
 * Decide which tier a y-coordinate falls in using the legacy `onMouseMove`
 * boundary semantics:
 *
 * - `y <  tier1Top + tier1Height + tierSpacing` → tier 1
 * - `y >= tier1Top + tier1Height + tierSpacing` and
 *   `y <  tier2Top + tier2Height + tierSpacing` → tier 2
 * - `y >  tier2Top + tier2Height + tierSpacing` → tier 3
 * - exactly `y == tier2Top + tier2Height + tierSpacing` → `null` (matches the
 *   gap in the legacy `else if` chain in `onMouseMove`)
 */
export function tierForY(layout: NavigatorLayout, y: number): NavigatorTier | null {
  const tier1Bottom = layout.tier1.top + layout.tier1.height + layout.tierSpacing;
  const tier2Bottom = layout.tier2.top + layout.tier2.height + layout.tierSpacing;
  if (y < tier1Bottom) return 1;
  if (y >= tier1Bottom && y < tier2Bottom) return 2;
  if (y > tier2Bottom) return 3;
  return null;
}

/**
 * Hit-test for `paper.view.onMouseMove`. Mirrors the legacy `onMouseMove`
 * handler in `navigator.js`:
 *
 * - tier 1: clamp x to `[-countdownSeconds, missionDurationSeconds]`
 * - tier 2: clamp x to `[tier2StartSeconds, tier2StartSeconds + tier2Width * tier2SecondsPerPixel]`
 * - tier 3: no clamp
 *
 * Returns `null` for y exactly on the tier-2/tier-3 boundary (the legacy
 * handler leaves `mouseXSeconds` undefined in that case).
 */
export function hitTestMouseMove(
  layout: NavigatorLayout,
  point: NavigatorPoint,
  tier2StartSeconds: number,
  tier3StartSeconds: number,
): NavigatorHit | null {
  const tier = tierForY(layout, point.y);
  if (tier === null) return null;
  if (tier === 1) {
    let seconds = tier1XToSeconds(layout, point.x);
    if (seconds < layout.countdownSeconds * -1) seconds = layout.countdownSeconds * -1;
    else if (seconds > layout.missionDurationSeconds) seconds = layout.missionDurationSeconds;
    return { tier: 1, seconds };
  }
  if (tier === 2) {
    const raw = tier2XToSeconds(layout, point.x, tier2StartSeconds);
    return { tier: 2, seconds: clampTier2MouseSeconds(layout, raw, tier2StartSeconds) };
  }
  return { tier: 3, seconds: tier3XToSeconds(layout, point.x, tier3StartSeconds) };
}

/**
 * Hit-test for `paper.view.onMouseUp` (click). Mirrors the legacy `onMouseUp`
 * handler: same tier-1/tier-2 boundary as move, but the third branch is the
 * unconditional `else` (so a y on the tier-2/tier-3 boundary falls through to
 * tier 3). No clamping is applied — the legacy click handler reads the raw
 * seconds for `seekToTime()`.
 */
export function hitTestMouseClick(
  layout: NavigatorLayout,
  point: NavigatorPoint,
  tier2StartSeconds: number,
  tier3StartSeconds: number,
): NavigatorHit {
  const tier1Bottom = layout.tier1.top + layout.tier1.height + layout.tierSpacing;
  const tier2Bottom = layout.tier2.top + layout.tier2.height + layout.tierSpacing;
  if (point.y < tier1Bottom) {
    return { tier: 1, seconds: tier1XToSeconds(layout, point.x) };
  }
  if (point.y < tier2Bottom) {
    return { tier: 2, seconds: tier2XToSeconds(layout, point.x, tier2StartSeconds) };
  }
  return { tier: 3, seconds: tier3XToSeconds(layout, point.x, tier3StartSeconds) };
}
