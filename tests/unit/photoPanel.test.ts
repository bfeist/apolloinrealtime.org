import { describe, it, expect } from "vitest";
import { galleryItemId, parseAsRollImg } from "../../src/panels/photo";

describe("galleryItemId", () => {
  it("prefixes the timeId with 'gallerytimeid'", () => {
    expect(galleryItemId("0000000")).toBe("gallerytimeid0000000");
    expect(galleryItemId("-013008")).toBe("gallerytimeid-013008");
  });
});

describe("parseAsRollImg", () => {
  it("parses A11 photo ids", () => {
    expect(parseAsRollImg("AS11-40-5874", "11")).toEqual({
      rollNum: "40",
      imgNum: "5874",
    });
  });

  it("parses A13 photo ids (with optional trailing char)", () => {
    expect(parseAsRollImg("AS13-60-8582", "13")).toEqual({
      rollNum: "60",
      imgNum: "8582",
    });
    expect(parseAsRollImg("AS13-60-8582A", "13")).toEqual({
      rollNum: "60",
      imgNum: "8582A",
    });
  });

  it("returns null for non-matching ids", () => {
    expect(parseAsRollImg("ap13-69-HC-1269HR.jpg", "13")).toBeNull();
    expect(parseAsRollImg("", "13")).toBeNull();
    expect(parseAsRollImg("AS17-148-22727", "13")).toBeNull();
  });
});
