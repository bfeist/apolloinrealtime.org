import { describe, it, expect } from "vitest";
import {
  padZeros,
  secondsToTimeStr,
  secondsToTimeId,
  timeIdToSeconds,
  timeIdToTimeStr,
  timeStrToTimeId,
  timeStrToSeconds,
} from "../../src/shell/clock";

describe("padZeros", () => {
  it("pads small numbers", () => {
    expect(padZeros(0, 3)).toBe("000");
    expect(padZeros(7, 2)).toBe("07");
    expect(padZeros(42, 3)).toBe("042");
  });

  it("does not truncate numbers larger than width", () => {
    expect(padZeros(123, 2)).toBe("123");
    expect(padZeros(1000, 3)).toBe("1000");
  });
});

describe("secondsToTimeStr", () => {
  it("formats T-0", () => {
    expect(secondsToTimeStr(0)).toBe("000:00:00");
  });

  it("formats positive seconds", () => {
    expect(secondsToTimeStr(1)).toBe("000:00:01");
    expect(secondsToTimeStr(59)).toBe("000:00:59");
    expect(secondsToTimeStr(60)).toBe("000:01:00");
    expect(secondsToTimeStr(3599)).toBe("000:59:59");
    expect(secondsToTimeStr(3600)).toBe("001:00:00");
  });

  it("formats hours above 99 with three-digit field", () => {
    expect(secondsToTimeStr(100 * 3600)).toBe("100:00:00");
    expect(secondsToTimeStr(199 * 3600 + 59 * 60 + 59)).toBe("199:59:59");
  });

  it("formats negative seconds with leading minus replacing the hundreds digit", () => {
    expect(secondsToTimeStr(-1)).toBe("-00:00:01");
    expect(secondsToTimeStr(-60)).toBe("-00:01:00");
    expect(secondsToTimeStr(-3600)).toBe("-01:00:00");
    expect(secondsToTimeStr(-(5 * 3600 + 23 * 60 + 9))).toBe("-05:23:09");
  });

  it("truncates fractional seconds toward zero", () => {
    expect(secondsToTimeStr(1.9)).toBe("000:00:01");
    expect(secondsToTimeStr(-1.9)).toBe("-00:00:01");
  });
});

describe("timeStrToSeconds", () => {
  it("parses T-0", () => {
    expect(timeStrToSeconds("000:00:00")).toBe(0);
  });

  it("parses positive timeStr", () => {
    expect(timeStrToSeconds("000:00:01")).toBe(1);
    expect(timeStrToSeconds("001:00:00")).toBe(3600);
    expect(timeStrToSeconds("100:00:00")).toBe(360000);
    expect(timeStrToSeconds("199:59:59")).toBe(199 * 3600 + 59 * 60 + 59);
  });

  it("parses negative timeStr", () => {
    expect(timeStrToSeconds("-00:00:01")).toBe(-1);
    expect(timeStrToSeconds("-05:23:09")).toBe(-(5 * 3600 + 23 * 60 + 9));
  });
});

describe("secondsToTimeStr <-> timeStrToSeconds round-trip", () => {
  const samples = [
    0,
    1,
    59,
    60,
    3599,
    3600,
    86399,
    100 * 3600,
    195 * 3600 + 18 * 60 + 35,
    -1,
    -60,
    -3600,
    -(5 * 3600 + 23 * 60 + 9),
    -(28 * 3600 + 19 * 60 + 44),
  ];

  for (const s of samples) {
    it(`round-trips ${String(s)}s`, () => {
      expect(timeStrToSeconds(secondsToTimeStr(s))).toBe(s);
    });
  }
});

describe("timeId <-> timeStr", () => {
  it("strips and re-adds colons", () => {
    expect(timeStrToTimeId("050:23:09")).toBe("0502309");
    expect(timeIdToTimeStr("0502309")).toBe("050:23:09");
    expect(timeStrToTimeId("-05:23:09")).toBe("-052309");
    expect(timeIdToTimeStr("-052309")).toBe("-05:23:09");
  });

  it("round-trips through timeId", () => {
    const samples = ["000:00:00", "001:23:45", "100:00:00", "-05:23:09"];
    for (const s of samples) {
      expect(timeIdToTimeStr(timeStrToTimeId(s))).toBe(s);
    }
  });
});

describe("secondsToTimeId / timeIdToSeconds", () => {
  it("derives timeId from seconds", () => {
    expect(secondsToTimeId(0)).toBe("0000000");
    expect(secondsToTimeId(3600)).toBe("0010000");
    expect(secondsToTimeId(195 * 3600 + 18 * 60 + 35)).toBe("1951835");
    expect(secondsToTimeId(-(5 * 3600 + 23 * 60 + 9))).toBe("-052309");
  });

  it("round-trips seconds -> timeId -> seconds", () => {
    const samples = [
      0,
      1,
      3600,
      100 * 3600,
      195 * 3600 + 18 * 60 + 35,
      -1,
      -3600,
      -(5 * 3600 + 23 * 60 + 9),
    ];
    for (const s of samples) {
      expect(timeIdToSeconds(secondsToTimeId(s))).toBe(s);
    }
  });
});
