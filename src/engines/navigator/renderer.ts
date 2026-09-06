/**
 * Three-scale mission navigator. Each zoom window shows the same mission data
 * at a finer time scale: stages, events, media and transcript activity.
 * Paper.js is injected; all datasets and seek callbacks belong to the caller.
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
} from "./layout.js";

/** Color palette, copied verbatim from the legacy `navigator.js` `gColor*` block. */
export const NAVIGATOR_COLORS = {
  tier1BoxStroke: "#507a9b",
  tier2BoxStroke: "#588caf",
  zoomPane1Border: "#5E92A6",
  zoomPane2Border: "#84b8d9",
  cursor: "red",
  navCursor: "#5E92A6",
  // Data overlay colors (legacy `gColorMissionStage*`, `gColorVideoRegion*`, etc.)
  overlayStageStroke: "grey",
  overlayStageText: "lightgrey",
  overlayVideoFill: "#010047",
  overlayVideoStroke: "blue",
  overlayVideo3dFill: "#270047",
  overlayVideo3dStroke: "#4D0062",
  overlayPhotoTick: "#00C000",
  overlayTocTick: "orange",
  overlayTocText: "#999999",
  overlayTimeTick: "#333333",
} as const;

/** Legacy `gHeightVideoRectDenominator`. */
const VIDEO_RECT_HEIGHT_DENOM = 6;
/** Legacy `gHeightPhotoTickDenominator`. */
const PHOTO_TICK_HEIGHT_DENOM = 6;
/** Tier 2 TOC tick height as a fraction: `tier2.height / TOC_TICK_HEIGHT_DENOM`. */
const TOC_TICK_HEIGHT_DENOM = 3;
/** Legacy navigator time marks occur every 30 minutes, starting at launch. */
const TIME_TICK_INTERVAL_SECONDS = 30 * 60;
/** Legacy `gHeightTimeTickDenominator`: a tick spans its whole tier. */
const TIME_TICK_HEIGHT_DENOM = 1;

