import { describe, expect, it } from "vitest";
import {
  parseSampleCollections,
  parseSamplePhotos,
  parseSamplePublications,
  sampleCatalogLinks,
  samplePhotoUrls,
} from "../../src/components/samples/data.js";

describe("Apollo 11 sample indexes", () => {
  it("keeps unrecorded collection times distinct from launch", () => {
    const rows = parseSampleCollections([
      ["109:34:00", "", "Contingency Bag", "", "", "10010`10021`10010"],
      ["", "", "Bio Residue", "", "", "10008`10054`10092"],
      ["", "", "", "", "", ""],
    ]);
    expect(rows).toEqual([
      { name: "Contingency Bag", seconds: 394440, samples: ["10010", "10021"] },
      { name: "Bio Residue", seconds: null, samples: ["10008", "10054", "10092"] },
    ]);
  });
  it("resolves catalog documents through the applicable-sample column", () => {
    const links = sampleCatalogLinks([["10066", "10019", "compendium"]], "10019");
    expect(links[1]?.url).toBe("https://curator.jsc.nasa.gov/lunar/lsc/10066.pdf");
    expect(sampleCatalogLinks([["10066", "10019", "compendium"]], "10066")).toHaveLength(1);
  });
  it("parses publications without the header and normalizes original DOI links", () => {
    const rows = parseSamplePublications([
      ["Bibcode", "Year", "Title"],
      [
        "bib",
        "2022",
        "Lunar basalt",
        "Author",
        "Icarus",
        "388",
        "",
        "115216",
        "",
        "http://dx.doi.org/10.1/paper",
        "10057, 10003",
      ],
      [
        "1970LPSC....1....1A",
        "1970",
        "Lunar samples",
        "Author",
        "Journal",
        "",
        "",
        "",
        "",
        "",
        "110003",
      ],
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.url).toBe("https://dx.doi.org/10.1/paper");
    expect(rows[0]?.samples).toEqual(["10057", "10003"]);
    expect(rows[1]?.samples).toEqual([]);
    expect(rows[1]?.url).toContain("ui.adsabs.harvard.edu/abs/");
  });
  it("preserves original comma-bearing photo identifiers while rejecting markup", () => {
    const photos = parseSamplePhotos("S69-45005|10003,153_JSC04089-X1|\nS69-45005|<script>");
    expect(photos).toEqual(["S69-45005", "10003,153_JSC04089-X1"]);
    expect(samplePhotoUrls(photos[1] ?? "").image).toContain("10003%2C153_JSC04089-X1.jpg");
  });
});
