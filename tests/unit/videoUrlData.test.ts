import { describe, it, expect, vi } from "vitest";
import {
  parseVideoUrlData,
  loadVideoUrlData,
  findVideoUrlIndex,
} from "../../src/data/videoUrlData";

describe("parseVideoUrlData", () => {
  it("parses 3-field A13 format", () => {
    const rows = [["-EKHwpNmU-Y", "-35:17:28", "-32:00:00"]];
    const data = parseVideoUrlData(rows);
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]).toEqual({
      videoId: "-EKHwpNmU-Y",
      sdVideoId: "-EKHwpNmU-Y",
      hdVideoId: "-EKHwpNmU-Y",
      startTimeStr: "-35:17:28",
      endTimeStr: "-32:00:00",
      startSeconds: -127048,
      endSeconds: -115200,
    });
  });

  it("parses 4-field A11 format", () => {
    const rows = [["sd11", "hd11", "-24:00:00", "-16:00:00"]];
    const data = parseVideoUrlData(rows);
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]).toEqual({
      videoId: "hd11",
      sdVideoId: "sd11",
      hdVideoId: "hd11",
      startTimeStr: "-24:00:00",
      endTimeStr: "-16:00:00",
      startSeconds: -86400,
      endSeconds: -57600,
    });
  });

  it("parses 4-field A17 format", () => {
    const rows = [["0", "vid17", "-02:37:22", "000:00:00"]];
    const data = parseVideoUrlData(rows);
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]).toEqual({
      videoId: "vid17",
      sdVideoId: "vid17",
      hdVideoId: "vid17",
      startTimeStr: "-02:37:22",
      endTimeStr: "000:00:00",
      startSeconds: -9442,
      endSeconds: 0,
    });
  });
});

describe("findVideoUrlIndex", () => {
  const data = parseVideoUrlData([
    ["vid1", "001:00:00", "002:00:00"],
    ["vid2", "002:00:00", "003:00:00"],
  ]);

  it("returns -1 before the first entry", () => {
    expect(findVideoUrlIndex(data, 0)).toBe(-1);
  });

  it("finds correct index of entry containing seconds", () => {
    expect(findVideoUrlIndex(data, 3600)).toBe(0);
    expect(findVideoUrlIndex(data, 7199)).toBe(0);
    expect(findVideoUrlIndex(data, 7200)).toBe(1);
    expect(findVideoUrlIndex(data, 10799)).toBe(1);
    expect(findVideoUrlIndex(data, 10800)).toBe(-1); // out of end range
  });
});

describe("loadVideoUrlData", () => {
  it("fetches and parses data", async () => {
    const fetchFn = vi.fn((url: string) => {
      expect(url).toBe("/13/indexes/videoURLData.csv");
      return Promise.resolve(new Response("vid|-35:17:28|-32:00:00\n", { status: 200 }));
    });
    const data = await loadVideoUrlData("/13/", {
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.videoId).toBe("vid");
  });
});
