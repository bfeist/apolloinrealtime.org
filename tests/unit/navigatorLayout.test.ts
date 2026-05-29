import { describe, it, expect } from "vitest";
import {
  DEFAULT_NAV_ZOOM_FACTOR,
  computeLayout,
  tier1SecondsToX,
  tier1XToSeconds,
  tier2SecondsToX,
  tier2XToSeconds,
  tier3SecondsToX,
  tier3XToSeconds,
  clampTier2MouseSeconds,
  computeTier1NavBoxX,
  computeTier2NavBoxX,
  tier2StartSecondsFromNavBoxX,
  tier3StartSecondsFromNavBoxX,
  tierForY,
  hitTestMouseMove,
  hitTestMouseClick,
} from "../../src/engines/navigator/layout";

function nonNull(hit: NavigatorHit | null): NavigatorHit {
  if (hit === null) throw new Error("expected non-null NavigatorHit");
  return hit;
}

// A13 desktop baseline viewport. Mission timing matches src/missions/13.config.ts.
const A13: NavigatorLayoutInput = {
  width: 1440,
  height: 300,
  missionDurationSeconds: 547200,
  countdownSeconds: 127048,
};

// A11 + A17 are used to confirm the layout math generalizes across all three configs.
const A11: NavigatorLayoutInput = {
  width: 1440,
  height: 300,
  missionDurationSeconds: 713311,
  countdownSeconds: 74768,
};

const A17: NavigatorLayoutInput = {
  width: 1440,
  height: 300,
  missionDurationSeconds: 1100980,
  countdownSeconds: 9442,
};

describe("DEFAULT_NAV_ZOOM_FACTOR", () => {
  it("matches the legacy gNavZoomFactor", () => {
    expect(DEFAULT_NAV_ZOOM_FACTOR).toBe(25);
  });
});

describe("computeLayout", () => {
  it("reproduces setDynamicWidthVariables() for A13 @ 1440x300", () => {
    const L = computeLayout(A13);

    expect(L.zoomFactor).toBe(25);
    expect(L.totalSpanSeconds).toBe(547200 + 127048);

    // height-derived constants
    expect(L.fontScaleFactor).toBe(Math.floor(300 * 0.02) - 1); // 5
    expect(L.tierSpacing).toBe(300 * 0.05); // 15

    // tier heights
    expect(L.tier1.height).toBeCloseTo(300 * 0.17, 10);
    expect(L.tier2.height).toBeCloseTo(300 * 0.23, 10);
    expect(L.tier3.height).toBeCloseTo(300 * 0.5, 10);

    // tier tops chained correctly
    expect(L.tier1.top).toBe(1);
    expect(L.tier2.top).toBeCloseTo(L.tier1.height + L.tierSpacing, 10);
    expect(L.tier3.top).toBeCloseTo(L.tier2.top + L.tier2.height + L.tierSpacing, 10);

    // tier widths
    expect(L.tier1.width).toBeCloseTo(1440 - 1440 * 0.06, 10);
    expect(L.tier2.width).toBeCloseTo(1440 - 1440 * 0.03, 10);
    expect(L.tier3.width).toBe(1440);

    // tier lefts (centered horizontally)
    expect(L.tier1.left).toBeCloseTo((1440 - L.tier1.width) / 2, 10);
    expect(L.tier2.left).toBeCloseTo((1440 - L.tier2.width) / 2, 10);
    expect(L.tier3.left).toBe(0);

    // pixels-per-second / seconds-per-pixel are exact reciprocals
    expect(L.tier1.pixelsPerSecond * L.tier1.secondsPerPixel).toBeCloseTo(1, 12);
    expect(L.tier2.pixelsPerSecond * L.tier2.secondsPerPixel).toBeCloseTo(1, 12);
    expect(L.tier3.pixelsPerSecond * L.tier3.secondsPerPixel).toBeCloseTo(1, 12);

    // Each successive tier is `zoomFactor` times more zoomed-in *per unit width*.
    // Because tier widths differ (0.94w / 0.97w / w), the raw PPS ratio is
    // zoom * (nextTierWidth / prevTierWidth), not exactly zoom.
    expect(L.tier2.pixelsPerSecond / L.tier1.pixelsPerSecond).toBeCloseTo(
      25 * (L.tier2.width / L.tier1.width),
      10,
    );
    expect(L.tier3.pixelsPerSecond / L.tier2.pixelsPerSecond).toBeCloseTo(
      25 * (L.tier3.width / L.tier2.width),
      10,
    );

    // nav box widths = tier width / zoom factor
    expect(L.tier1NavBoxWidth).toBeCloseTo(L.tier1.width / 25, 10);
    expect(L.tier2NavBoxWidth).toBeCloseTo(L.tier2.width / 25, 10);
  });

  it("uses a custom zoomFactor when provided", () => {
    const L = computeLayout({ ...A13, zoomFactor: 10 });
    expect(L.zoomFactor).toBe(10);
    expect(L.tier2.pixelsPerSecond / L.tier1.pixelsPerSecond).toBeCloseTo(
      10 * (L.tier2.width / L.tier1.width),
      10,
    );
    expect(L.tier3.pixelsPerSecond / L.tier2.pixelsPerSecond).toBeCloseTo(
      10 * (L.tier3.width / L.tier2.width),
      10,
    );
    expect(L.tier1NavBoxWidth).toBeCloseTo(L.tier1.width / 10, 10);
  });

  it("handles A11 and A17 mission timings", () => {
    const L11 = computeLayout(A11);
    expect(L11.totalSpanSeconds).toBe(713311 + 74768);
    expect(L11.tier1.pixelsPerSecond).toBeCloseTo(L11.tier1.width / L11.totalSpanSeconds, 12);

    const L17 = computeLayout(A17);
    expect(L17.totalSpanSeconds).toBe(1100980 + 9442);
    expect(L17.tier1.pixelsPerSecond).toBeCloseTo(L17.tier1.width / L17.totalSpanSeconds, 12);
  });
});

