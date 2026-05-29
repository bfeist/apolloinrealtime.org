import { describe, it, expect, beforeEach } from "vitest";
import { parseTapeRangesData } from "../../src/data/tapeRangesData";
import { MocrvizAudioController, type HtmlAudioLike } from "../../src/panels/mocrviz/audio";

class FakeAudio implements HtmlAudioLike {
  src = "";
  currentTime = 0;
  paused = true;
  duration = 600;
  loadCalls = 0;
  playCalls = 0;
  pauseCalls = 0;
  load(): void {
    this.loadCalls += 1;
    this.currentTime = 0;
  }
  play(): Promise<void> {
    this.playCalls += 1;
    this.paused = false;
    return Promise.resolve();
  }
  pause(): void {
    this.pauseCalls += 1;
    this.paused = true;
  }
}

const TAPES = parseTapeRangesData([
  ["T1", "HR1U", "000:00:00", "001:00:00"], // 0..3600
  ["T2", "HR1L", "001:00:00", "002:00:00"], // 3600..7200
  ["T9", "HR2U", "000:00:00", "001:00:00"], // 0..3600
  ["T999", "HR1U", "002:00:00", "003:00:00"], // sentinel: no audio
]);

function controller(audio: FakeAudio, mission: "11" | "13" = "13", initial = 14) {
  return new MocrvizAudioController(
    {
      mission,
      audioRoot: "/r",
      tapes: TAPES,
      createAudio: () => audio,
      driftToleranceSeconds: 2,
    },
    initial,
  );
}

describe("MocrvizAudioController.tick", () => {
  let audio: FakeAudio;
  beforeEach(() => {
    audio = new FakeAudio();
  });

  it("loads the right tape for the current GET + channel", () => {
    const c = controller(audio);
    c.tick(120, true);
    expect(audio.src).toBe("/r/DA13_T1_HR1U_16khz_mp3_16/DA13_T1_HR1U_CH14.mp3");
    expect(audio.loadCalls).toBe(1);
    expect(c.state().tape?.tapeId).toBe("T1");
  });

  it("reloads when crossing a tape boundary", () => {
    const c = controller(audio);
    c.tick(120, true);
    c.tick(3700, true); // crosses into T2
    expect(audio.loadCalls).toBe(2);
    expect(c.state().tape?.tapeId).toBe("T2");
  });

  it("routes channels > 30 to HR2 tapes", () => {
    const c = controller(audio, "13", 47);
    c.tick(120, true);
    expect(c.state().tape?.tapeId).toBe("T9");
    expect(audio.src).toContain("DA13_T9_HR2U_CH17");
  });

  it("clears src and pauses when there is no tape", () => {
    const c = controller(audio);
    c.tick(120, true);
    expect(audio.src).not.toBe("");
    c.tick(99999, true); // beyond any tape
    expect(audio.src).toBe("");
    expect(c.state().tape).toBeNull();
    expect(audio.paused).toBe(true);
  });

  it("treats T999 as no audio", () => {
    const c = controller(audio);
    c.tick(7300, true); // inside T999 range
    expect(audio.src).toBe("");
    expect(c.state().tape).toBeNull();
  });

  it("seeks when drift exceeds tolerance while playing", () => {
    const c = controller(audio);
    c.tick(0, true); // loads T1, paused → seek to 0, then play
    audio.currentTime = 0;
    audio.paused = false;
    c.tick(100, true); // desired tape offset = 100; drift = 100 > 2 → seek
    expect(audio.currentTime).toBe(100);
  });

  it("does NOT seek while playing if drift within tolerance", () => {
    const c = controller(audio);
    c.tick(0, true);
    audio.paused = false;
    audio.currentTime = 9.5;
    c.tick(10, true); // drift = 0.5 < 2
    expect(audio.currentTime).toBe(9.5);
  });

  it("pauses when parent is not playing", () => {
    const c = controller(audio);
    c.tick(120, true);
    audio.paused = false;
    c.tick(125, false);
    expect(audio.paused).toBe(true);
  });
});

describe("MocrvizAudioController.setChannel", () => {
  it("forces a tape reload on the next tick", () => {
    const audio = new FakeAudio();
    const c = controller(audio, "13", 14);
    c.tick(120, true);
    const calls = audio.loadCalls;
    c.setChannel(15);
    c.tick(120, true);
    expect(audio.loadCalls).toBe(calls + 1);
    expect(audio.src).toContain("CH15");
  });

  it("is a no-op when set to the same channel", () => {
    const audio = new FakeAudio();
    const c = controller(audio, "13", 14);
    c.tick(120, true);
    const calls = audio.loadCalls;
    c.setChannel(14);
    c.tick(120, true);
    expect(audio.loadCalls).toBe(calls);
  });
});