/** `graphFontFamily` in the legacy file. */
const FONT_FAMILY = "Roboto Mono";
/** `gNaxBoxZoomFadeOpacity`. */
const ZOOM_FADE_OPACITY = 0.2;
/** `gAlphaRectOpacity`. */
const ALPHA_RECT_OPACITY = 0.4;

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
  private hoverPoint: NavigatorPoint | null = null;
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

  /**
   * Paper.js Tool that owns mouse events. `paper.view.onMouseMove/Up/Leave`
   * were only added in Paper.js v0.11; A17 ships v0.9.24 which requires Tool.
   * Using Tool for all missions keeps the code uniform.
   */
  private _tool: PaperTool | null = null;
  // Scope.project/view change on the next mount: cleanup must target our own objects.
  private _project: PaperProject | null = null;
  private _view: PaperView | null = null;
  /** Canvas element stored for removing the DOM `mouseleave` listener. */
  private _canvas: HTMLCanvasElement | null = null;
  /** Stable bound reference so `removeEventListener` matches `addEventListener`. */
  private readonly _onMouseLeave = (): void => {
    this.handleMouseLeave();
  };

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
    this._project = this.paper.project;
    this._view = this.paper.view;
    try {
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
      const tool = new this.paper.Tool();
      tool.onMouseMove = (event): void => {
        this.handleMouseMove(event.point);
      };
      tool.onMouseUp = (event): void => {
        this.handleMouseUp(event.point);
      };
      canvas.addEventListener("mouseleave", this._onMouseLeave);
      this._tool = tool;
      this._canvas = canvas;

      this.mounted = true;
      this.render(this.currentSeconds);
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  /**
   * Redraw everything at `currentSeconds`. Mirrors `redrawAll()`:
   * tier borders → tier-1 nav box → tier-2 nav box → overlays → cursor → `view.draw()`.
   */
  render(currentSeconds: number): void {
    if (!this.mounted) return;
    this.currentSeconds = currentSeconds;
    if (this.hoverPoint) {
      this.handleMouseMove(this.hoverPoint);
      return;
    }
    const layout = this.layout();

    this.drawTierBorders(layout);
    this.tier2StartSeconds = this.drawTier1NavBox(layout, currentSeconds);
    this.tier3StartSeconds = this.drawTier2NavBox(layout, currentSeconds, this.tier2StartSeconds);
    this.drawTierOverlays(layout, this.tier2StartSeconds);
    this.drawCursor(layout, currentSeconds, this.cursorGroup, NAVIGATOR_COLORS.cursor, false);
    this.paper.view.draw();
  }

  /** Release only this renderer's Paper resources, including failed partial mounts. */
  destroy(): void {
    if (!this.mounted && !this._project) return;
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
    if (this._view) this._view.onResize = null;
    if (this._tool) {
      this._tool.onMouseMove = null;
      this._tool.onMouseUp = null;
      this._tool.remove();
      this._tool = null;
    }
    this._canvas?.removeEventListener("mouseleave", this._onMouseLeave);
    this._canvas = null;
    this._project?.remove();
    this._project = null;
    this._view = null;
    this.hoverPoint = null;
    this.mounted = false;
  }

  // ── Interaction ────────────────────────────────────────────────────────

  private handleMouseMove(point: { x: number; y: number }): void {
    if (!this.navCursorGroup) return;
    this.hoverPoint = point;
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

    this.drawTierBorders(layout);
    this.drawTierOverlays(layout, this.tier2StartSeconds);
    this.drawCursor(layout, this.currentSeconds, this.cursorGroup, NAVIGATOR_COLORS.cursor, false);
    this.drawCursor(layout, hit.seconds, this.navCursorGroup, NAVIGATOR_COLORS.navCursor, true);
    this.paper.view.draw();
  }

  private handleMouseUp(point: { x: number; y: number }): void {
    const layout = this.layout();
    if (point.y < 0 || point.y > layout.height) return;
    const hit = hitTestMouseClick(layout, point, this.tier2StartSeconds, this.tier3StartSeconds);
    const seconds = Math.max(
      -layout.countdownSeconds,
      Math.min(layout.missionDurationSeconds, hit.seconds),
    );
    this.hoverPoint = null;
    this.render(seconds);
    this.options.onSeek?.(seconds);
    this.handleMouseLeave();
  }

  private handleMouseLeave(): void {
    this.hoverPoint = null;
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
      Math.max(0, tierLeft + tierWidth - navBoxX - navBoxWidth),
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
        [nextTierLeft + nextTierWidth, nextTierTop],
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
    this.addLine(group, tier1X, layout.tier1.top, layout.tier1.top + layout.tier1.height, color);

    const tier2X = tier2SecondsToX(layout, seconds, this.tier2StartSeconds);
    this.addLine(group, tier2X, layout.tier2.top, layout.tier2.top + layout.tier2.height, color);

    const tier3X = tier3SecondsToX(layout, seconds, this.tier3StartSeconds);
    if (tier3X < layout.tier3.left || tier3X > layout.tier3.left + layout.tier3.width) return;
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

    // Use Paper's true text bounds, as the legacy navigator does. A PointText
    // baseline is not its bounds bottom, so deriving this from `labelY` shifts
    // the plate upward relative to the rendered mission time.
    const labelRect = new this.paper.Rectangle(
      label.bounds.x,
      label.bounds.y,
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

  /** Draw all three levels against their current zoom-window anchors. */
  private drawTierOverlays(layout: NavigatorLayout, tier2StartSeconds: number): void {
    const { overlays } = this.options;
    if (!overlays) return;
    const levels: [PaperGroup | null, TierLayout, number, NavigatorTier][] = [
      [this.tier1Group, layout.tier1, -layout.countdownSeconds, 1],
      [this.tier2Group, layout.tier2, tier2StartSeconds, 2],
      [this.tier3Group, layout.tier3, this.tier3StartSeconds, 3],
    ];
    for (const [group, tier, start, level] of levels) {
      if (!group) continue;
      const end = start + tier.width * tier.secondsPerPixel;
      const bottom = tier.top + tier.height;
      const right = tier.left + tier.width;
      const xFor = (seconds: number): number =>
        tier.left + (seconds - start) * tier.pixelsPerSecond;
      for (const segment of overlays.videoSegments?.segments ?? []) {
        const left = Math.max(tier.left + 1, xFor(segment.startSeconds));
        const segmentRight = Math.min(right - 1, xFor(segment.endSeconds));
        if (segmentRight <= left) continue;
        const height = tier.height / VIDEO_RECT_HEIGHT_DENOM;
        const rect = this.paper.Path.Rectangle(
          left,
          bottom - height,
          segmentRight - left,
          Math.max(1, height - 1),
        );
        rect.fillColor = segment.extra
          ? NAVIGATOR_COLORS.overlayVideo3dFill
          : NAVIGATOR_COLORS.overlayVideoFill;
        rect.strokeColor = segment.extra
          ? NAVIGATOR_COLORS.overlayVideo3dStroke
          : NAVIGATOR_COLORS.overlayVideoStroke;
        group.addChild(rect);
      }
      if (level > 1) this.drawTimeTicks(group, tier, start, end, layout, level);
      for (const stage of overlays.stages?.stages ?? []) {
        if (stage.seconds > end || stage.endSeconds < start) continue;
        const x = Math.max(tier.left + 1, xFor(stage.seconds));
        const rowBottom = tier.top + tier.height / (level === 3 ? 3 : 2);
        if (stage.seconds >= start)
          this.addLine(group, x, tier.top, rowBottom, NAVIGATOR_COLORS.overlayStageStroke);
        const stageRight = Math.min(right - 2, xFor(stage.endSeconds));
        this.addLabel(
          group,
          stage.name,
          x + 2,
          rowBottom - (level === 3 ? 5 : 1),
          (level === 1 ? 7 : level === 2 ? 8 : 10) + layout.fontScaleFactor,
          NAVIGATOR_COLORS.overlayStageText,
          stageRight - x - 4,
        );
      }
      for (const photo of overlays.photos?.entries ?? []) {
        if (photo.seconds < start) continue;
        if (photo.seconds > end) break;
        this.addLine(
          group,
          xFor(photo.seconds),
          bottom - tier.height / PHOTO_TICK_HEIGHT_DENOM,
          bottom,
          NAVIGATOR_COLORS.overlayPhotoTick,
        );
      }
      if (level === 3) {
        for (const utterance of overlays.utterances?.entries ?? []) {
          if (utterance.seconds < start) continue;
          if (utterance.seconds > end) break;
          const isPao = utterance.speaker === "PAO";
          const height = (tier.height / 14) * (isPao ? 1.5 : 1);
          this.addLine(
            group,
            xFor(utterance.seconds),
            bottom - height,
            bottom,
            isPao ? "grey" : utterance.speaker === "CC" ? "lightgrey" : "CadetBlue",
          );
        }
      }
      if (level === 1) continue;
      let eventIndex = 0;
      const labelEnds = [tier.left, tier.left];
      for (const entry of overlays.toc?.entries ?? []) {
        const row = eventIndex++ % 2;
        if (entry.seconds < start || entry.seconds > end) continue;
        const x = xFor(entry.seconds);
        const top =
          level === 2
            ? bottom - tier.height / TOC_TICK_HEIGHT_DENOM
            : tier.top + tier.height / 3 + (row * tier.height) / 4.2;
        const eventBottom = level === 2 ? bottom : top + 12 + layout.fontScaleFactor;
        this.addLine(group, x, top, eventBottom, NAVIGATOR_COLORS.overlayTocTick);
        if (level === 2 && entry.level !== 1) continue;
        if (x < (labelEnds[row] ?? tier.left)) continue;
        labelEnds[row] =
          x +
          2 +
          this.addLabel(
            group,
            entry.label,
            x + 2,
            level === 2 ? top + 2 : eventBottom - 2,
            (level === 2 ? 8 : 10) + layout.fontScaleFactor,
            NAVIGATOR_COLORS.overlayTocText,
            right - x - 4,
          );
      }
    }
  }

  /**
   * Legacy GET-aligned half-hour marks. Tier 2 has marks only; tier 3 adds
   * labels rotated counter-clockwise from their bottom-aligned anchor.
   */
  private drawTimeTicks(
    group: PaperGroup,
    tier: TierLayout,
    start: number,
    end: number,
    layout: NavigatorLayout,
    level: NavigatorTier,
  ): void {
    for (let seconds = 0; seconds <= end; seconds += TIME_TICK_INTERVAL_SECONDS) {
      if (seconds < start) continue;
      const x = tier.left + (seconds - start) * tier.pixelsPerSecond;
      const bottom = tier.top + tier.height;
      this.addLine(
        group,
        x,
        bottom - tier.height / TIME_TICK_HEIGHT_DENOM,
        bottom,
        NAVIGATOR_COLORS.overlayTimeTick,
      );
      if (level !== 3) continue;

      const label = new this.paper.PointText({
        justification: "left",
        fontFamily: FONT_FAMILY,
        fontSize: 9 + layout.fontScaleFactor,
        fillColor: NAVIGATOR_COLORS.overlayTimeTick,
      });
      label.point = { x: x - 2, y: bottom - 5 };
      label.rotate(-90);
      label.content = secondsToTimeStr(seconds);
      group.addChild(label);
    }
  }

  /** Fit labels inside their actual stage or viewport instead of painting beyond it. */
  private addLabel(
    group: PaperGroup,
    content: string,
    x: number,
    y: number,
    fontSize: number,
    color: string,
    availableWidth: number,
  ): number {
    if (availableWidth < fontSize * 2) return 0;
    const text = new this.paper.PointText({
      justification: "left",
      fontFamily: FONT_FAMILY,
      fontSize,
      fillColor: color,
    });
    text.point = { x, y };
    text.content = content;
    if (text.bounds.width > availableWidth) {
      const length = Math.max(
        1,
        Math.floor((content.length * availableWidth) / text.bounds.width) - 1,
      );
      text.content = content.slice(0, length) + "\u2026";
    }
    const background = this.paper.Path.Rectangle(
      x - 1,
      y - text.bounds.height,
      text.bounds.width + 2,
      text.bounds.height + 1,
    );
    background.fillColor = "black";
    group.addChild(background);
    group.addChild(text);
    return text.bounds.width + 8;
  }
}
