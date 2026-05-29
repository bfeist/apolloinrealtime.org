// CSV data types — ambient declarations.
// See individual src/data/*.ts modules for loaders and parsers.

// ── csvLoader ─────────────────────────────────────────────────────────────────

interface LoadCsvOptions {
  /**
   * If true, append `?stopcache=<random>` to defeat HTTP caches. Matches
   * the legacy `cStopCache` flag. Default `false`.
   */
  cacheBust?: boolean;
  /**
   * Optional fetch override for tests. Defaults to global `fetch`.
   */
  fetchFn?: typeof fetch;
}

// ── commentaryData ────────────────────────────────────────────────────────────

interface CommentaryEntry {
  /** Raw timeId, e.g. `"-013008"`. */
  readonly timeId: string;
  /** Format: `"HHH:MM:SS"` or `"-HH:MM:SS"`. */
  readonly timeStr: string;
  /** Seconds from T-0. */
  readonly seconds: number;
  /** Commentary source (attribution), e.g. `"AFJ"` or `"ALSJ"`. Empty in A13. */
  readonly source: string;
  /** Speaker or other label, e.g. `"CDR"` or empty. Empty in A13. */
  readonly speaker: string;
  /** Commentary words/text content. */
  readonly text: string;
}

interface CommentaryData {
  readonly entries: readonly CommentaryEntry[];
  readonly timeIds: readonly string[];
  readonly byTimeId: ReadonlyMap<string, number>;
}

// ── videoUrlData ──────────────────────────────────────────────────────────────

interface VideoUrlEntry {
  /** The applicable video ID. Defaults to sdVideoId or the main videoId. */
  readonly videoId: string;
  /** SD quality video ID. */
  readonly sdVideoId: string;
  /** HD quality video ID. */
  readonly hdVideoId: string;
  readonly startTimeStr: string;
  readonly endTimeStr: string;
  /** Start time in signed seconds from T-0. */
  readonly startSeconds: number;
  /** End time in signed seconds from T-0. */
  readonly endSeconds: number;
}

interface VideoUrlData {
  readonly entries: readonly VideoUrlEntry[];
}

// ── videoSegmentData ──────────────────────────────────────────────────────────

interface VideoSegment {
  readonly startTimeStr: string;
  readonly endTimeStr: string;
  /** Start as signed integer seconds from T-0. */
  readonly startSeconds: number;
  /** End as signed integer seconds from T-0. */
  readonly endSeconds: number;
  /** Third CSV column (empty in current data; preserved for forward
   * compatibility). */
  readonly extra: string;
}

interface VideoSegmentsData {
  readonly segments: readonly VideoSegment[];
}

// ── photoData ─────────────────────────────────────────────────────────────────

interface PhotoEntry {
  /** Raw timeId, e.g. `"-351008"`. */
  readonly timeId: string;
  /** Format: `"HHH:MM:SS"` or `"-HH:MM:SS"`. */
  readonly timeStr: string;
  /** Seconds from T-0. */
  readonly seconds: number;
  /** Photo name/identifier (e.g. `"AS13-60-8582"`). */
  readonly photoId: string;
  /** Primary filename (e.g. `"ap13-69-HC-1269HR.jpg"`). */
  readonly filename: string;
  /** Optional supporting filename. */
  readonly supportingFilename: string;
  /** Caption/description. */
  readonly description: string;
  /** Source credit (e.g. `"NASA"`). */
  readonly credit: string;
}

interface PhotoData {
  readonly entries: readonly PhotoEntry[];
  readonly timeIds: readonly string[];
  readonly byTimeId: ReadonlyMap<string, number>;
}

// ── utteranceData ─────────────────────────────────────────────────────────────

interface UtteranceEntry {
  /** Raw timeId, e.g. `"-044959"`. */
  readonly timeId: string;
  /** Format: `"HHH:MM:SS"` or `"-HH:MM:SS"`. */
  readonly timeStr: string;
  /** Seconds from T-0. */
  readonly seconds: number;
  /** Speaker label, e.g. `"PAO"`, `"CDR"`, `"CC"`. */
  readonly speaker: string;
  /** The spoken text. */
  readonly words: string;
  /** Optional 4th field from CSV. */
  readonly extra: string;
}

