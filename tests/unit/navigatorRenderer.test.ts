import { describe, it, expect, vi, beforeEach } from "vitest";
import { NavigatorRenderer, NAVIGATOR_COLORS } from "../../src/engines/navigator/renderer";
import { computeLayout, hitTestMouseClick } from "../../src/engines/navigator/layout";

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
  /** The most-recently-created Tool instance (set by `new paper.Tool()`). */
  lastTool: {
    onMouseMove: ((e: PaperMouseEvent) => void) | null;
    onMouseUp: ((e: PaperMouseEvent) => void) | null;
  } | null;
}

/** Build a fake Paper.js scope that records groups + draws. */
function makeFakePaper(width: number, height: number): FakePaper {
  const groups: FakeGroup[] = [];
  let drawCount = 0;
  let lastTool: FakePaper["lastTool"] = null;

  const view = {
    size: { width, height },
    onResize: null as (() => void) | null,
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

  const Tool = function (): FakePaper["lastTool"] {
    const t = {
      onMouseMove: null as ((e: PaperMouseEvent) => void) | null,
      onMouseUp: null as ((e: PaperMouseEvent) => void) | null,
    };
    lastTool = t;
    return t;
  } as unknown as PaperScopeLike["Tool"];

  const paper: FakePaper = {
    groups,
    get drawCount(): number {
      return drawCount;
    },
    get lastTool(): FakePaper["lastTool"] {
      return lastTool;
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
    Tool,
  };
  return paper;
}

const canvasAdd = vi.fn();
const canvasRemove = vi.fn();
const CANVAS = {
  addEventListener: canvasAdd,
  removeEventListener: canvasRemove,
} as unknown as HTMLCanvasElement;

/** Group accessor that throws on out-of-range index (keeps tests strict-safe). */
function groupAt(paper: FakePaper, index: number): FakeGroup {
  const g = paper.groups[index];
  if (!g) throw new Error(`expected paper.groups[${String(index)}] to exist`);
  return g;
}

describe("NavigatorRenderer", () => {
  beforeEach(() => {
    // Reset shared CANVAS mock call history so each test starts clean.
    vi.clearAllMocks();
  });

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
    // Mouse events are on the Tool (cross-version: v0.9.24 + v0.11.x).
    expect(paper.lastTool?.onMouseMove).toBeTypeOf("function");
    expect(paper.lastTool?.onMouseUp).toBeTypeOf("function");
    // Resize is still on the view (supported in all Paper.js versions).
    expect(paper.view.onResize).toBeTypeOf("function");
    // DOM mouseleave is wired to the canvas.
    expect(canvasAdd).toHaveBeenCalledWith("mouseleave", expect.any(Function));
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

    paper.lastTool?.onMouseUp?.({ point });
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
    paper.lastTool?.onMouseMove?.({
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
    expect(paper.lastTool?.onMouseMove).toBeNull();
    expect(paper.lastTool?.onMouseUp).toBeNull();
    expect(paper.view.onResize).toBeNull();
    expect(canvasRemove).toHaveBeenCalledWith("mouseleave", expect.any(Function));
  });

  it("exposes the legacy color palette", () => {
    expect(NAVIGATOR_COLORS.cursor).toBe("red");
    expect(NAVIGATOR_COLORS.zoomPane1Border).toBe("#5E92A6");
  });
});

// ── Overlay tests ──────────────────────────────────────────────────────────────

/** Minimal MissionStagesData covering T-00:35:00 and T+02:30:00. */
function makeStages(): MissionStagesData {
  return {
    stages: [
      {
        timeStr: "-00:35:00",
        seconds: -2100,
        endTimeStr: "000:00:00",
        endSeconds: 0,
        name: "Pre-launch",
        description: "",
      },
      {
        timeStr: "002:30:00",
        seconds: 9000,
        endTimeStr: "010:00:00",
        endSeconds: 36000,
        name: "Earth orbit",
        description: "",
      },
    ],
  };
}

/** Minimal VideoSegmentsData with one regular and one 3D segment. */
function makeVideoSegments(): VideoSegmentsData {
  return {
    segments: [
      {
        startTimeStr: "001:00:00",
        endTimeStr: "002:00:00",
        startSeconds: 3600,
        endSeconds: 7200,
        extra: "",
      },
      {
        startTimeStr: "005:00:00",
        endTimeStr: "006:00:00",
        startSeconds: 18000,
        endSeconds: 21600,
        extra: "3d",
      },
    ],
  };
}

/** Minimal PhotoData with two entries. */
function makePhotos(): PhotoData {
  return {
    entries: [
      {
        timeId: "0010000",
        timeStr: "001:00:00",
        seconds: 3600,
        photoId: "P1",
        filename: "p1.jpg",
        supportingFilename: "",
        description: "",
        credit: "",
      },
      {
        timeId: "0030000",
        timeStr: "003:00:00",
        seconds: 10800,
        photoId: "P2",
        filename: "p2.jpg",
        supportingFilename: "",
        description: "",
        credit: "",
      },
    ],
    timeIds: ["0010000", "0030000"],
    byTimeId: new Map([
      ["0010000", 0],
      ["0030000", 1],
    ]),
  };
}

/** Minimal TocData with one level-1 and one level-2 entry. */
function makeToc(): TocData {
  return {
    entries: [
      { timeId: "0010000", timeStr: "001:00:00", seconds: 3600, level: 1, label: "Launch" },
      { timeId: "0020000", timeStr: "002:00:00", seconds: 7200, level: 2, label: "Orbit" },
    ],
    timeIds: ["0010000", "0020000"],
    byTimeId: new Map([
      ["0010000", 0],
      ["0020000", 1],
    ]),
  };
}

describe("NavigatorRenderer overlay support", () => {
  it("no overlays option: tier1Group has exactly 1 child (border only)", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
    });
    r.mount(CANVAS);
    r.render(0);
    // Tier 1 group should have exactly the border rect — no overlay items.
    expect(groupAt(paper, 0).children).toHaveLength(1);
  });

  it("stages overlay: tier1Group gains children (stage ticks)", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
      overlays: { stages: makeStages() },
    });
    r.mount(CANVAS);
    r.render(0);
    // Tier 1 group: border + at least 1 stage tick (stages within canvas bounds).
    expect(groupAt(paper, 0).children.length).toBeGreaterThan(1);
  });

  it("videoSegments overlay: tier1Group and tier2Group gain children", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
      overlays: { videoSegments: makeVideoSegments() },
    });
    r.mount(CANVAS);
    r.render(0);
    // Tier 1 gets border + video rect(s).
    expect(groupAt(paper, 0).children.length).toBeGreaterThan(1);
    // Tier 2 gets border + any in-viewport video rects + time ticks.
    expect(groupAt(paper, 2).children.length).toBeGreaterThan(1);
  });

  it("photos overlay: tier1Group gains photo tick children", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
      overlays: { photos: makePhotos() },
    });
    r.mount(CANVAS);
    r.render(0);
    // Tier 1: border + photo ticks.
    expect(groupAt(paper, 0).children.length).toBeGreaterThan(1);
  });

  it("toc overlay: tier2Group gains TOC tick children", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
      overlays: { toc: makeToc() },
    });
    r.mount(CANVAS);
    r.render(0);
    // Tier 2 gets border + time ticks + TOC ticks.
    expect(groupAt(paper, 2).children.length).toBeGreaterThan(1);
  });

  it("empty overlays object: tier1Group still has just 1 child", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
      overlays: {},
    });
    r.mount(CANVAS);
    r.render(0);
    // No data arrays passed — overlays present but empty — tier 1 is border only;
    // tier 2 gets border + time ticks (drawn whenever overlays is non-null).
    expect(groupAt(paper, 0).children).toHaveLength(1);
    expect(groupAt(paper, 2).children.length).toBeGreaterThan(1); // time ticks
  });

  it("all overlays combined: tier1Group and tier2Group have more children", () => {
    const paper = makeFakePaper(A13.width, A13.height);
    const r = new NavigatorRenderer(paper, {
      missionDurationSeconds: A13.missionDurationSeconds,
      countdownSeconds: A13.countdownSeconds,
      overlays: {
        stages: makeStages(),
        videoSegments: makeVideoSegments(),
        photos: makePhotos(),
        toc: makeToc(),
      },
    });
    r.mount(CANVAS);
    r.render(0);
    // With all overlays, tier 1 should have: border + stage ticks + video rects + photo ticks
    const tier1Count = groupAt(paper, 0).children.length;
    expect(tier1Count).toBeGreaterThanOrEqual(5); // border + 2 stages + 2 video segs + 2 photo ticks
    // Tier 2 should have: border + time ticks + video rects + photo ticks + TOC ticks + stage data
    const tier2Count = groupAt(paper, 2).children.length;
    expect(tier2Count).toBeGreaterThan(5);
  });

  it("NAVIGATOR_COLORS exposes overlay color constants", () => {
    expect(NAVIGATOR_COLORS.overlayStageStroke).toBe("grey");
    expect(NAVIGATOR_COLORS.overlayPhotoTick).toBe("#00C000");
    expect(NAVIGATOR_COLORS.overlayTocTick).toBe("orange");
    expect(NAVIGATOR_COLORS.overlayVideoFill).toBe("#010047");
    expect(NAVIGATOR_COLORS.overlayVideo3dFill).toBe("#270047");
  });
});
