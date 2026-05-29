import { describe, expect, it } from "vitest";

import { parseDeepLink } from "../../src/app/deepLink.js";

describe("parseDeepLink", () => {
  it("returns nulls for empty input", () => {
    expect(parseDeepLink("")).toEqual({ seek: null, channel: null });
    expect(parseDeepLink("?")).toEqual({ seek: null, channel: null });
  });

  it("parses ?t=HHH:MM:SS", () => {
    expect(parseDeepLink("?t=075:31:12")).toEqual({
      seek: { kind: "seconds", seconds: 75 * 3600 + 31 * 60 + 12 },
      channel: null,
    });
  });

  it("accepts shorter hour padding", () => {
    expect(parseDeepLink("?t=2:00:00")).toEqual({
      seek: { kind: "seconds", seconds: 7200 },
      channel: null,
    });
  });

  it("parses negative pre-launch GETs", () => {
    expect(parseDeepLink("?t=-002:00:00")).toEqual({
      seek: { kind: "seconds", seconds: -7200 },
      channel: null,
    });
  });

  it("encodes ?t=rt as live mode", () => {
    expect(parseDeepLink("?t=rt")).toEqual({
      seek: { kind: "rt" },
      channel: null,
    });
  });

  it("drops malformed t values silently", () => {
    expect(parseDeepLink("?t=not-a-time")).toEqual({ seek: null, channel: null });
    expect(parseDeepLink("?t=12:34")).toEqual({ seek: null, channel: null });
    expect(parseDeepLink("?t=12345")).toEqual({ seek: null, channel: null });
  });

  it("parses ?ch=N as a positive integer", () => {
    expect(parseDeepLink("?ch=12")).toEqual({ seek: null, channel: 12 });
    expect(parseDeepLink("?ch=0")).toEqual({ seek: null, channel: null });
    expect(parseDeepLink("?ch=-1")).toEqual({ seek: null, channel: null });
    expect(parseDeepLink("?ch=abc")).toEqual({ seek: null, channel: null });
  });

  it("decodes URL-encoded values", () => {
    expect(parseDeepLink("?t=" + encodeURIComponent("075:31:12"))).toEqual({
      seek: { kind: "seconds", seconds: 75 * 3600 + 31 * 60 + 12 },
      channel: null,
    });
  });

  it("combines t and ch", () => {
    expect(parseDeepLink("?t=000:00:00&ch=3")).toEqual({
      seek: { kind: "seconds", seconds: 0 },
      channel: 3,
    });
  });
});
