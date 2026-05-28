/**
 * Paper.js navigator renderer (Phase 4).
 *
 * Draws the structural skeleton of the three-tier navigator on top of the
 * pure math in `./layout.ts`:
 *
 *   - the three tier border rectangles,
 *   - the tier-1 and tier-2 "nav boxes" (zoom-pane indicators) with their
 *     dimming alpha rects and the bezier zoom-fade curves,
 *   - the red playback cursor and the (hover) nav cursor, each with a
 *     rounded time-label in tier 3,
 *   - the `onMouseMove` / `onMouseUp` / `onMouseLeave` interaction wiring,
 *     delegating hit-testing to `hitTestMouseMove` / `hitTestMouseClick`.
 *
 * Mirrors the active drawing code in `legacy-src/{11,13,17}/navigator.js`
 * (`drawTier1NavBox`, `drawTier2NavBox`, `drawCursor`, `drawNavCursor`,
 * `redrawAll`, and the `paper.view.onMouse*` handlers). The data overlays
 * (mission-stage ticks, video-segment rectangles, photo ticks, tier-3
 * scrolling content) depend on mission data arrays that are not yet in the
 * typed pipeline; they are deferred to Phase 5 data wiring.
 *
 * Paper.js is injected as a {@link PaperScopeLike} (see `./paperApi.ts`);
 * this module never references a global `paper` and has no import of the
 * library, per the wire-up lesson in `/memories/repo/airt2.md`.
 */

import { secondsToTimeStr } from "../../shell/clock.js";
import {
  computeLayout,
  computeTier1NavBoxX,
  computeTier2NavBoxX,
  hitTestMouseClick,
  hitTestMouseMove,
  tier1SecondsToX,
  tier2SecondsToX,
  tier2StartSecondsFromNavBoxX,
  tier3SecondsToX,
  tier3StartSecondsFromNavBoxX,
  type NavigatorLayout,
} from "./layout.js";
import type { PaperGroup, PaperScopeLike } from "./paperApi.js";

/** Color palette, copied verbatim from the legacy `navigator.js` `gColor*` block. */
export const NAVIGATOR_COLORS = {
  tier1BoxStroke: "#507a9b",
  tier2BoxStroke: "#588caf",
  zoomPane1Border: "#5E92A6",
  zoomPane2Border: "#84b8d9",
  cursor: "red",
  navCursor: "#5E92A6",
} as const;

/** `graphFontFamily` in the legacy file. */
const FONT_FAMILY = "Roboto Mono";
/** `gNaxBoxZoomFadeOpacity`. */
const ZOOM_FADE_OPACITY = 0.2;
/** `gAlphaRectOpacity`. */
const ALPHA_RECT_OPACITY = 0.4;

export interface NavigatorRendererOptions {
  /** `cMissionDurationSeconds`. */
  missionDurationSeconds: number;
  /** `cCountdownSeconds`. */
  countdownSeconds: number;
  /** `gNavZoomFactor`. Defaults to the layout module default (25). */
  zoomFactor?: number;
  /**
   * Called when the user clicks a tier (legacy `seekToTime`). Receives the
   * target mission-time in seconds. Optional — omit for a read-only display.
   */
  onSeek?: (seconds: number) => void;
}

/**
 * Stateful renderer bound to one `<canvas>` + injected Paper.js scope.
 *
 * Lifecycle: `mount(canvas)` once, then `render(currentSeconds)` whenever the
 * playback clock advances or the view resizes. `destroy()` tears down groups
 * and detaches handlers.
 */
export class NavigatorRenderer {
  private readonly paper: PaperScopeLike;
  private readonly options: NavigatorRendererOptions;

  private mounted = false;
  private currentSeconds = 0;
  /** Derived from the tier-1 nav box; anchors tier 2. (`gTier2StartSeconds`) */
  private tier2StartSeconds = 0;
  /** Derived from the tier-2 nav box; anchors tier 3. (`gTier3StartSeconds`) */
  private tier3StartSeconds = 0;

  private tier1Group: PaperGroup | null = null;
  private tier1NavGroup: PaperGroup | null = null;
  private tier2Group: PaperGroup | null = null;
  private tier2NavGroup: PaperGroup | null = null;
  private tier3Group: PaperGroup | null = null;
  private cursorGroup: PaperGroup | null = null;
  private navCursorGroup: PaperGroup | null = null;

  constructor(paper: PaperScopeLike, options: NavigatorRendererOptions) {
    this.paper = paper;
    this.options = options;
  }

