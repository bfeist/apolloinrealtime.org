import { describe, expect, it } from "vitest";
import {
  activityChunks,
  closestChannelUtterance,
  parseActivity,
  parseChannelTranscript,
  parseWaveform,
  waveformPeak,
} from "../../src/panels/mocrviz/data.js";
import { timelineSeek } from "../../src/panels/mocrviz/timeline.js";
import { channelsFor } from "../../src/panels/mocrviz/channels.js";

describe("historical MOCR data", () => {
  it("reads real-format signed waveform peaks and tape-relative windows", () => {
    const buffer = new ArrayBuffer(24);
    const header = new DataView(buffer);
    [1, 1, 16000, 512, 2].forEach((n, i) => {
      header.setUint32(i * 4, n, true);
    });
    new Int8Array(buffer, 20).set([-64, 96, -32, 48]);
    const wave = parseWaveform(buffer);
    expect(waveformPeak(wave, 0, 0.064)).toEqual([-0.5, 0.75]);
    expect(waveformPeak(wave, 4, 5)).toBeNull();
    expect(() => parseWaveform(buffer.slice(0, 23))).toThrow("Invalid waveform data");
  });
  it("indexes activity from each mission's distinct recording start", () => {
    expect(activityChunks("13", 0, 0)[0]?.filename).toBe("tape_activity_127000-127999.json");
    expect(activityChunks("11", 0, 0)[0]?.filename).toBe("tape_activity_74000-74999.json");
    expect(activityChunks("13", -200000)).toEqual([]);
    expect(parseActivity([[], [14, 50]])).toEqual([[], [14, 50]]);
    expect(() => parseActivity([[61]])).toThrow();
  });
  it("preserves transcript words, sorts GET, and selects last duplicate timestamp", () => {
    const entries = parseChannelTranscript(
      "0000010|Hello | Flight\n-000001|Countdown\n0000010|Roger\ninvalid|Ignored",
    );
    expect(entries.map((e) => e.seconds)).toEqual([-1, 10, 10]);
    expect(entries[1]?.text).toBe("Hello | Flight");
    expect(closestChannelUtterance(entries, 10)).toBe(2);
    expect(closestChannelUtterance(entries, -2)).toBe(-1);
  });
  it("maps the timeline center to current GET and clamps edge seeks", () => {
    expect(timelineSeek(383, 700, 1000)).toBe(1000);
    expect(timelineSeek(-1, 700, 1000)).toBe(820);
    expect(timelineSeek(900, 700, 1000)).toBe(1180);
  });
  it("keeps mission-specific channel roles and excludes unavailable missions", () => {
    expect(channelsFor("11")?.all.find((ch) => ch.id === 16)?.label).not.toBe(
      channelsFor("13")?.all.find((ch) => ch.id === 16)?.label,
    );
    expect(channelsFor("17")).toBeNull();
  });
});
