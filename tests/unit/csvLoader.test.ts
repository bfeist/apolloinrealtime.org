import { describe, it, expect, vi } from "vitest";
import { parsePipeCsv, loadCsv } from "../../src/data/csvLoader";

describe("parsePipeCsv", () => {
  it("splits a single LF-terminated row", () => {
    expect(parsePipeCsv("a|b|c")).toEqual([["a", "b", "c"]]);
  });

  it("splits multiple LF rows", () => {
    expect(parsePipeCsv("a|b\nc|d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("splits CRLF rows", () => {
    expect(parsePipeCsv("a|b\r\nc|d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("handles mixed CRLF / LF terminators", () => {
    expect(parsePipeCsv("a|b\r\nc|d\ne|f")).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
    ]);
  });

  it("preserves trailing empty row (caller filters)", () => {
    expect(parsePipeCsv("a|b\n")).toEqual([["a", "b"], [""]]);
  });

  it("preserves empty string for empty input", () => {
    // Matches legacy: split on empty string yields one row with one empty field.
    expect(parsePipeCsv("")).toEqual([[""]]);
  });

  it("returns single-field row for a row with no pipe", () => {
    expect(parsePipeCsv("foo")).toEqual([["foo"]]);
  });

  it("preserves empty fields between pipes", () => {
    expect(parsePipeCsv("a||c")).toEqual([["a", "", "c"]]);
  });

  it("parses a realistic transcript-style row", () => {
    const text = "0030000|CDR|Roger, Houston.|utterance";
    expect(parsePipeCsv(text)).toEqual([["0030000", "CDR", "Roger, Houston.", "utterance"]]);
  });
});

describe("loadCsv", () => {
  it("fetches a URL and parses the response", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve("a|b\nc|d"),
    });

    const rows = await loadCsv("/indexes/foo.csv", { fetchFn });

    expect(fetchFn).toHaveBeenCalledWith("/indexes/foo.csv");
    expect(rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("appends cache-bust query when requested", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve("x|y"),
    });

    await loadCsv("/indexes/foo.csv", { cacheBust: true, fetchFn });

    const calledUrl = fetchFn.mock.calls[0]?.[0] as string;
    expect(calledUrl.startsWith("/indexes/foo.csv?stopcache=")).toBe(true);
  });

  it("appends cache-bust with & when URL already has a query string", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve("x|y"),
    });

    await loadCsv("/indexes/foo.csv?v=2", { cacheBust: true, fetchFn });

    const calledUrl = fetchFn.mock.calls[0]?.[0] as string;
    expect(calledUrl).toMatch(/\?v=2&stopcache=/);
  });

  it("throws on non-OK response", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: () => Promise.resolve(""),
    });

    await expect(loadCsv("/indexes/missing.csv", { fetchFn })).rejects.toThrow(/404 Not Found/);
  });
});
