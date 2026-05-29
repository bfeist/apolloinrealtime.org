import { describe, it, expect } from "vitest";
import { groupTocEntries, tocItemId } from "../../src/panels/toc";
import { parseTocData } from "../../src/data/tocData";

const SAMPLE_ROWS: string[][] = [
  ["-351728", "1", "Countdown"],
  ["-230405", "2", "Press conference (audio)"],
  ["-041958", "2", "Crew eating breakfast"],
  ["0000000", "1", "Launch"],
  ["0000043", "2", "Mode 1B"],
  ["0000200", "2", "Mode 1C"],
  ["0002524", "1", "Firing room speeches"],
];

describe("groupTocEntries", () => {
  it("returns [] for empty input", () => {
    expect(groupTocEntries([])).toEqual([]);
  });

  it("groups consecutive entries by level, in file order", () => {
    const toc = parseTocData(SAMPLE_ROWS);
    const groups = groupTocEntries(toc.entries);
    expect(groups.map((g) => ({ level: g.level, n: g.items.length }))).toEqual([
      { level: 1, n: 1 },
      { level: 2, n: 2 },
      { level: 1, n: 1 },
      { level: 2, n: 2 },
      { level: 1, n: 1 },
    ]);
    expect(groups[0]?.items[0]?.label).toBe("Countdown");
    expect(groups[1]?.items[1]?.label).toBe("Crew eating breakfast");
    expect(groups[3]?.items[0]?.label).toBe("Mode 1B");
    expect(groups[4]?.items[0]?.label).toBe("Firing room speeches");
  });

  it("collapses runs of the same level into a single group", () => {
    const all2 = parseTocData([
      ["0000000", "2", "a"],
      ["0000001", "2", "b"],
      ["0000002", "2", "c"],
    ]);
    const groups = groupTocEntries(all2.entries);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.level).toBe(2);
    expect(groups[0]?.items).toHaveLength(3);
  });
});

describe("tocItemId", () => {
  it("prefixes the timeId with 'tocid' to match the legacy DOM id", () => {
    expect(tocItemId("0000000")).toBe("tocid0000000");
    expect(tocItemId("-351728")).toBe("tocid-351728");
  });
});
