// Apollo 11 mission config. Extracted from `public/11/index.js` (lines 1-30)
// from the original site. Media URLs use the shared media host.
export const a11Config: MissionConfig = {
  id: "11",
  name: "Apollo 11",

  stopCache: false,
  mediaRoot: "https://media.apolloinrealtime.org/A11",
  lpiCdnRoot: "https://www.lpi.usra.edu",
  webCdnRoot: "",
  youtubeSDorHD: 0,

  fontLoaderDelay: 3,

  missionDurationSeconds: 713311,
  countdownSeconds: 74768,
  defaultStartTimeId: "-000109",
  launchDate: "1969-07-16T13:32:00Z",
  launchDateModernSuffix: "-07-16 9:32 -400",
  countdownStartDate: "1969-07-15 1:46:57 -400",
  countdownStartDateModernSuffix: "-07-15 1:46:57 -400",

  backgroundColorActive: "#1e1e1e",
  redactedChannels: [1, 4, 10, 30, 31, 36, 37, 38, 39, 40, 41, 60],
  speakerLabels: {
    CDR: "Armstrong",
    CMP: "Collins",
    LMP: "Aldrin",
    PAO: "Public Affairs",
    CC: "Mission Control",
  },
  splash: {
    tagline: "A real-time journey through the first landing on the Moon",
    description: "This website consists entirely of original historical mission material",
    year: "1969",
    included: [
      "All mission control film footage",
      "All TV transmissions and onboard film footage",
      "2,000 photographs",
      "11,000 hours of Mission Control audio",
      "240 hours of space-to-ground audio",
      "All onboard recorder audio",
      "15,000 searchable utterances",
      "Post-mission commentary",
      "Astromaterials sample data",
    ],
  },

  meta: {
    title: "Apollo 11 in Real Time",
    description:
      "A real-time interactive journey through the first landing on the Moon. Relive every moment as it occurred in 1969.",
    ogImage: "https://apolloinrealtime.org/11/img/screenshot.png",
    ogUrl: "https://apolloinrealtime.org/11/",
    fbAppId: "2082429458513047",
  },
  features: {
    mocrviz: true,
  },
  head: {
    paperVariant: "min",
    includeYouTubeIframeApi: true,
    stylesCacheBust: "27",
    extendedFavicons: true,
    manifestFile: "site.webmanifest",
  },
};
