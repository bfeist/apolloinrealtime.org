// Apollo 17 mission config. Extracted from `public/17/index.js` (lines 1-22)
// during Phase 2 of the migration. KeyCDN variants stripped per plan.
//
// Note: A17's legacy code uses `g`-prefixed names for several variables that
// A11/A13 prefix with `c` (gStopCache, gDefaultStartTimeId, gBackground_color_active,
// gFontLoaderDelay). Those are mapped from this same config object.
export const a17Config: MissionConfig = {
  id: "17",
  name: "Apollo 17",

  stopCache: false,
  cdnEnabled: false,
  offline: false,
  mediaRoot: "https://media.apolloinrealtime.org/A17",

  missionDurationSeconds: 1100980,
  countdownSeconds: 9442,
  defaultStartTimeId: "-000105",
  fontLoaderDelay: 3,
  launchDate: "1972-12-07 0:33 -500",
  launchDateModernSuffix: "-12-07 0:33 -500",
  countdownStartDate: "1972-12-06 9:55:39pm -500",
  countdownStartDateModernSuffix: "-12-06 9:55:39pm -500",

  backgroundColorActive: "#222222",

  meta: {
    // Legacy A17 head <title> reads "Apollo 17 in Real-time" (hyphen+lower).
    // og:title reads "Apollo 17 in Real Time". Preserved verbatim.
    title: "Apollo 17 in Real-time",
    description:
      "A real-time interactive journey through the last landing on the Moon. Relive every moment as it occurred in 1972.",
    ogImage: "https://apolloinrealtime.org/17/img/17home_screengrab.jpg",
    ogUrl: "https://apolloinrealtime.org/17/",
    fbAppId: "1639595472942714",
  },
  head: {
    paperVariant: "dev",
    includeYouTubeIframeApi: false,
    extendedFavicons: true,
    manifestFile: "manifest.json",
  },
};
