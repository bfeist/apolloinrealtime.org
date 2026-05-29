import { describe, it, expect } from "vitest";
import {
  audioFilename,
  audioUrl,
  subChannelId,
  tapeFolderUrl,
  waveformDataUrl,
} from "../../src/panels/mocrviz/urls";

describe("subChannelId", () => {
  it("passes channels 1..30 through unchanged", () => {
    expect(subChannelId(1)).toBe(1);
    expect(subChannelId(14)).toBe(14);
    expect(subChannelId(30)).toBe(30);
  });
  it("subtracts 30 for channels 31..60", () => {
    expect(subChannelId(31)).toBe(1);
    expect(subChannelId(47)).toBe(17);
    expect(subChannelId(60)).toBe(30);
  });
});

describe("audioFilename", () => {
  it("A13 uses DA13_{tape}_{bank}_CH{ch}", () => {
    expect(audioFilename("13", "T920", "HR1U", 14)).toBe("DA13_T920_HR1U_CH14");
    expect(audioFilename("13", "T920", "HR2L", 47)).toBe("DA13_T920_HR2L_CH17");
  });
  it("A11 uses defluttered_A11_{tape}_{bank}_CH{ch}", () => {
    expect(audioFilename("11", "T1", "HR1U", 14)).toBe("defluttered_A11_T1_HR1U_CH14");
  });
});

describe("tapeFolderUrl", () => {
  it("A13 folder", () => {
    expect(tapeFolderUrl("https://m/A13/MOCR_audio/", "13", "T920", "HR1U")).toBe(
      "https://m/A13/MOCR_audio/DA13_T920_HR1U_16khz_mp3_16",
    );
  });
  it("A11 folder", () => {
    expect(tapeFolderUrl("https://m/A11/MOCR_audio", "11", "T868a", "HR1L")).toBe(
      "https://m/A11/MOCR_audio/T868a_defluttered_mp3_16",
    );
  });
});

describe("audioUrl + waveformDataUrl", () => {
  it("A13 mp3 + dat", () => {
    expect(audioUrl("/root", "13", "T1", "HR1U", 14)).toBe(
      "/root/DA13_T1_HR1U_16khz_mp3_16/DA13_T1_HR1U_CH14.mp3",
    );
    expect(waveformDataUrl("/root", "13", "T1", "HR1U", 14)).toBe(
      "/root/DA13_T1_HR1U_16khz_mp3_16/audiowaveform_512/DA13_T1_HR1U_CH14.dat",
    );
  });
  it("A11 mp3 + dat", () => {
    expect(audioUrl("/root/", "11", "T2", "HR2U", 47)).toBe(
      "/root/T2_defluttered_mp3_16/defluttered_A11_T2_HR2U_CH17.mp3",
    );
    expect(waveformDataUrl("/root/", "11", "T2", "HR2U", 47)).toBe(
      "/root/T2_defluttered_mp3_16/audiowaveform_512/defluttered_A11_T2_HR2U_CH17.dat",
    );
  });
});