describe("tier 1 coord mapping", () => {
  const L = computeLayout(A13);

  it("maps T-countdown (start of countdown) to tier1.left", () => {
    expect(tier1SecondsToX(L, -A13.countdownSeconds)).toBeCloseTo(L.tier1.left, 10);
  });

  it("maps end-of-mission to tier1.left + tier1.width", () => {
    expect(tier1SecondsToX(L, A13.missionDurationSeconds)).toBeCloseTo(
      L.tier1.left + L.tier1.width,
      6,
    );
  });

  it("round-trips seconds -> x -> seconds across the mission span", () => {
    const samples = [-A13.countdownSeconds, -3600, 0, 1, 3600, 100_000, A13.missionDurationSeconds];
    for (const sec of samples) {
      expect(tier1XToSeconds(L, tier1SecondsToX(L, sec))).toBeCloseTo(sec, 6);
    }
  });
});

describe("tier 2 coord mapping", () => {
  const L = computeLayout(A13);
  const t2Start = 0; // arbitrary anchor

  it("maps t2Start to tier2.left", () => {
    expect(tier2SecondsToX(L, t2Start, t2Start)).toBeCloseTo(L.tier2.left, 10);
  });

  it("round-trips seconds -> x -> seconds within the tier 2 window", () => {
    const windowSeconds = L.tier2.width * L.tier2.secondsPerPixel;
    const samples = [t2Start, t2Start + 1, t2Start + windowSeconds / 2, t2Start + windowSeconds];
    for (const sec of samples) {
      expect(tier2XToSeconds(L, tier2SecondsToX(L, sec, t2Start), t2Start)).toBeCloseTo(sec, 6);
    }
  });

  it("clampTier2MouseSeconds snaps below-window to t2Start", () => {
    expect(clampTier2MouseSeconds(L, t2Start - 10_000, t2Start)).toBe(t2Start);
  });

  it("clampTier2MouseSeconds snaps above-window to t2Start + visible span", () => {
    const max = t2Start + L.tier2.width * L.tier2.secondsPerPixel;
    expect(clampTier2MouseSeconds(L, max + 10_000, t2Start)).toBeCloseTo(max, 10);
  });

  it("clampTier2MouseSeconds leaves in-window values unchanged", () => {
    const inWindow = t2Start + L.tier2.width * L.tier2.secondsPerPixel * 0.5;
    expect(clampTier2MouseSeconds(L, inWindow, t2Start)).toBe(inWindow);
  });
});

