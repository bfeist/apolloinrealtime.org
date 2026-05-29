// Apollo 13 mission config. Extracted from `public/13/index.js` (lines 1-35)
// during Phase 2 of the migration. KeyCDN variants stripped per plan.
export const a13Config: MissionConfig = {
  id: "13",
  name: "Apollo 13",

  stopCache: false,
  mediaRoot: "https://media.apolloinrealtime.org/A13",
  lpiImageRoot: "https://media.apolloinrealtime.org/A13/images/lpi_mirror",
  alsjImageRoot: "https://media.apolloinrealtime.org/A13/images/alsj_mirror",
  webCdnRoot: "",
  youtubeSDorHD: 0,

  fontLoaderDelay: 3,

  missionDurationSeconds: 547200, // 152 hours
  countdownSeconds: 127048,
  defaultStartTimeId: "-000102",
  launchDate: "1970-04-11 19:13:00 GMT",
  launchDateModernSuffix: "-04-11 19:13:00 GMT",
  countdownStartDate: "1970-04-10 7:55:50 GMT",
  countdownStartDateModernSuffix: "-04-10 7:55:50 GMT",

  backgroundColorActive: "#1e1e1e",
  redactedChannels: [1, 4, 10, 30, 31, 36, 37, 38, 39, 40, 41, 60],

  meta: {
    title: "Apollo 13 in Real Time",
    description:
      "A real-time interactive journey through the third lunar landing attempt. Relive every moment as it occurred in 1970.",
    ogImage: "https://apolloinrealtime.org/13/img/13home_screengrab.jpg",
    ogUrl: "https://apolloinrealtime.org/13/",
    fbAppId: "1505071169657863",
  },
  features: {
    mocrviz: true,
  },
  head: {
    paperVariant: "min",
    includeYouTubeIframeApi: true,
    extendedFavicons: false,
    manifestFile: "site.webmanifest",
  },
};
