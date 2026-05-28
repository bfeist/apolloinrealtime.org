// Mission config — typed source of truth for per-mission constants
// extracted from the legacy `var c*` block at the top of each mission's
// `index.js`. See docs-plan/05-migration-plan.md Phase 2.
//
// Shape is intentionally close to the legacy variable names so the
// lifted code can read from `window.MISSION` with minimal behavioral
// change. Phase 3+ will replace those reads with typed imports.

type MissionId = "11" | "13" | "17";

interface MissionConfig {
  /** Mission identifier (matches the URL segment, e.g. "13" for /13/). */
  id: MissionId;
  /** Display name, e.g. "Apollo 13". */
  name: string;

  // --- App control flags ---
  /** Disable browser caching of CSV/asset requests (`cStopCache`). */
  stopCache: boolean;
  /** Root URL of the media CDN (`cMediaCdnRoot`). KeyCDN variants stripped. */
  mediaRoot: string;
  /** LPI image mirror root (`cLPIImageRoot`). A13 only. */
  lpiImageRoot?: string;
  /** ALSJ image mirror root (`cALSJImageRoot`). A13 only. */
  alsjImageRoot?: string;
  /** LPI bare CDN root, e.g. `https://www.lpi.usra.edu` (`cLPICdnRoot`). A11 only. */
  lpiCdnRoot?: string;
  /** Web CDN root (`cWebCdnRoot`); empty string = same-origin. A11/A13 only. */
  webCdnRoot?: string;
  /** YouTube quality preference: 0 = SD, 1 = HD (`cYouTubeSDorHD`). A11/A13 only. */
  youtubeSDorHD?: 0 | 1;
  /** Enable CDN routing (`gCdnEnabled`). A17 only. */
  cdnEnabled?: boolean;
  /** Skip YouTube checker, run offline (`gOffline`). A17 only. */
  offline?: boolean;
  /** Web-font loader delay in seconds (`gFontLoaderDelay`). All missions; A17's coder used the `g` prefix where A11/A13 use `c`, but it's the same config constant. */
  fontLoaderDelay: number;

  // --- Mission timing ---
  /** Total mission duration in seconds (`cMissionDurationSeconds`). */
  missionDurationSeconds: number;
  /** Pre-launch countdown duration in seconds (`cCountdownSeconds`). */
  countdownSeconds: number;
  /** Default start GET id, e.g. "-000102" (`cDefaultStartTimeId`). */
  defaultStartTimeId: string;
  /** Historic launch date string parsable by `Date.parse` (`cLaunchDate`). */
  launchDate: string;
  /**
   * Month/day/time suffix used to build the modern-year launch date,
   * e.g. "-04-11 19:13:00 GMT". The legacy code prepends the current
   * year via `Date.now().getFullYear().toString()`.
   */
  launchDateModernSuffix: string;
  /** Historic countdown-start date string (`cCountdownStartDate`). */
  countdownStartDate: string;
  /** Modern-year countdown-start suffix (`cCountdownStartDateModern`). */
  countdownStartDateModernSuffix: string;

  // --- UI ---
  /** Active background color (`cBackground_color_active`). */
  backgroundColorActive: string;
  /** Audio channel numbers that are redacted (`cRedactedChannelsArray`). A11/A13 only. */
  redactedChannels?: number[];

  // --- HTML head (Phase 3) ---
  /** Per-mission meta tags, injected into <head> by the shared head builder. */
  meta: MissionMeta;
  /** Per-mission head/script-chain switches that differ across legacy missions. */
  head: MissionHeadOptions;
}

/** Mission-specific meta tag values. Drives the shared head template. */
interface MissionMeta {
  /** <title> and og:title. */
  title: string;
  /** description + og:description (single sentence). */
  description: string;
  /** Absolute URL of the social preview image. */
  ogImage: string;
  /** Canonical site URL, e.g. "https://apolloinrealtime.org/13/". */
  ogUrl: string;
  /** Facebook app id. */
  fbAppId: string;
}

/** Per-mission overrides for the shared head script chain. */
interface MissionHeadOptions {
  /** "min" => `lib/paper-full.min.js`, "dev" => `lib/paper-full.js` (A17). */
  paperVariant: "min" | "dev";
  /** A11/A13 load YouTube iframe API in head; A17 loads it via index.js. */
  includeYouTubeIframeApi: boolean;
  /** A11 cache-busts styles.css (`?rnd=27`); A13/A17 don't. */
  stylesCacheBust?: string;
  /** Mark to render the extended favicon set (A11/A17). */
  extendedFavicons: boolean;
  /** A17's manifest is "manifest.json", A11/A13 use "site.webmanifest". */
  manifestFile: "site.webmanifest" | "manifest.json";
}

interface Window {
  MISSION?: MissionConfig;
}
