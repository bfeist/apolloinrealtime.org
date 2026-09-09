import { timeStrToTimeId } from "../../shell/clock.js";

export interface GeoSampleBag {
  readonly timeId: string;
  readonly timeStr: string;
  readonly bagNumber: string;
  readonly matchText: string;
  readonly weight: string;
  readonly samples: readonly string[];
}

export interface GeoSampleDetail {
  readonly sampleType: string;
  readonly sampleSubtype: string;
  readonly bagNumber: string;
  readonly station: string;
  readonly originalWeight: string;
  readonly landmark: string;
  readonly pristinity: string;
  readonly pristinityDate: string;
  readonly description: string;
}

export interface TranscriptBagSegment {
  readonly text: string;
  readonly bag?: GeoSampleBag;
}

const MISSION_TIME = /^\d{3}:[0-5]\d:[0-5]\d$/;

/** Parse the Apollo 17 geology index used by the legacy transcript linker. */
export function parseGeoSampleBags(rows: readonly string[][]): GeoSampleBag[] {
  return rows.flatMap((row) => {
    const timeStr = row[0]?.trim() ?? "";
    const bagNumber = row[2]?.trim() ?? "";
    const matchText = row[3]?.trim() ?? "";
    const samples = [...new Set(row[5]?.match(/\b\d{5}\b/g) ?? [])];
    if (!MISSION_TIME.test(timeStr) || !bagNumber || !matchText || samples.length === 0) return [];
    return [
      {
        timeId: timeStrToTimeId(timeStr),
        timeStr,
        bagNumber,
        matchText,
        weight: row[4]?.trim() ?? "",
        samples,
      },
    ];
  });
}

/**
 * Split transcript text into plain and linked bag-number segments. Matching is
 * deliberately case-sensitive and literal, as in the original site.
 */
export function transcriptBagSegments(
  words: string,
  bags: readonly GeoSampleBag[],
): TranscriptBagSegment[] {
  if (bags.length === 0) return [{ text: words }];
  const segments: TranscriptBagSegment[] = [];
  let cursor = 0;
  while (cursor < words.length) {
    let nextBag: GeoSampleBag | undefined;
    let nextIndex = -1;
    for (const bag of bags) {
      const index = words.indexOf(bag.matchText, cursor);
      if (
        index >= 0 &&
        (nextIndex < 0 ||
          index < nextIndex ||
          (index === nextIndex && bag.matchText.length > (nextBag?.matchText.length ?? 0)))
      ) {
        nextIndex = index;
        nextBag = bag;
      }
    }
    if (!nextBag || nextIndex < 0) {
      segments.push({ text: words.slice(cursor) });
      break;
    }
    if (nextIndex > cursor) segments.push({ text: words.slice(cursor, nextIndex) });
    segments.push({ text: nextBag.matchText, bag: nextBag });
    cursor = nextIndex + nextBag.matchText.length;
  }
  return segments.length > 0 ? segments : [{ text: words }];
}

function recordFromUnknown(value: unknown): Record<string, unknown> | undefined {
  if (!Array.isArray(value)) return undefined;
  const first: unknown = value[0];
  if (typeof first !== "object" || first === null) return undefined;
  return first as Record<string, unknown>;
}

function detailValue(record: Readonly<Record<string, unknown>>, key: string): string {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "";
}

/** Normalize NASA's array-wrapped lunar sample API response. */
export function parseGeoSampleDetail(value: unknown): GeoSampleDetail | null {
  const record = recordFromUnknown(value);
  if (!record) return null;
  return {
    sampleType: detailValue(record, "SAMPLETYPE"),
    sampleSubtype: detailValue(record, "SAMPLESUBTYPE"),
    bagNumber: detailValue(record, "BAGNUMBER"),
    station: detailValue(record, "STATION"),
    originalWeight: detailValue(record, "ORIGINALWEIGHT"),
    landmark: detailValue(record, "LANDMARK"),
    pristinity: detailValue(record, "PRISTINITY"),
    pristinityDate: detailValue(record, "PRISTINITYDATE").replace(" 00:00:00", ""),
    description: detailValue(record, "GENERICDESCRIPTION"),
  };
}
