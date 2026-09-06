import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { parsePipeCsv } from "../../src/data/csvLoader";
import {
  biometricValueAt,
  loadBiometrics,
  parseBiometrics,
} from "../../src/components/biometrics/data";

describe("biometric recording samples", () => {
  it("rejects malformed data, orders times and resolves duplicate timestamps", () => {
    expect(
      parseBiometrics([
        ["110:01:00", "100"],
        ["110:00:00", "90"],
        ["110:01:00", "101"],
        ["", ""],
        ["Time", "Value"],
        ["110:00:61", "92"],
        ["110:02:00", "bad"],
        ["110:03:00", ""],
        ["110:04:00", "-1"],
      ]),
    ).toEqual([
      { seconds: 396000, value: 90 },
      { seconds: 396060, value: 101 },
    ]);
  });

  it("interpolates to one decimal without extrapolating outside records", () => {
    const samples = [
      { seconds: 100, value: 80 },
      { seconds: 160, value: 90 },
    ];
    expect(biometricValueAt(samples, 120)).toBe(83.3);
    expect(biometricValueAt(samples, 160)).toBe(90);
    expect(biometricValueAt(samples, 99)).toBeNull();
    expect(biometricValueAt(samples, 161)).toBeNull();
    expect(biometricValueAt([], 120)).toBeNull();
    expect(biometricValueAt(samples, NaN)).toBeNull();
  });

  it("does not interpolate through a recording gap longer than an hour", () => {
    const samples = [
      { seconds: 0, value: 80 },
      { seconds: 3601, value: 100 },
    ];
    expect(biometricValueAt(samples, 1800)).toBeNull();
    expect(biometricValueAt(samples, 0)).toBe(80);
    expect(biometricValueAt(samples, 3601)).toBe(100);
    expect(
      biometricValueAt(
        [
          { seconds: 0, value: 80 },
          { seconds: 3600, value: 100 },
        ],
        1800,
      ),
    ).toBe(90);
  });

  it("reads the actual Cernan corpus in mission GET, preserving its recording gaps", () => {
    const rows = parsePipeCsv(readFileSync("public/17/indexes/heartrates_CDR.csv", "utf8"));
    const data = parseBiometrics(rows);
    expect(biometricValueAt(data, 110 * 3600 + 8 * 60 + 50)).toBe(85);
    const gapIndex = data.findIndex(
      (sample, index) => sample.seconds - (data[index - 1]?.seconds ?? sample.seconds) > 3600,
    );
    const before = data[gapIndex - 1];
    const after = data[gapIndex];
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    if (before && after)
      expect(biometricValueAt(data, (before.seconds + after.seconds) / 2)).toBeNull();
  });

  it("retains available streams when a file cannot be fetched", async () => {
    const fetchFn = vi.fn<typeof fetch>((url) =>
      Promise.resolve(
        typeof url === "string" && url.includes("metrates_LMP")
          ? new Response("missing", { status: 404 })
          : new Response("110:00:00|90\n110:01:00|100"),
      ),
    );
    const data = await loadBiometrics("/17/", { fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(4);
    expect(fetchFn.mock.calls.map(([url]) => url)).toContain("/17/indexes/heartrates_CDR.csv");
    expect(data.cdrHeart).toHaveLength(2);
    expect(data.lmpHeart).toHaveLength(2);
    expect(data.cdrMetabolic).toHaveLength(2);
    expect(data.lmpMetabolic).toEqual([]);
    expect(data.unavailableStreams).toBe(1);
  });
});