describe("tier 3 coord mapping", () => {
  const L = computeLayout(A13);
  const t3Start = 50_000;

  it("maps t3Start to tier3.left (0 for A13 @ 1440)", () => {
    expect(tier3SecondsToX(L, t3Start, t3Start)).toBeCloseTo(L.tier3.left, 10);
  });

  it("round-trips seconds -> x -> seconds within the tier 3 window", () => {
    const windowSeconds = L.tier3.width * L.tier3.secondsPerPixel;
    const samples = [t3Start, t3Start + 1, t3Start + windowSeconds];
    for (const sec of samples) {
      expect(tier3XToSeconds(L, tier3SecondsToX(L, sec, t3Start), t3Start)).toBeCloseTo(sec, 6);
    }
  });
});

describe("computeTier1NavBoxX + tier2StartSecondsFromNavBoxX", () => {
  const L = computeLayout(A13);

  it("snaps to the left edge at the start of the countdown", () => {
    expect(computeTier1NavBoxX(L, -A13.countdownSeconds)).toBeCloseTo(L.tier1.left, 10);
  });

  it("snaps to the right edge at end-of-mission", () => {
    const expected = L.tier1.left + L.tier1.width - L.tier1NavBoxWidth;
    expect(computeTier1NavBoxX(L, A13.missionDurationSeconds)).toBeCloseTo(expected, 6);
  });

  it("centers the nav box on the cursor when comfortably mid-mission", () => {
    const sec = 200_000;
    const expected = tier1SecondsToX(L, sec) - L.tier1NavBoxWidth / 2;
    expect(computeTier1NavBoxX(L, sec)).toBeCloseTo(expected, 10);
  });

  it("tier2StartSeconds = -countdownSeconds when nav box is at tier1.left", () => {
    const t2Start = tier2StartSecondsFromNavBoxX(L, L.tier1.left);
    expect(t2Start).toBeCloseTo(-A13.countdownSeconds, 6);
  });

  it("tier2 nav box -> tier2Start chain stays consistent with the current cursor", () => {
    // At a mid-mission second, deriving t2Start from the tier1 nav box and then
    // mapping the same seconds into tier 2 must land inside the tier 2 viewport.
    const sec = 100_000;
    const navX = computeTier1NavBoxX(L, sec);
    const t2Start = tier2StartSecondsFromNavBoxX(L, navX);
    const xInTier2 = tier2SecondsToX(L, sec, t2Start);
    expect(xInTier2).toBeGreaterThanOrEqual(L.tier2.left - 1e-6);
    expect(xInTier2).toBeLessThanOrEqual(L.tier2.left + L.tier2.width + 1e-6);
  });
});

