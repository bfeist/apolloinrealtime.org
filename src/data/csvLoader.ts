/**
 * CSV loader for mission data files.
 *
 * The Apollo mission webroots ship pipe-delimited (`|`) text files under
 * `indexes/`. The legacy `public/{11,13,17}/ajax.js` files each repeat the
 * same fetch + split pattern for nine different index files; this module
 * collapses that into one typed loader (Phase 4).
 *
 * Mission-specific processing (text substitutions, dedup, sort) stays at
 * the caller — this module only handles transport + parsing.
 *
 * The legacy data files use:
 *   - `\n` or `\r\n` row terminators (both seen in the corpus).
 *   - `|` field separator (chosen because the transcripts contain commas).
 *   - No header row, no quoting; fields are raw text.
 *   - Frequent trailing empty lines that callers must filter.
 */

/**
 * Parse pipe-delimited text into an array of rows.
 * Each row is an array of string fields. Empty rows are preserved
 * verbatim (callers decide whether to drop them).
 */
export function parsePipeCsv(text: string): string[][] {
  if (text === "") return [[""]];
  return text.split(/\r\n|\n/).map((line) => line.split("|"));
}

/**
 * Fetch a pipe-delimited CSV from `url` and parse it.
 *
 * Throws on non-2xx HTTP responses (legacy used silent jQuery success-only
 * callbacks; the typed version surfaces failure so callers can react).
 */
export async function loadCsv(url: string, options: LoadCsvOptions = {}): Promise<string[][]> {
  const fetchFn = options.fetchFn ?? fetch;
  const finalUrl = options.cacheBust
    ? `${url}${url.includes("?") ? "&" : "?"}stopcache=${String(Math.random())}`
    : url;
  const res = await fetchFn(finalUrl);
  if (!res.ok) {
    throw new Error(`loadCsv: ${String(res.status)} ${res.statusText} for ${finalUrl}`);
  }
  const text = await res.text();
  return parsePipeCsv(text);
}
