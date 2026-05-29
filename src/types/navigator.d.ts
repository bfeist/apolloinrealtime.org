// Navigator + Paper.js structural types — ambient declarations.
// See src/engines/navigator/ for layout, renderer, and Paper.js API modules.

// ── paperApi ──────────────────────────────────────────────────────────────────

/** A color value accepted by Paper.js item color setters (CSS string or {@link PaperColor}). */
type PaperColorValue = string | PaperColor;

interface PaperColor {
  readonly _paperColor: true;
}

interface PaperPoint {
  x: number;
  y: number;
}

interface PaperSize {
  width: number;
  height: number;
}

interface PaperRectangle {
  readonly _paperRectangle: true;
}

/** A path segment. The renderer only reads/sets `handleOut`. */
interface PaperSegment {
  handleOut: PaperPoint;
}

interface PaperItem {
  strokeColor: PaperColorValue;
  fillColor: PaperColorValue;
  strokeWidth: number;
  remove(): void;
  scale(hor: number, ver: number): void;
}

interface PaperPath extends PaperItem {
  readonly segments: PaperSegment[];
}

interface PaperPointTextBounds {
  readonly width: number;
  readonly height: number;
}

interface PaperPointText extends PaperItem {
  content: string;
  point: PaperPoint;
  readonly bounds: PaperPointTextBounds;
}

interface PaperGroup {
  addChild(item: PaperItem): void;
  removeChildren(): void;
  remove(): void;
}

interface PaperPathOptions {
  segments: [number, number][];
  strokeColor?: PaperColorValue;
  fillColor?: PaperColorValue;
  strokeWidth?: number;
  strokeJoin?: "round" | "miter" | "bevel";
  closed?: boolean;
  opacity?: number;
}

interface PaperPointTextOptions {
  justification?: "left" | "center" | "right";
  fontWeight?: string;
  fontFamily?: string;
  fontSize?: number;
  fillColor?: PaperColorValue;
}

/** Options for an angle/length point (`new paper.Point({ angle, length })`). */
interface PaperPolarPointOptions {
  angle: number;
  length: number;
}

interface PaperPathConstructor {
  new (options: PaperPathOptions): PaperPath;
  Line(from: PaperPoint, to: PaperPoint): PaperPath;
  Rectangle(x: number, y: number, width: number, height: number): PaperPath;
  RoundRectangle(rect: PaperRectangle, cornerSize: PaperSize): PaperPath;
}

interface PaperMouseEvent {
  point: PaperPoint;
}

/**
 * A Paper.js Tool — the cross-version API for per-canvas mouse events.
 * `paper.view.onMouseMove/Up/Leave` were added in Paper.js v0.11; older
 * builds (A17 ships v0.9.24) only support mouse events on Tool.
 */
interface PaperTool {
  onMouseMove: ((event: PaperMouseEvent) => void) | null;
  onMouseUp: ((event: PaperMouseEvent) => void) | null;
}

interface PaperView {
  readonly size: PaperSize;
  draw: () => void;
  onResize: (() => void) | null;
}

/**
 * The injected Paper.js scope. Matches `window.paper` (a `PaperScope` after
 * `paper-full.js` loads) closely enough for the renderer.
 */
interface PaperScopeLike {
  setup: (canvas: HTMLCanvasElement | string) => void;
  readonly view: PaperView;
  Group: new () => PaperGroup;
  Point: {
    new (x: number, y: number): PaperPoint;
    new (options: PaperPolarPointOptions): PaperPoint;
  };
  Size: new (width: number, height: number) => PaperSize;
  Color: new (red: number, green: number, blue: number, alpha?: number) => PaperColor;
  Rectangle: new (x: number, y: number, width: number, height: number) => PaperRectangle;
  Path: PaperPathConstructor;
  PointText: new (options: PaperPointTextOptions) => PaperPointText;
  /**
   * Paper.js Tool constructor. Works in both v0.9.x (A17) and v0.11.x
   * (A11/A13). Preferred over `view.onMouseMove` for cross-version compat.
   */
  Tool: new () => PaperTool;
}

// ── layout ────────────────────────────────────────────────────────────────────

interface NavigatorLayoutInput {
  /** Canvas/`paper.view` width in CSS pixels. */
  width: number;
  /** Canvas/`paper.view` height in CSS pixels. */
  height: number;
  /** `cMissionDurationSeconds` from the mission config. */
  missionDurationSeconds: number;
  /** `cCountdownSeconds` from the mission config (pre-launch span). */
  countdownSeconds: number;
  /** `gNavZoomFactor`. Defaults to `DEFAULT_NAV_ZOOM_FACTOR`. */
  zoomFactor?: number;
}

interface TierLayout {
  /** y-coordinate of the tier's top edge in canvas px. */
  top: number;
  /** x-coordinate of the tier's left edge in canvas px. */
  left: number;
  /** Tier width in canvas px. */
  width: number;
  /** Tier height in canvas px. */
  height: number;
  /** Forward mapping: how many canvas px represent one mission-time second. */
  pixelsPerSecond: number;
  /** Inverse mapping: how many mission-time seconds one canvas px represents. */
  secondsPerPixel: number;
}

interface NavigatorLayout {
  width: number;
  height: number;
  zoomFactor: number;
  missionDurationSeconds: number;
  countdownSeconds: number;
  /** Total visible timeline span = countdown + mission, in seconds. */
  totalSpanSeconds: number;
  /** `gFontScaleFactor`: `floor(height * 0.02) - 1`. */
  fontScaleFactor: number;
  /** `gTierSpacing`: vertical gap applied twice (tier1->tier2 and tier2->tier3). */
  tierSpacing: number;
  tier1: TierLayout;
  tier2: TierLayout;
  tier3: TierLayout;
  /** Width in px of the tier 1 zoom-pane indicator (`tier1Width / zoomFactor`). */
  tier1NavBoxWidth: number;
  /** Width in px of the tier 2 zoom-pane indicator (`tier2Width / zoomFactor`). */
  tier2NavBoxWidth: number;
}

type NavigatorTier = 1 | 2 | 3;

interface NavigatorHit {
  tier: NavigatorTier;
  /** Mission-time seconds at the hit point. */
  seconds: number;
}

/** A `(x, y)` pair in navigator-canvas coordinates (same space as `paper.view`). */
interface NavigatorPoint {
  x: number;
  y: number;
}

// ── renderer ──────────────────────────────────────────────────────────────────

/**
 * Optional data overlays passed to {@link NavigatorRendererOptions}.
 * All fields are optional; omitting the whole object leaves the renderer
 * in structural-skeleton-only mode (all existing tests remain unaffected).
 */
interface NavigatorOverlays {
  stages?: MissionStagesData;
  videoSegments?: VideoSegmentsData;
  photos?: PhotoData;
  toc?: TocData;
}

interface NavigatorRendererOptions {
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
  /**
   * Mission data arrays to render as overlays on top of the structural
   * skeleton. When absent the renderer draws tier borders, nav boxes, and
   * cursors only — matching the Phase-4 baseline behavior.
   */
  overlays?: NavigatorOverlays;
}