  /** Build the current layout from the live `paper.view` size. */
  private layout(): NavigatorLayout {
    return computeLayout({
      width: this.paper.view.size.width,
      height: this.paper.view.size.height,
      missionDurationSeconds: this.options.missionDurationSeconds,
      countdownSeconds: this.options.countdownSeconds,
      ...(this.options.zoomFactor === undefined ? {} : { zoomFactor: this.options.zoomFactor }),
    });
  }

  /**
   * Set up Paper.js on the canvas, create the draw groups, and attach the
   * mouse/resize handlers. Mirrors `initNavigator()`.
   */
  mount(canvas: HTMLCanvasElement): void {
    if (this.mounted) return;
    this.paper.setup(canvas);

    this.tier1Group = new this.paper.Group();
    this.tier1NavGroup = new this.paper.Group();
    this.tier2Group = new this.paper.Group();
    this.tier2NavGroup = new this.paper.Group();
    this.tier3Group = new this.paper.Group();
    this.cursorGroup = new this.paper.Group();
    this.navCursorGroup = new this.paper.Group();

    this.paper.view.onResize = (): void => {
      this.render(this.currentSeconds);
    };
    this.paper.view.onMouseMove = (event): void => {
      this.handleMouseMove(event.point);
    };
    this.paper.view.onMouseUp = (event): void => {
      this.handleMouseUp(event.point);
    };
    this.paper.view.onMouseLeave = (): void => {
      this.handleMouseLeave();
    };

    this.mounted = true;
    this.render(this.currentSeconds);
  }

  /**
   * Redraw everything at `currentSeconds`. Mirrors `redrawAll()`:
   * tier borders → tier-1 nav box → tier-2 nav box → cursor → `view.draw()`.
   */
  render(currentSeconds: number): void {
    if (!this.mounted) return;
    this.currentSeconds = currentSeconds;
    const layout = this.layout();

    this.drawTierBorders(layout);
    this.tier2StartSeconds = this.drawTier1NavBox(layout, currentSeconds);
    this.tier3StartSeconds = this.drawTier2NavBox(layout, currentSeconds, this.tier2StartSeconds);
    this.drawCursor(layout, currentSeconds, this.cursorGroup, NAVIGATOR_COLORS.cursor, false);
    this.paper.view.draw();
  }

  /** Tear down groups and detach handlers. */
  destroy(): void {
    if (!this.mounted) return;
    for (const group of [
      this.tier1Group,
      this.tier1NavGroup,
      this.tier2Group,
      this.tier2NavGroup,
      this.tier3Group,
      this.cursorGroup,
      this.navCursorGroup,
    ]) {
      group?.remove();
    }
    this.paper.view.onResize = null;
    this.paper.view.onMouseMove = null;
    this.paper.view.onMouseUp = null;
    this.paper.view.onMouseLeave = null;
    this.mounted = false;
  }

  // ── Interaction ────────────────────────────────────────────────────────

  private handleMouseMove(point: { x: number; y: number }): void {
    if (!this.navCursorGroup) return;
    const layout = this.layout();
    this.navCursorGroup.removeChildren();

    const hit = hitTestMouseMove(layout, point, this.tier2StartSeconds, this.tier3StartSeconds);
    if (hit === null) return;

    if (hit.tier === 1) {
      this.tier2StartSeconds = this.drawTier1NavBox(layout, hit.seconds);
      this.tier3StartSeconds = this.drawTier2NavBox(layout, hit.seconds, this.tier2StartSeconds);
    } else if (hit.tier === 2) {
      this.tier3StartSeconds = this.drawTier2NavBox(layout, hit.seconds, this.tier2StartSeconds);
    }

    this.drawCursor(layout, this.currentSeconds, this.cursorGroup, NAVIGATOR_COLORS.cursor, false);
    this.drawCursor(layout, hit.seconds, this.navCursorGroup, NAVIGATOR_COLORS.navCursor, true);
    this.paper.view.draw();
  }

  private handleMouseUp(point: { x: number; y: number }): void {
    const layout = this.layout();
    const hit = hitTestMouseClick(layout, point, this.tier2StartSeconds, this.tier3StartSeconds);
    this.render(hit.seconds);
    this.options.onSeek?.(hit.seconds);
    this.handleMouseLeave();
  }

  private handleMouseLeave(): void {
    this.navCursorGroup?.removeChildren();
    this.render(this.currentSeconds);
  }

  // ── Drawing ────────────────────────────────────────────────────────────

