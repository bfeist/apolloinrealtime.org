import { describe, it, expect, vi } from "vitest";
import { parsePhotoData, loadPhotoData, findClosestPhotoIndex } from "../../src/data/photoData";

describe("parsePhotoData", () => {
  it("parses rows into structured photo entries", () => {
    const rows = [
      ["-351008", "69-HC-1269", "ap13-69-HC-1269HR.jpg", "", "On the pad waiting", "NASA"],
    ];
    const data = parsePhotoData(rows);
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]).toEqual({
      timeId: "-351008",
      timeStr: "-35:10:08",
      seconds: -126608,
      photoId: "69-HC-1269",
      filename: "ap13-69-HC-1269HR.jpg",
      supportingFilename: "",
      description: "On the pad waiting",
      credit: "NASA",
    });
  });

  it("skips empty timeId rows", () => {
    const rows = [["", "photo-1", "file.jpg", "", "desc", "NASA"]];
    const data = parsePhotoData(rows);
    expect(data.entries).toHaveLength(0);
  });
});

describe("findClosestPhotoIndex", () => {
  const data = parsePhotoData([
    ["0010000", "p1", "f1.jpg", "", "first", "NASA"],
    ["0020000", "p2", "f2.jpg", "", "second", "NASA"],
  ]);

  it("returns -1 before the first photo", () => {
    expect(findClosestPhotoIndex(data, 0)).toBe(-1);
  });

  it("finds closest index <= seconds", () => {
    expect(findClosestPhotoIndex(data, 3600)).toBe(0);
    expect(findClosestPhotoIndex(data, 7199)).toBe(0);
    expect(findClosestPhotoIndex(data, 7200)).toBe(1);
    expect(findClosestPhotoIndex(data, 100000)).toBe(1);
  });
});

describe("loadPhotoData", () => {
  it("fetches and parses csv", async () => {
    const fetchFn = vi.fn((url: string) => {
      expect(url).toBe("/13/indexes/photoData.csv");
      return Promise.resolve(new Response("-351008|69|file.jpg||desc|NASA\n", { status: 200 }));
    });
    const data = await loadPhotoData("/13/", {
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.photoId).toBe("69");
  });
});
