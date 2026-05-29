import { describe, it, expect } from "vitest";
import { commentaryItemId, defaultAttribution } from "../../src/panels/commentary";

describe("commentaryItemId", () => {
  it("prefixes the timeId with 'comid' to match the legacy DOM id", () => {
    expect(commentaryItemId("0000000")).toBe("comid0000000");
    expect(commentaryItemId("-351728")).toBe("comid-351728");
  });
});

describe("defaultAttribution", () => {
  const base = {
    timeId: "0000000",
    timeStr: "000:00:00",
    seconds: 0,
    speaker: "CDR",
    text: "Roger.",
  } as const;

  it("returns empty string when source is empty", () => {
    expect(defaultAttribution({ ...base, source: "" })).toBe("");
  });

  it("wraps non-empty source in parens", () => {
    expect(defaultAttribution({ ...base, source: "AFJ" })).toBe("(AFJ)");
    expect(defaultAttribution({ ...base, source: "ALSJ" })).toBe("(ALSJ)");
  });
});