  /** Tier border rectangles. Subset of `drawTier1` / `drawTier2` / `drawTier3`. */
  private drawTierBorders(layout: NavigatorLayout): void {
    const groups: [PaperGroup | null, NavigatorLayout["tier1"], string][] = [
      [this.tier1Group, layout.tier1, NAVIGATOR_COLORS.tier1BoxStroke],
      [this.tier2Group, layout.tier2, NAVIGATOR_COLORS.tier2BoxStroke],
      [this.tier3Group, layout.tier3, NAVIGATOR_COLORS.zoomPane2Border],
    ];
    const cornerSize = new this.paper.Size(2, 2);
    for (const [group, tier, stroke] of groups) {
      if (!group) continue;
      group.removeChildren();
      const rect = new this.paper.Rectangle(tier.left, tier.top, tier.width, tier.height);
      const path = this.paper.Path.RoundRectangle(rect, cornerSize);
      path.strokeColor = stroke;
      group.addChild(path);
    }
  }

  /**
   * Draw the tier-1 nav box (zoom-pane-1 indicator) and return the derived
   * `tier2StartSeconds`. Mirrors `drawTier1NavBox()`.
   */
  private drawTier1NavBox(layout: NavigatorLayout, seconds: number): number {
    const group = this.tier1NavGroup;
    if (!group) return this.tier2StartSeconds;
    group.removeChildren();

    const navBoxX = computeTier1NavBoxX(layout, seconds);
    const navBoxWidth = layout.tier1NavBoxWidth;
    const { top, left, width, height } = layout.tier1;
    const tier2Top = layout.tier2.top;

    this.drawNavBox(
      group,
      navBoxX,
      top,
      navBoxWidth,
      width,
      height,
      left,
      tier2Top,
      layout.tier2.left,
      width,
      NAVIGATOR_COLORS.zoomPane1Border,
    );

    return tier2StartSecondsFromNavBoxX(layout, navBoxX);
  }

  /**
   * Draw the tier-2 nav box and return the derived `tier3StartSeconds`.
   * Mirrors `drawTier2NavBox()`.
   */
  private drawTier2NavBox(
    layout: NavigatorLayout,
    seconds: number,
    tier2StartSeconds: number,
  ): number {
    const group = this.tier2NavGroup;
    if (!group) return this.tier3StartSeconds;
    group.removeChildren();

    const navBoxX = computeTier2NavBoxX(layout, seconds, tier2StartSeconds);
    const navBoxWidth = layout.tier2NavBoxWidth;
    const { top, left, width, height } = layout.tier2;
    const tier3Top = layout.tier3.top;

    this.drawNavBox(
      group,
      navBoxX,
      top,
      navBoxWidth,
      width,
      height,
      left,
      tier3Top,
      layout.tier3.left,
      layout.tier3.width,
      NAVIGATOR_COLORS.zoomPane2Border,
    );

    return tier3StartSecondsFromNavBoxX(layout, navBoxX, tier2StartSeconds);
  }

