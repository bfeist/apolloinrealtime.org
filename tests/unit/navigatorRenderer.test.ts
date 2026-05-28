import { describe, it, expect, vi } from "vitest";
import { NavigatorRenderer, NAVIGATOR_COLORS } from "../../src/engines/navigator/renderer";
import {
  computeLayout,
  hitTestMouseClick,
  type NavigatorLayoutInput,
} from "../../src/engines/navigator/layout";
import type {
  PaperGroup,
  PaperPath,
  PaperPointText,
  PaperScopeLike,
} from "../../src/engines/navigator/paperApi";

// A13 desktop baseline. Mission timing matches src/missions/13.config.ts.
const A13: Pick<NavigatorLayoutInput, "missionDurationSeconds" | "countdownSeconds"> & {
  width: number;
  height: number;
} = {
  width: 1440,
  height: 300,
  missionDurationSeconds: 547200,
  countdownSeconds: 127048,
};

/** A recording Paper.js group: tracks how many children it currently holds. */
class FakeGroup implements PaperGroup {
  children: unknown[] = [];
  removed = false;
  addChild(item: unknown): void {
    this.children.push(item);
  }
  removeChildren(): void {
    this.children = [];
  }
  remove(): void {
    this.removed = true;
  }
}

function makeItem(): PaperPath {
  return {
    strokeColor: "",
    fillColor: "",
    strokeWidth: 0,
    segments: [{ handleOut: { x: 0, y: 0 } }, { handleOut: { x: 0, y: 0 } }],
    remove: vi.fn(),
    scale: vi.fn(),
  };
}

function makePointText(): PaperPointText {
  return {
    strokeColor: "",
    fillColor: "",
    strokeWidth: 0,
    content: "",
    point: { x: 0, y: 0 },
    bounds: { width: 40, height: 12 },
    remove: vi.fn(),
    scale: vi.fn(),
  };
}

interface FakePaper extends PaperScopeLike {
  groups: FakeGroup[];
  drawCount: number;
}

/** Build a fake Paper.js scope that records groups + draws. */
function makeFakePaper(width: number, height: number): FakePaper {
  const groups: FakeGroup[] = [];
  let drawCount = 0;

  const view = {
    size: { width, height },
    onResize: null as (() => void) | null,
    onMouseMove: null as ((e: { point: { x: number; y: number } }) => void) | null,
    onMouseUp: null as ((e: { point: { x: number; y: number } }) => void) | null,
    onMouseLeave: null as (() => void) | null,
    draw: (): void => {
      drawCount += 1;
    },
  };

  // Constructor shims: plain functions returned from `new` — JS returns the
  // explicit object when a constructor returns a non-primitive, so `new Group()`
  // returns the FakeGroup even though Group is a plain function.
  const Group = function (): FakeGroup {
    const g = new FakeGroup();
    groups.push(g);
    return g;
  } as unknown as PaperScopeLike["Group"];

  const Point = function (
    a: number | { angle: number; length: number },
    b?: number,
  ): { x: number; y: number } {
    if (typeof a === "number") return { x: a, y: b ?? 0 };
    return { x: 0, y: 0 };
  } as unknown as PaperScopeLike["Point"];

  const Size = function (w: number, h: number): { width: number; height: number } {
    return { width: w, height: h };
  } as unknown as PaperScopeLike["Size"];

  const Color = function (): { _paperColor: true } {
    return { _paperColor: true };
  } as unknown as PaperScopeLike["Color"];

  const Rectangle = function (
    x: number,
    y: number,
    w: number,
    h: number,
  ): { _paperRectangle: true; x: number; y: number; width: number; height: number } {
    return { _paperRectangle: true, x, y, width: w, height: h };
  } as unknown as PaperScopeLike["Rectangle"];

  const PathCtor = Object.assign(
    function (): ReturnType<typeof makeItem> {
      return makeItem();
    },
    {
      Line: (): ReturnType<typeof makeItem> => makeItem(),
      Rectangle: (): ReturnType<typeof makeItem> => makeItem(),
      RoundRectangle: (): ReturnType<typeof makeItem> => makeItem(),
    },
  ) as unknown as PaperScopeLike["Path"];

  const PointText = function (): ReturnType<typeof makePointText> {
    return makePointText();
  } as unknown as PaperScopeLike["PointText"];

  const paper: FakePaper = {
    groups,
    get drawCount(): number {
      return drawCount;
    },
    setup: vi.fn(),
    view,
    Group,
    Point,
    Size,
    Color,
    Rectangle,
    Path: PathCtor,
    PointText,
  };
  return paper;
}

