import { describe, expect, it } from "vitest";
import {
  parseGeoSampleBags,
  parseGeoSampleDetail,
  transcriptBagSegments,
} from "../../src/components/geosamples/data.js";

describe("Apollo 17 transcript geology samples", () => {
  it("parses bag 498 and its returned sample numbers", () => {
    const bags = parseGeoSampleBags([
      ["143:06:02", "DB", "498", "498", "279", "72260`72261`72262`72263`72264"],
    ]);
    expect(bags).toEqual([
      {
        timeId: "1430602",
        timeStr: "143:06:02",
        bagNumber: "498",
        matchText: "498",
        weight: "279",
        samples: ["72260", "72261", "72262", "72263", "72264"],
      },
    ]);
  });

  it("ignores untimed return containers that cannot link to a transcript row", () => {
    expect(parseGeoSampleBags([["", "DB", "108", "", "5.75", "70070`70075"]])).toEqual([]);
  });

  it("links every literal occurrence and supports multiple bags at one GET", () => {
    const bags = parseGeoSampleBags([
      ["168:31:07", "DB", "483", "bag 483", "", "79220"],
      ["168:31:07", "DB", "484", "484", "", "79240"],
    ]);
    const segments = transcriptBagSegments(
      "The first 2 centimeters, bag 483. The next 5 - Ahhh - in 484.",
      bags,
    );
    expect(segments.filter((segment) => segment.bag).map((segment) => segment.text)).toEqual([
      "bag 483",
      "484",
    ]);
  });

  it("normalizes NASA sample metadata and removes the legacy midnight suffix", () => {
    expect(
      parseGeoSampleDetail([
        {
          SAMPLETYPE: "Soil",
          SAMPLESUBTYPE: "Unsieved",
          BAGNUMBER: null,
          STATION: "2",
          ORIGINALWEIGHT: 100.6,
          LANDMARK: null,
          PRISTINITY: 99.6,
          PRISTINITYDATE: "August, 15 2007 00:00:00",
          GENERICDESCRIPTION: "Fines, Unsieved",
        },
      ]),
    ).toEqual({
      sampleType: "Soil",
      sampleSubtype: "Unsieved",
      bagNumber: "",
      station: "2",
      originalWeight: "100.6",
      landmark: "",
      pristinity: "99.6",
      pristinityDate: "August, 15 2007",
      description: "Fines, Unsieved",
    });
  });
});
