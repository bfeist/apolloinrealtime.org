import { describe, it, expect } from "vitest";
import { parseTapeRangesData, findTapeForGet } from "../../src/data/tapeRangesData";

describe("parseTapeRangesData", () => {
  it("splits HR1/HR2 by channelBank, sorts by start, parses seconds", () => {
    const rows: string[][] = [
      ["T920", "HR1U", "000:00:00", "002:00:00"],
      ["T921", "HR1L", "002:00:00", "004:00:00"],
      ["T101", "HR2U", "000:00:00", "002:00:00"],
      ["T100", "HR2U", "-00:05:00", "000:00:00"],
    ];
    const out = parseTapeRangesData(rows);
    expect(out.hr1.map((t) => t.tapeId)).toEqual(["T920", "T921"]);
    expect(out.hr2.map((t) => t.tapeId)).toEqual(["T100", "T101"]);
    expect(out.hr1[0]?.startSeconds).toBe(0);
    expect(out.hr1[1]?.startSeconds).toBe(7200);
    expect(out.hr2[0]?.startSeconds).toBe(-300);
  });

  it("retains T999 rows (sentinel skipped by the audio controller, not the parser)", () => {
    const rows: string[][] = [["T999", "HR1U", "000:00:00", "000:30:00"]];
    const out = parseTapeRangesData(rows);
    expect(out.hr1).toHaveLength(1);
    expect(out.hr1[0]?.tapeId).toBe("T999");
  });

  it("skips malformed rows", () => {
    const rows: string[][] = [
      ["", "HR1U", "000:00:00", "000:30:00"],
      ["T1", "BOGUS", "000:00:00", "000:30:00"],
      ["T2", "HR1U", "000:00:00", "000:30:00"],
    ];
    const out = parseTapeRangesData(rows);
    expect(out.hr1.map((t) => t.tapeId)).toEqual(["T2"]);
    expect(out.hr2).toHaveLength(0);
  });
});

describe("findTapeForGet", () => {
  const data = parseTapeRangesData([
    ["T1", "HR1U", "000:00:00", "001:00:00"],
    ["T2", "HR1L", "001:00:00", "002:00:00"],
    ["T3", "HR2U", "000:30:00", "001:30:00"],
  ]);

  it("routes channel 1..30 to HR1 and 31..60 to HR2", () => {
    expect(findTapeForGet(data, 14, 1800)?.tapeId).toBe("T1");
    expect(findTapeForGet(data, 47, 3600)?.tapeId).toBe("T3");
  });

  it("inclusive of start and end seconds", () => {
    expect(findTapeForGet(data, 1, 0)?.tapeId).toBe("T1");
    expect(findTapeForGet(data, 1, 3600)?.tapeId).toBe("T1");
  });

  it("returns null when no tape covers the time", () => {
    expect(findTapeForGet(data, 14, -10)).toBeNull();
    expect(findTapeForGet(data, 47, 0)).toBeNull();
  });
});