const CANVAS = {} as HTMLCanvasElement;

/** Group accessor that throws on out-of-range index (keeps tests strict-safe). */
function groupAt(paper: FakePaper, index: number): FakeGroup {
  const g = paper.groups[index];
  if (!g) throw new Error(`expected paper.groups[${String(index)}] to exist`);
  return g;
}

describe("NavigatorRenderer", () => {
  it("mount() sets up paper, creates the 7 draw groups, and renders once", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
    });
    r.mount(CANVAS);

    expect(paper.setup).toHaveBeenCalledOnce();
    expect(paper.groups).toHaveLength(7);
    expect(paper.drawCount).toBe(1);
    // Read handlers into locals — avoids @typescript-eslint/unbound-method.
    const { onMouseMove, onMouseUp, onMouseLeave, onResize } = paper.view;
    expect(onMouseMove).toBeTypeOf("function");
    expect(onMouseUp).toBeTypeOf("function");
    expect(onMouseLeave).toBeTypeOf("function");
    expect(onResize).toBeTypeOf("function");
  });

  it("mount() is idempotent", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
    });
    r.mount(CANVAS);
    r.mount(CANVAS);
    expect(paper.setup).toHaveBeenCalledOnce();
    expect(paper.groups).toHaveLength(7);
  });

  it("render() populates tier, nav-box, and cursor groups", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
    });
    r.mount(CANVAS);
    r.render(0);

    // Every group has at least one child after a render (tiers + nav boxes + cursor).
    expect(groupAt(paper, 0).children.length).toBeGreaterThan(0); // tier1
    expect(groupAt(paper, 1).children.length).toBeGreaterThan(0); // tier1 nav
    expect(groupAt(paper, 2).children.length).toBeGreaterThan(0); // tier2
    expect(groupAt(paper, 3).children.length).toBeGreaterThan(0); // tier2 nav
    expect(groupAt(paper, 4).children.length).toBeGreaterThan(0); // tier3
    expect(groupAt(paper, 5).children.length).toBeGreaterThan(0); // cursor
  });

  it("render() before mount() is a no-op", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
    });
    r.render(100);
    expect(paper.drawCount).toBe(0);
    expect(paper.groups).toHaveLength(0);
  });

  it("clicking tier 1 calls onSeek with the hit-tested seconds", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const onSeek = vi.fn();
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
      onSeek,
    });
    r.mount(CANVAS);

    const layout = computeLayout(A13);
    const point = { x: layout.tier1.left + layout.tier1.width / 2, y: layout.tier1.top + 1 };
    const expected = hitTestMouseClick(layout, point, 0, 0);

    paper.view.onMouseUp?.({ point });
    expect(onSeek).toHaveBeenCalledOnce();
    expect(onSeek).toHaveBeenCalledWith(expected.seconds);
  });

  it("mouse move in tier 1 draws the nav cursor", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
    });
    r.mount(CANVAS);

    const layout = computeLayout(A13);
    const navCursor = groupAt(paper, 6);
    expect(navCursor.children.length).toBe(0);
    paper.view.onMouseMove?.({
      point: { x: layout.tier1.left + 50, y: layout.tier1.top + 1 },
    });
    expect(navCursor.children.length).toBeGreaterThan(0);
  });

  it("destroy() removes groups and detaches handlers", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
    });
    r.mount(CANVAS);
    r.destroy();
    expect(paper.groups.every((g) => g.removed)).toBe(true);
    expect(paper.view.onMouseMove).toBeNull();
    expect(paper.view.onMouseUp).toBeNull();
    expect(paper.view.onMouseLeave).toBeNull();
    expect(paper.view.onResize).toBeNull();
  });

  it("exposes the legacy color palette", () => {
    expect(NAVIGATOR_COLORS.cursor).toBe("red");
    expect(NAVIGATOR_COLORS.zoomPane1Border).toBe("#5E92A6");
  });
});