describe("computeTier2NavBoxX + tier3StartSecondsFromNavBoxX", () => {
  const L = computeLayout(A13);

  it("snaps to the tier2 left edge when cursor is at t2Start", () => {
    const t2Start = -1000;
    expect(computeTier2NavBoxX(L, t2Start, t2Start)).toBeCloseTo(L.tier2.left, 10);
  });

  it("snaps to the tier2 right edge when cursor is past the tier2 window", () => {
    const t2Start = 0;
    const farRight = t2Start + L.tier2.width * L.tier2.secondsPerPixel + 10_000;
    const expected = L.tier2.left + L.tier2.width - L.tier2NavBoxWidth;
    expect(computeTier2NavBoxX(L, farRight, t2Start)).toBeCloseTo(expected, 6);
  });

  it("tier3Start = t2Start when tier2 nav box sits at tier2.left", () => {
    const t2Start = 12_345;
    const t3Start = tier3StartSecondsFromNavBoxX(L, L.tier2.left, t2Start);
    expect(t3Start).toBeCloseTo(t2Start, 6);
  });

  it("end-to-end nav chain keeps the cursor inside both tier3 viewport bounds", () => {
    const sec = 250_000;
    const navX1 = computeTier1NavBoxX(L, sec);
    const t2Start = tier2StartSecondsFromNavBoxX(L, navX1);
    const navX2 = computeTier2NavBoxX(L, sec, t2Start);
    const t3Start = tier3StartSecondsFromNavBoxX(L, navX2, t2Start);
    const xInTier3 = tier3SecondsToX(L, sec, t3Start);
    expect(xInTier3).toBeGreaterThanOrEqual(L.tier3.left - 1e-6);
    expect(xInTier3).toBeLessThanOrEqual(L.tier3.left + L.tier3.width + 1e-6);
  });
});

describe("tierForY", () => {
  const L = computeLayout(A13);
  const tier1Bottom = L.tier1.top + L.tier1.height + L.tierSpacing;
  const tier2Bottom = L.tier2.top + L.tier2.height + L.tierSpacing;

  it("returns 1 for y inside tier 1", () => {
    expect(tierForY(L, L.tier1.top)).toBe(1);
    expect(tierForY(L, L.tier1.top + L.tier1.height / 2)).toBe(1);
  });

  it("returns 1 at the tier1 top edge (y=1)", () => {
    expect(tierForY(L, 1)).toBe(1);
  });

  it("returns 2 at exactly tier1Bottom (legacy >= boundary)", () => {
    expect(tierForY(L, tier1Bottom)).toBe(2);
  });

  it("returns 2 anywhere inside the tier 2 band", () => {
    // tier2.top = tier1.height + tierSpacing, which is one less than tier1Bottom
    // (because tier1.top = 1, not 0), so use tier2.top + 1 for "just inside tier 2".
    expect(tierForY(L, L.tier2.top + 1)).toBe(2);
    expect(tierForY(L, L.tier2.top + L.tier2.height / 2)).toBe(2);
  });

  it("returns null at exactly tier2Bottom (legacy gap)", () => {
    expect(tierForY(L, tier2Bottom)).toBeNull();
  });

  it("returns 3 above tier2Bottom", () => {
    expect(tierForY(L, tier2Bottom + 0.001)).toBe(3);
    expect(tierForY(L, L.tier3.top + L.tier3.height / 2)).toBe(3);
    expect(tierForY(L, L.height + 1000)).toBe(3);
  });
});

