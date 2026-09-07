import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePipeCsv } from "../../src/data/csvLoader.js";
import { parseTocData, findClosestTocIndex } from "../../src/data/tocData.js";
import { parseCommentaryData, findClosestCommentaryIndex } from "../../src/data/commentaryData.js";
import { parseUtteranceData, findClosestUtteranceIndex } from "../../src/data/utteranceData.js";
import { parseTelemetryData, findTelemetryIndex } from "../../src/data/telemetryData.js";
import { parseVideoSegmentData, findVideoSegmentIndex } from "../../src/data/videoSegmentData.js";

describe("chronological mission indexes", () => {
  it.each([
    { name: "milestones", parse: parseTocData, find: findClosestTocIndex },
    { name: "commentary", parse: parseCommentaryData, find: findClosestCommentaryIndex },
    { name: "transcript", parse: parseUtteranceData, find: findClosestUtteranceIndex },
  ])("sorts $name and rebuilds matching lookup maps", ({ parse, find }) => {
    const data = parse([["0000020"], ["-000045"], ["0000010"], ["0000010"]]);
    expect(data.entries.map((entry) => entry.seconds)).toEqual([-45, 10, 10, 20]);
    expect(data.timeIds).toEqual(["-000045", "0000010", "0000010", "0000020"]);
    expect(data.byTimeId.get("0000020")).toBe(3);
    expect(data.byTimeId.get("0000010")).toBe(2);
    // All three data shapes share this lookup contract.
    expect(find(data as TocData & CommentaryData & UtteranceData, 15)).toBe(2);
  });

  it("keeps Apollo 17 transcript lookups usable around malformed source timestamps", () => {
    const data = parseUtteranceData([
      ["1715306", "CDR", "Turn around"],
      ["1715252", "LMP", "Okay"],
      ["1715", "CDR", "Incomplete timestamp"],
      ["1715312", "LMP", "Better turn"],
    ]);
    const index = findClosestUtteranceIndex(data, 171 * 3600 + 53 * 60 + 7);
    expect(data.entries[index]?.words).toBe("Turn around");
    expect(data.entries).toHaveLength(3);
  });

  it("normalizes the stray separator in Apollo 13's bored-to-tears milestone", () => {
    const data = parseTocData([["046.4338", "2", "We're bored to tears down here"]]);
    expect(data.entries[0]).toMatchObject({
      timeId: "0464338",
      timeStr: "046:43:38",
      seconds: 46 * 3600 + 43 * 60 + 38,
    });
  });

  it.each(["11", "13", "17"])("sorts the actual Apollo %s milestone data", (mission) => {
    const rows = parsePipeCsv(readFileSync(`public/${mission}/indexes/TOCData.csv`, "utf8"));
    const data = parseTocData(rows);
    for (const entry of data.entries) {
      const index = findClosestTocIndex(data, entry.seconds);
      expect(data.entries[index]?.seconds).toBe(entry.seconds);
    }
  });

  it("backfills Apollo 11 telemetry intervals after ordering their timestamps", () => {
    const data = parseTelemetryData(
      [
        ["000:10:34", "24190"],
        ["000:11:42", "25600"],
        ["000:11:27", "25254"],
        ["000:11:45", "25254"],
      ],
      { missionDurationSeconds: 1000 },
    );
    const entry = data.entries[findTelemetryIndex(data, 700)];
    expect(entry).toMatchObject({
      startTimeStr: "000:11:27",
      endTimeStr: "000:11:42",
      velocityEarth: 25254,
    });
  });

  it("recognizes Apollo 11 footage covered by an earlier overlapping interval", () => {
    const data = parseVideoSegmentData([
      ["102:26:56", "102:27:06"],
      ["102:27:14", "102:27:19"],
      ["102:21:00", "102:27:47"],
    ]);
    const get = 102 * 3600 + 27 * 60 + 30;
    const segment = data.segments[findVideoSegmentIndex(data, get)];
    expect(segment?.startTimeStr).toBe("102:21:00");
    expect(findVideoSegmentIndex(data, get + 17)).toBe(-1);
  });
});
