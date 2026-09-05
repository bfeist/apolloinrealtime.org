import { describe, it, expect } from "vitest";
import { a11Config } from "../../src/missions/11.config";
import { a13Config } from "../../src/missions/13.config";
import { a17Config } from "../../src/missions/17.config";
import {
  displaySpeakerLabel,
  utteranceItemId,
  utteranceTypeClass,
} from "../../src/panels/transcript";

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

describe("displaySpeakerLabel", () => {
  it("uses each mission's crew names for legacy role codes", () => {
    expect(displaySpeakerLabel("CDR", a11Config.speakerLabels)).toBe("Armstrong");
    expect(displaySpeakerLabel("CMP", a11Config.speakerLabels)).toBe("Collins");
    expect(displaySpeakerLabel("LMP", a11Config.speakerLabels)).toBe("Aldrin");

    expect(displaySpeakerLabel("CDR", a13Config.speakerLabels)).toBe("Lovell");
    expect(displaySpeakerLabel("CMP", a13Config.speakerLabels)).toBe("Swigert");
    expect(displaySpeakerLabel("LMP", a13Config.speakerLabels)).toBe("Haise");

    expect(displaySpeakerLabel("CDR", a17Config.speakerLabels)).toBe("Cernan");
    expect(displaySpeakerLabel("CMP", a17Config.speakerLabels)).toBe("Evans");
    expect(displaySpeakerLabel("LMP", a17Config.speakerLabels)).toBe("Schmitt");
  });

  it("expands public-affairs and mission-control codes without corrupting longer labels", () => {
    expect(displaySpeakerLabel("PAO", a17Config.speakerLabels)).toBe("Public Affairs");
    expect(displaySpeakerLabel("CC", a17Config.speakerLabels)).toBe("Mission Control");
    expect(displaySpeakerLabel("CMP-CM", a17Config.speakerLabels)).toBe("Evans-CM");
    expect(displaySpeakerLabel("MCC-H", a17Config.speakerLabels)).toBe("MCC-H");
  });
});
