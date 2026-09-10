import { describe, it, expect } from "vitest";
import { galleryItemId, parseAsRollImg } from "../../src/components/photo/model";
import { sanitizePhotoCaption } from "../../src/components/photo/caption";

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

describe("sanitizePhotoCaption", () => {
  it("preserves safe legacy links and decodes caption entities", () => {
    expect(
      sanitizePhotoCaption(
        'See <a href="https://www.nasa.gov/example" title="source" target="new">NASA &amp; partners</a>. &quot;Done.&quot;',
      ),
    ).toBe(
      'See <a href="https://www.nasa.gov/example" title="source" target="_blank" rel="noopener noreferrer">NASA &amp; partners</a>. &quot;Done.&quot;',
    );
  });

  it("keeps relative historical links and removes malformed closing tags", () => {
    expect(sanitizePhotoCaption('Atlas</a>. See <a href="as11-map.jpg">map</a>.')).toBe(
      'Atlas. See <a href="as11-map.jpg" target="_blank" rel="noopener noreferrer">map</a>.',
    );
  });

  it("rejects executable markup and unsafe link schemes", () => {
    expect(
      sanitizePhotoCaption(
        '<img src=x onerror=alert(1)>Image <a href="javascript:alert(1)">details</a><script>alert(2)</script>',
      ),
    ).toBe("Image detailsalert(2)");
    expect(sanitizePhotoCaption('<a href="java&#x73;cript:alert(1)">encoded</a>')).toBe("encoded");
  });
});
