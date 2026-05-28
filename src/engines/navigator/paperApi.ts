/**
 * Minimal structural typings for the subset of the Paper.js API the
 * navigator renderer uses.
 *
 * Paper.js is loaded as a classic `<script>` (it sets `window.paper`) and
 * passed into the renderer by injection — there is no `import paper` and no
 * global reference inside this module. That keeps the renderer dependency-
 * free (per the longevity principle in `docs-plan/00-decisions.md` A2b) and
 * unit-testable with a hand-written mock that satisfies {@link PaperScopeLike}.
 *
 * Only the constructors/members actually exercised by
 * `src/engines/navigator/renderer.ts` are modelled. Expand as the renderer
 * grows (tier-3 scrolling, data overlays) in later phases.
 */

/** A color value accepted by Paper.js item color setters (CSS string or {@link PaperColor}). */
export type PaperColorValue = string | PaperColor;

export interface PaperColor {
  readonly _paperColor: true;
}

export interface PaperPoint {
  x: number;
  y: number;
}

export interface PaperSize {
  width: number;
  height: number;
}

export interface PaperRectangle {
  readonly _paperRectangle: true;
}

/** A path segment. The renderer only reads/sets `handleOut`. */
export interface PaperSegment {
  handleOut: PaperPoint;
}

export interface PaperItem {
  strokeColor: PaperColorValue;
  fillColor: PaperColorValue;
  strokeWidth: number;
  remove(): void;
  scale(hor: number, ver: number): void;
}

export interface PaperPath extends PaperItem {
  readonly segments: PaperSegment[];
}

export interface PaperPointTextBounds {
  readonly width: number;
  readonly height: number;
}

export interface PaperPointText extends PaperItem {
  content: string;
  point: PaperPoint;
  readonly bounds: PaperPointTextBounds;
}

export interface PaperGroup {
  addChild(item: PaperItem): void;
  removeChildren(): void;
  remove(): void;
}

export interface PaperPathOptions {
  segments: [number, number][];
  strokeColor?: PaperColorValue;
  fillColor?: PaperColorValue;
  strokeWidth?: number;
  strokeJoin?: "round" | "miter" | "bevel";
  closed?: boolean;
  opacity?: number;
}

export interface PaperPointTextOptions {
  justification?: "left" | "center" | "right";
  fontWeight?: string;
  fontFamily?: string;
  fontSize?: number;
  fillColor?: PaperColorValue;
}

/** Options for an angle/length point (`new paper.Point({ angle, length })`). */
export interface PaperPolarPointOptions {
  angle: number;
  length: number;
}

export interface PaperPathConstructor {
  new (options: PaperPathOptions): PaperPath;
  Line(from: PaperPoint, to: PaperPoint): PaperPath;
  Rectangle(x: number, y: number, width: number, height: number): PaperPath;
  RoundRectangle(rect: PaperRectangle, cornerSize: PaperSize): PaperPath;
}

export interface PaperMouseEvent {
  point: PaperPoint;
}

export interface PaperView {
  readonly size: PaperSize;
  draw: () => void;
  onResize: (() => void) | null;
  onMouseMove: ((event: PaperMouseEvent) => void) | null;
  onMouseUp: ((event: PaperMouseEvent) => void) | null;
  onMouseLeave: (() => void) | null;
}

/**
 * The injected Paper.js scope. Matches `window.paper` (a `PaperScope` after
 * `paper-full.js` loads) closely enough for the renderer.
 */
export interface PaperScopeLike {
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
}