  /**
   * Shared nav-box geometry: bordered box, dimming alpha rects on each side,
   * the two bezier zoom-fade curves, and the fill polygon under the box.
   * Mirrors the body of `drawTier1NavBox` / `drawTier2NavBox`.
   */
  private drawNavBox(
    group: PaperGroup,
    navBoxX: number,
    tierTop: number,
    navBoxWidth: number,
    tierWidth: number,
    tierHeight: number,
    tierLeft: number,
    nextTierTop: number,
    nextTierLeft: number,
    nextTierWidth: number,
    borderColor: string,
  ): void {
    const cornerSize = new this.paper.Size(2, 2);

    const navBoxRect = new this.paper.Rectangle(navBoxX, tierTop, navBoxWidth, tierHeight);
    const navBoxPath = this.paper.Path.RoundRectangle(navBoxRect, cornerSize);
    navBoxPath.strokeColor = borderColor;
    group.addChild(navBoxPath);

    const leftAlphaRect = new this.paper.Rectangle(
      tierLeft,
      tierTop,
      navBoxX - tierLeft,
      tierHeight,
    );
    const leftAlphaPath = this.paper.Path.RoundRectangle(leftAlphaRect, cornerSize);
    leftAlphaPath.fillColor = new this.paper.Color(0, 0, 0, ALPHA_RECT_OPACITY);
    group.addChild(leftAlphaPath);

    const rightAlphaRect = new this.paper.Rectangle(
      navBoxX + navBoxWidth,
      tierTop,
      tierWidth - navBoxX + navBoxWidth,
      tierHeight,
    );
    const rightAlphaPath = this.paper.Path.RoundRectangle(rightAlphaRect, cornerSize);
    rightAlphaPath.fillColor = new this.paper.Color(0, 0, 0, ALPHA_RECT_OPACITY);
    group.addChild(rightAlphaPath);

    const handleVector = new this.paper.Point({ angle: 90, length: tierHeight });

    const leftCurve = new this.paper.Path({
      segments: [
        [navBoxX, tierTop + tierHeight / 2],
        [nextTierLeft, nextTierTop],
        [navBoxX, nextTierTop],
      ],
      strokeColor: "white",
      strokeWidth: 1,
      strokeJoin: "round",
      fillColor: "white",
      opacity: ZOOM_FADE_OPACITY,
    });
    if (leftCurve.segments[0]) leftCurve.segments[0].handleOut = handleVector;
    group.addChild(leftCurve);

    const rightCurve = new this.paper.Path({
      segments: [
        [navBoxX + navBoxWidth, tierTop + tierHeight / 2],
        [nextTierWidth, nextTierTop],
        [navBoxX + navBoxWidth, nextTierTop],
      ],
      strokeColor: "white",
      strokeWidth: 1,
      strokeJoin: "round",
      fillColor: "white",
      opacity: ZOOM_FADE_OPACITY,
    });
    if (rightCurve.segments[0]) rightCurve.segments[0].handleOut = handleVector;
    group.addChild(rightCurve);

    const fillUnderNavBox = new this.paper.Path({
      segments: [
        [navBoxX + 0.5, tierTop + tierHeight],
        [navBoxX + 0.5, nextTierTop],
        [navBoxX + navBoxWidth - 0.5, nextTierTop],
        [navBoxX + navBoxWidth - 0.5, tierTop + tierHeight],
      ],
      strokeColor: "white",
      closed: true,
      strokeWidth: 1,
      fillColor: "white",
      opacity: ZOOM_FADE_OPACITY,
    });
    group.addChild(fillUnderNavBox);
  }

  /**
   * Draw a three-tier vertical cursor line plus a rounded time label in
   * tier 3. Mirrors `drawCursor()` (playback) and `drawNavCursor()` (hover).
   *
   * When `clampLabel` is true the tier-3 label x is clamped to the canvas
   * width, matching the extra clamp in `drawNavCursor()`.
   */
  private drawCursor(
    layout: NavigatorLayout,
    seconds: number,
    group: PaperGroup | null,
    color: string,
    clampLabel: boolean,
  ): void {
    if (!group) return;
    group.removeChildren();

    const tier1X = tier1SecondsToX(layout, seconds);
    this.addLine(group, tier1X, layout.tier1.top, layout.tier1.height, color);

    const tier2X = tier2SecondsToX(layout, seconds, this.tier2StartSeconds);
    this.addLine(group, tier2X, layout.tier2.top, layout.tier2.top + layout.tier2.height, color);

    const tier3X = tier3SecondsToX(layout, seconds, this.tier3StartSeconds);
    this.addLine(group, tier3X, layout.tier3.top, layout.tier3.top + layout.tier3.height, color);

    const label = new this.paper.PointText({
      justification: "left",
      fontWeight: "bold",
      fontFamily: FONT_FAMILY,
      fontSize: 11 + layout.fontScaleFactor,
      fillColor: color,
    });
    label.content = secondsToTimeStr(seconds);
    let labelX = tier3X - label.bounds.width / 2;
    if (clampLabel) {
      if (labelX < 5) labelX = 5;
      else if (labelX > layout.width - label.bounds.width - 5) {
        labelX = layout.width - label.bounds.width - 5;
      }
    }
    const labelY = layout.tier3.top + 12.5;
    label.point = { x: labelX, y: labelY };

    // Background plate behind the label (legacy passes `timeText.bounds`; we
    // rebuild the equivalent rectangle from the label position + measured size).
    const labelRect = new this.paper.Rectangle(
      labelX,
      labelY - label.bounds.height,
      label.bounds.width,
      label.bounds.height,
    );
    const labelRectPath = this.paper.Path.RoundRectangle(labelRect, new this.paper.Size(3, 3));
    labelRectPath.strokeColor = color;
    labelRectPath.fillColor = "black";
    labelRectPath.scale(1.1, 1.2);
    group.addChild(labelRectPath);
    group.addChild(label);
  }

  /** Vertical line from `(x, top)` to `(x, bottom)`. */
  private addLine(group: PaperGroup, x: number, top: number, bottom: number, color: string): void {
    const line = this.paper.Path.Line({ x, y: top }, { x, y: bottom });
    line.strokeColor = color;
    group.addChild(line);
  }
}