describe("hitTestMouseMove", () => {
  const L = computeLayout(A13);
  const t2Start = 100_000;
  const t3Start = 110_000;

  it("returns tier 1 with seconds matching tier1XToSeconds inside the bounds", () => {
    const x = L.tier1.left + L.tier1.width / 2;
    const hit = nonNull(hitTestMouseMove(L, { x, y: L.tier1.top + 1 }, t2Start, t3Start));
    expect(hit.tier).toBe(1);
    expect(hit.seconds).toBeCloseTo(tier1XToSeconds(L, x), 6);
  });

  it("clamps tier 1 below to -countdownSeconds", () => {
    const hit = nonNull(hitTestMouseMove(L, { x: L.tier1.left - 5000, y: 5 }, t2Start, t3Start));
    expect(hit.tier).toBe(1);
    expect(hit.seconds).toBe(-L.countdownSeconds);
  });

  it("clamps tier 1 above to missionDurationSeconds", () => {
    const hit = nonNull(
      hitTestMouseMove(L, { x: L.tier1.left + L.tier1.width + 5000, y: 5 }, t2Start, t3Start),
    );
    expect(hit.tier).toBe(1);
    expect(hit.seconds).toBe(L.missionDurationSeconds);
  });

  it("returns tier 2 unclamped when inside the visible range", () => {
    const inside = t2Start + (L.tier2.width * L.tier2.secondsPerPixel) / 2;
    const x = tier2SecondsToX(L, inside, t2Start);
    const y = L.tier2.top + 1;
    const hit = nonNull(hitTestMouseMove(L, { x, y }, t2Start, t3Start));
    expect(hit.tier).toBe(2);
    expect(hit.seconds).toBeCloseTo(inside, 6);
  });

  it("clamps tier 2 below to tier2StartSeconds", () => {
    const y = L.tier2.top + 1;
    const hit = nonNull(hitTestMouseMove(L, { x: L.tier2.left - 1000, y }, t2Start, t3Start));
    expect(hit.tier).toBe(2);
    expect(hit.seconds).toBe(t2Start);
  });

  it("clamps tier 2 above to tier2StartSeconds + tier2Width * tier2SecondsPerPixel", () => {
    const y = L.tier2.top + 1;
    const maxX = L.tier2.left + L.tier2.width + 1000;
    const hit = nonNull(hitTestMouseMove(L, { x: maxX, y }, t2Start, t3Start));
    expect(hit.tier).toBe(2);
    expect(hit.seconds).toBeCloseTo(t2Start + L.tier2.width * L.tier2.secondsPerPixel, 6);
  });

  it("returns tier 3 unclamped", () => {
    const x = L.tier3.left + L.tier3.width / 2;
    const y = L.tier3.top + 1;
    const hit = nonNull(hitTestMouseMove(L, { x, y }, t2Start, t3Start));
    expect(hit.tier).toBe(3);
    expect(hit.seconds).toBeCloseTo(tier3XToSeconds(L, x, t3Start), 6);
  });

  it("returns null at the exact tier2/tier3 boundary (legacy gap)", () => {
    const yBoundary = L.tier2.top + L.tier2.height + L.tierSpacing;
    const hit = hitTestMouseMove(L, { x: L.tier3.left + 10, y: yBoundary }, t2Start, t3Start);
    expect(hit).toBeNull();
  });
});

describe("hitTestMouseClick", () => {
  const L = computeLayout(A13);
  const t2Start = 100_000;
  const t3Start = 110_000;

  it("returns tier 1 with unclamped seconds (legacy onMouseUp does not clamp)", () => {
    const hit = hitTestMouseClick(L, { x: L.tier1.left - 5000, y: 5 }, t2Start, t3Start);
    expect(hit.tier).toBe(1);
    expect(hit.seconds).toBeCloseTo(tier1XToSeconds(L, L.tier1.left - 5000), 6);
    expect(hit.seconds).toBeLessThan(-L.countdownSeconds); // confirms NO clamp
  });

  it("returns tier 2 with unclamped seconds for clicks past the right edge", () => {
    const y = L.tier2.top + 1;
    const x = L.tier2.left + L.tier2.width + 1000;
    const hit = hitTestMouseClick(L, { x, y }, t2Start, t3Start);
    expect(hit.tier).toBe(2);
    expect(hit.seconds).toBeCloseTo(tier2XToSeconds(L, x, t2Start), 6);
  });

  it("falls through to tier 3 at the exact tier2/tier3 boundary (legacy else)", () => {
    const yBoundary = L.tier2.top + L.tier2.height + L.tierSpacing;
    const x = L.tier3.left + 10;
    const hit = hitTestMouseClick(L, { x, y: yBoundary }, t2Start, t3Start);
    expect(hit.tier).toBe(3);
    expect(hit.seconds).toBeCloseTo(tier3XToSeconds(L, x, t3Start), 6);
  });

  it("returns tier 3 for points well below tier 2", () => {
    const x = L.tier3.left + L.tier3.width / 2;
    const y = L.tier3.top + L.tier3.height / 2;
    const hit = hitTestMouseClick(L, { x, y }, t2Start, t3Start);
    expect(hit.tier).toBe(3);
    expect(hit.seconds).toBeCloseTo(tier3XToSeconds(L, x, t3Start), 6);
  });
});
