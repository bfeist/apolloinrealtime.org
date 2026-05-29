import { describe, it, expect } from "vitest";
import {
  computeTelemetryDisplay,
  frameOfReferenceAt,
  interpolateTelemetryField,
} from "../../src/panels/telemetry";

const entries: TelemetryEntry[] = [
  {
    startTimeStr: "000:00:00",
    startSeconds: 0,
    velocityEarth: 0,
    distanceEarth: 0,
    distanceMoon: 200000,
    velocityMoon: 3000,
    endTimeStr: "001:00:00",
    endSeconds: 3600,
  },
  {
    startTimeStr: "001:00:00",
    startSeconds: 3600,
    velocityEarth: 100,
    distanceEarth: 1000,
    distanceMoon: 199000,
    velocityMoon: 3100,
    endTimeStr: "002:00:00",
    endSeconds: 7200,
  },
  {
    startTimeStr: "002:00:00",
    startSeconds: 7200,
    velocityEarth: 200,
    distanceEarth: 2000,
    distanceMoon: 198000,
    velocityMoon: 3200,
    endTimeStr: "003:00:00",
    endSeconds: 10800,
  },
];

describe("interpolateTelemetryField", () => {
  it("returns the exact value at a sample point", () => {
    expect(interpolateTelemetryField(entries, 3600, "velocityEarth")).toBe(100);
    expect(interpolateTelemetryField(entries, 7200, "distanceEarth")).toBe(2000);
  });

  it("linearly interpolates between samples", () => {
    // midway between t=0 (v=0) and t=3600 (v=100) -> 50
    expect(interpolateTelemetryField(entries, 1800, "velocityEarth")).toBe(50);
    // 1/4 of the way -> 25
    expect(interpolateTelemetryField(entries, 900, "velocityEarth")).toBe(25);
  });

  it("returns the last available value past the final sample", () => {
    expect(interpolateTelemetryField(entries, 9999, "velocityEarth")).toBe(200);
  });

  it("returns null when no preceding sample exists", () => {
    expect(interpolateTelemetryField(entries, -1, "velocityEarth")).toBeNull();
  });
});

describe("frameOfReferenceAt", () => {
  const ranges = [
    { startSeconds: 0, endSeconds: 1000, frame: "Earth" as const },
    { startSeconds: 1000, endSeconds: 2000, frame: "Moon" as const },
  ];

  it("returns the matching frame inside a range", () => {
    expect(frameOfReferenceAt(ranges, 500)).toBe("Earth");
    expect(frameOfReferenceAt(ranges, 1000)).toBe("Moon");
    expect(frameOfReferenceAt(ranges, 1999)).toBe("Moon");
  });

  it("defaults to Earth outside all ranges", () => {
    expect(frameOfReferenceAt(ranges, -1)).toBe("Earth");
    expect(frameOfReferenceAt(ranges, 5000)).toBe("Earth");
    expect(frameOfReferenceAt([], 0)).toBe("Earth");
  });
});

describe("computeTelemetryDisplay", () => {
  it("returns Earth velocity + distance with conversions", () => {
    const d = computeTelemetryDisplay(
      { entries },
      [{ startSeconds: 0, endSeconds: 10800, frame: "Earth" }],
      3600,
    );
    expect(d.frame).toBe("Earth");
    expect(d.velocityFps).toBe(100);
    expect(d.velocityMph).toBeCloseTo(68.1818, 3);
    expect(d.velocityKph).toBeCloseTo(109.728, 3);
    expect(d.distanceNm).toBe(1000);
    expect(d.distanceKm).toBeCloseTo(1852, 3);
  });

  it("switches to Moon-frame fields inside a Moon range", () => {
    const d = computeTelemetryDisplay(
      { entries },
      [{ startSeconds: 0, endSeconds: 10800, frame: "Moon" }],
      3600,
    );
    expect(d.frame).toBe("Moon");
    expect(d.velocityFps).toBe(3100);
    expect(d.distanceNm).toBe(199000);
  });
});
