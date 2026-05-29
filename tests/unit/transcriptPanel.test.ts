import { describe, it, expect } from "vitest";
import { utteranceItemId, utteranceTypeClass } from "../../src/panels/transcript";

describe("utteranceItemId", () => {
  it("prefixes the timeId with 'uttid' to match the legacy DOM id", () => {
    expect(utteranceItemId("0000000")).toBe("uttid0000000");
    expect(utteranceItemId("-044959")).toBe("uttid-044959");
  });
});

describe("utteranceTypeClass", () => {
  it("returns utt_pao when code is 'P' or speaker is empty", () => {
    expect(utteranceTypeClass("P", "PAO")).toBe("utt_pao");
    expect(utteranceTypeClass("", "")).toBe("utt_pao");
    expect(utteranceTypeClass("X", "")).toBe("utt_pao");
  });

  it("returns utt_capcom for code 'C'", () => {
    expect(utteranceTypeClass("C", "CC")).toBe("utt_capcom");
  });

  it("returns utt_mocr for code 'F'", () => {
    expect(utteranceTypeClass("F", "FLIGHT")).toBe("utt_mocr");
  });

  it("returns utt_crew otherwise", () => {
    expect(utteranceTypeClass("", "CDR")).toBe("utt_crew");
    expect(utteranceTypeClass("Z", "LMP")).toBe("utt_crew");
  });
});