interface UtteranceData {
  readonly entries: readonly UtteranceEntry[];
  readonly timeIds: readonly string[];
  readonly byTimeId: ReadonlyMap<string, number>;
}

// ── orbitData ─────────────────────────────────────────────────────────────────

interface OrbitEntry {
  readonly startTimeStr: string;
  readonly startSeconds: number;
  readonly orbitNumber: string;
  readonly endTimeStr: string;
  readonly endSeconds: number;
}

interface OrbitData {
  readonly entries: readonly OrbitEntry[];
}

// ── missionStagesData ─────────────────────────────────────────────────────────

interface MissionStage {
  /** Stage start as a signed mission-time string, e.g. `"-35:17:28"`. */
  readonly timeStr: string;
  /** Stage start as signed integer seconds from T-0. */
  readonly seconds: number;
  /** Short stage label. */
  readonly name: string;
  /** Longer free-text description. */
  readonly description: string;
  /** Stage end as a signed mission-time string (= next stage start, or
   * mission end for the final stage). */
  readonly endTimeStr: string;
  /** Stage end as signed integer seconds from T-0. */
  readonly endSeconds: number;
}

interface MissionStagesData {
  /** Stages in file order. */
  readonly stages: readonly MissionStage[];
}

interface ParseMissionStagesOptions {
  /** Total mission duration in seconds; used as the final stage's
   * `endSeconds` (legacy behavior). */
  missionDurationSeconds: number;
}

// ── telemetryData ─────────────────────────────────────────────────────────────

interface TelemetryEntry {
  readonly startTimeStr: string;
  readonly startSeconds: number;
  readonly velocityEarth: number;
  readonly distanceEarth: number;
  readonly distanceMoon: number;
  readonly velocityMoon: number;
  readonly endTimeStr: string;
  readonly endSeconds: number;
}

interface TelemetryData {
  readonly entries: readonly TelemetryEntry[];
}

interface ParseTelemetryOptions {
  /** Mission duration in seconds, used to set the end of the last entry. */
  missionDurationSeconds: number;
}

// ── tocData ───────────────────────────────────────────────────────────────────

/** TOC entry level: 1 = chapter heading, 2 = sub-item. */
type TocLevel = 1 | 2;

interface TocEntry {
  /** Raw timeId from the CSV, e.g. `"-351728"` or `"0050000"`. */
  readonly timeId: string;
  /** Human-readable time string (`"HHH:MM:SS"` / `"-HH:MM:SS"`). */
  readonly timeStr: string;
  /** Signed integer seconds from T-0. */
  readonly seconds: number;
  /** Heading level. Unrecognized values fall back to `2`. */
  readonly level: TocLevel;
  /** Free-text label. */
  readonly label: string;
}

interface TocData {
  /** Entries in file order (the order they're displayed in the TOC). */
  readonly entries: readonly TocEntry[];
  /** timeIds in file order. Used for nearest-time binary/linear search. */
  readonly timeIds: readonly string[];
  /** `timeId -> entry index` lookup. */
  readonly byTimeId: ReadonlyMap<string, number>;
}

// ── crewStatusData ────────────────────────────────────────────────────────────

interface CrewStatusEntry {
  readonly startTimeStr: string;
  readonly startSeconds: number;
  readonly statusHtml: string;
  readonly endTimeStr: string;
  readonly endSeconds: number;
}

interface CrewStatusData {
  readonly entries: readonly CrewStatusEntry[];
}

interface ParseCrewStatusOptions {
  /** Mission duration in seconds, used to set the end of the last entry. */
  missionDurationSeconds: number;
}

// ── tapeRangesData (MOCRviz) ──────────────────────────────────────────────────

/** One contiguous MOCR audio recording on one tape × channel-bank. */
interface TapeRange {
  /** Tape identifier, e.g. "T920", "T868a", "T999" (sentinel = no audio). */
  readonly tapeId: string;
  /** Channel bank the tape served. */
  readonly channelBank: "HR1U" | "HR1L" | "HR2U" | "HR2L";
  readonly startTimeStr: string;
  readonly endTimeStr: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
}

/** Tape ranges split by HR1 / HR2 bank and sorted by start time. */
interface TapeRangesData {
  readonly hr1: readonly TapeRange[];
  readonly hr2: readonly TapeRange[];
}
