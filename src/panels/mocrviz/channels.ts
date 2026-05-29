/**
 * MOCR channel taxonomy.
 *
 * Typed re-implementation of the legacy `cTrackInfo` object in
 * `public/13/MOCRviz/MOCRviz.js` (lines 22-189) and `public/11/MOCRviz/MOCRviz.js`.
 *
 * Phase 4.5 — pure data, no DOM, no fetch. The MOCRviz panel renders one
 * button per channel listed in `availableChannels`; `redactedChannels`
 * appear greyed out and can't be selected; descriptions are shown on
 * hover.
 *
 * For now this module exports the A13 catalog (the canonical base). A11
 * has a different lineup (fewer channels; different labels). Adding A11
 * is a follow-up entry in this file.
 */

/** Short and long names of one channel. */
export interface ChannelInfo {
  /** 1..60. */
  readonly id: number;
  /** Short button label, e.g. "CAPCOM", "FLIGHT", "BOOSTER [L]". */
  readonly label: string;
  /** Full role description (hover tooltip). May be empty. */
  readonly description: string;
}

/** Full catalog for one mission. */
export interface MissionChannels {
  /** Every channel known for this mission (1..60), ordered by id. */
  readonly all: readonly ChannelInfo[];
  /** Subset selectable in the UI (default-selected = `defaultChannel`). */
  readonly available: readonly number[];
  /** Channels rendered but disabled (no audio, e.g. legal redactions). */
  readonly redacted: readonly number[];
  /** Channel id selected on panel open. */
  readonly defaultChannel: number;
}

/** Internal helper: build a {@link ChannelInfo} list from the legacy tuple shape. */
function buildAll(entries: readonly (readonly [number, string, string])[]): readonly ChannelInfo[] {
  return entries
    .map(([id, label, description]) => ({ id, label, description }))
    .sort((a, b) => a.id - b.id);
}

// A13 channel catalog. Labels match the production HTML button text exactly
// (short abbreviations from legacy-src/13/index.html). Descriptions are from
// public/13/MOCRviz/MOCRviz.js `cTrackInfo` (tooltip text).
const A13_ENTRIES: readonly (readonly [number, string, string])[] = [
  [1, "HR1", ""],
  [2, "FOD", "Overall responsibility for the mission interface to program Management."],
  [3, "MSN DIR", "The primary interface between NASA Headquarters and the Flight Control Team."],
  [
    4,
    "DOD MGR",
    "Primary interface with NASA for any Department of Defense support required during a mission, including recovery ships and DoD controlled tracking resources.",
  ],
  [
    5,
    "PROCEDURES",
    "Operations and Procedures Officer \u2013 Supervised the application of mission rules and detailed implementation of the Mission Control Center/Ground Operational Support Systems mission control procedures.",
  ],
  [
    6,
    "ASST FD",
    "Responsible to the Flight Director for detailed control of the mission and assumed the duties of the Flight Director in his absence.",
  ],
  [
    7,
    "FLIGHT-L",
    "Left seat - Responsible to the Mission Director for detailed control of the mission from launch (tower clear) to splashdown and assumed the duties of the Mission Director in his absence. In real time was responsible to take any actions needed for crew safety and mission success.",
  ],
  [
    8,
    "FLIGHT-R",
    "Right seat - Responsible to the Mission Director for detailed control of the mission from launch (tower clear) to splashdown and assumed the duties of the Mission Director in his absence. In real time was responsible to take any actions needed for crew safety and mission success.",
  ],
  [
    9,
    "FAO",
    "The FAO planned and supported crew activities, checklists, procedures and schedules.",
  ],
  [
    10,
    "NETWORK-L",
    "Network Controller - Had detailed operational control of the world wide Ground Operational Support System (GOSS), which included the tracking stations. (left seat)",
  ],
  [
    11,
    "NETWORK",
    "Network Controller - Had detailed operational control of the world wide Ground Operational Support System (GOSS), which included the tracking stations. (right seat)",
  ],
  [
    12,
    "SURGEON",
    "Directed all operational medical activities and crew's medical status. (left seat)",
  ],
  [
    13,
    "SURGEON-R",
    "Directed all operational medical activities and crew's medical status. (right seat)",
  ],
  [
    14,
    "CAPCOM",
    "Spacecraft Communicator \u2013 or Capsule Communicator - An astronaut who provided all the voice communications between the ground and the spacecraft. (left seat)",
  ],
  [
    15,
    "CAPCOM-R",
    "Spacecraft Communicator \u2013 or Capsule Communicator - An astronaut who provided all the voice communications between the ground and the spacecraft. (right seat)",
  ],
  [
    16,
    "CSM EECOM",
    "Electrical, Environmental and Consumables Manager - Monitored cryogenic levels for fuel cells, and cabin cooling systems; electrical distribution systems; cabin pressure control systems; and vehicle lighting systems.",
  ],
  [
    17,
    "POS EECOM",
    "Electrical, Environmental and Consumables Manager - Monitored cryogenic levels for fuel cells, and cabin cooling systems; electrical distribution systems; cabin pressure control systems; and vehicle lighting systems.",
  ],
  [
    18,
    "CSM GNC",
    "Guidance, Navigation, and Controls Systems Engineer - Monitored all vehicle guidance, navigation and control systems. Also responsible for propulsion systems such as the Service Propulsion System and Reaction Control System (RCS).",
  ],
  [
    19,
    "RETRO",
    "Retrofire Officer - Drew up abort plans and was responsible for determination of retrofire times. During lunar missions the RETRO planned and monitored Trans Earth Injection (TEI) maneuvers, where the Apollo Service Module fired its engine to return to Earth from the Moon.",
  ],
  [
    20,
    "FIDO",
    "Flight Dynamics Officer - Responsible for the flight path of the space vehicle, both atmospheric and orbital. During lunar missions the FDO was also responsible for the lunar trajectory.",
  ],
  [
    21,
    "GUIDO",
    "Guidance Officer - Monitored onboard navigational systems and onboard guidance computer software. Responsible for determining the position of the spacecraft in space. (left seat)",
  ],
  [
    22,
    "GUIDO-R",
    "Guidance Officer - Monitored onboard navigational systems and onboard guidance computer software. Responsible for determining the position of the spacecraft in space. (right seat)",
  ],
  [23, "CCATS LD", "Communications, Command and Telemetry Support, Command Load Controller."],
  [24, "CCATS RTC", "Communications, Command and Telemetry Support, Real-Time Command Controller."],
  [25, "CCATS CMD", "Communications, Command and Telemetry Support, Command Controller."],
  [
    26,
    "CCATS TIC",
    "Communications, Command and Telemetry Support, Telemetry Instrumentation Controller.",
  ],
  [27, "CCATS TM", "Communications, Command and Telemetry Support, Telemetry Controller."],
  [28, "TRACK", "Instrumentation Tracking Controller."],
  [29, "TRACK-R", "Instrumentation Tracking Controller, Unified S-Band."],
  [30, "HR1 VOX", ""],
  [31, "HR2", ""],
  [
    32,
    "RECOVERY",
    "NASA Recovery Officer - In charge of the Recovery Operations Control Room (ROCR).",
  ],
  [
    33,
    "RCVY ASST",
    "NASA Assistant Recovery Officer - Taking the lead for interfacing with other ROCR personnel.",
  ],
  [34, "RCVY STUS", "ROCR Recovery Status Monitor."],
  [35, "RCVY ST 2", "ROCR Evaluator / Display Controller."],
  [36, "DOD COORD", ""],
  [37, "DOD PRI OP", ""],
  [38, "DOD MGR RC", ""],
  [39, "DOD EXEC", ""],
  [40, "DOD COMM 1", ""],
  [41, "DOD PIO", ""],
  [42, "COMM TECH", ""],
  [43, "COMM CTRL", ""],
  [44, "SPACE ENV", "Supplied information on meteorological and space radiation."],
  [
    45,
    "COMP SUP",
    "Apollo Guidance Computer Supervisor is in overall control of the RTCC Complex and its associated mission computers.",
  ],
  [
    46,
    "SPAN",
    "Spacecraft Analysis Room - Official interface for the Manager of the Apollo Spaceflight Program Office.",
  ],
  [
    47,
    "BOOSTER",
    "Monitored and evaluated performance of propulsion-related aspects of the launch vehicle during prelaunch and ascent. (left seat)",
  ],
  [48, "BOOSTER-C", "Booster, center seat."],
  [49, "BOOSTER-R", "Booster, right seat."],
  [50, "FLIGHT", "FD clean voice-only recording of Flight Director [R]"],
  [51, "AFD CONF", "Assistant Flight Director - Comm line."],
  [52, "GOSS 2", "Ground Operational Support System (GOSS) - Comm line."],
  [
    53,
    "INCO",
    "Instrumentation and Communications Officer \u2013 With the advent of dual spacecraft operations, lunar surface operations, science TV, and extensive data recovery, a new operating position was added.",
  ],
  [54, "MOCR DYN", "Comm line."],
  [55, "GOSS CONF", "Ground Operational Support System (GOSS) - Comm line."],
  [56, "GOSS 4", "Ground Operational Support System (GOSS) - Comm line."],
  [57, "LM GNC", "(CONTROL) Lunar Module Guidance, Navigation, and Controls Systems Engineer."],
  [
    58,
    "TELMU",
    "(LM EECOM) Lunar Module Electrical, Environmental and Consumables Management Engineer.",
  ],
  [59, "EXPMT AO", "Experiments Officer."],
  [60, "HR2 VOX", ""],
];

const A13_CHANNELS: MissionChannels = {
  all: buildAll(A13_ENTRIES),
  // Display order matches the production legacy-src/13/index.html button list exactly.
  available: [
    2, 3, 50, 7, 8, 14, 15, 47, 48, 49, 19, 20, 21, 22, 12, 13, 16, 17, 58, 18, 57, 5, 9, 6, 11, 42,
    43, 28, 29, 32, 33, 34, 35, 51, 52, 53, 54, 55, 56, 23, 24, 25, 26, 27, 59, 44, 45, 46,
  ],
  redacted: [1, 4, 10, 30, 31, 36, 37, 38, 39, 40, 41, 60],
  defaultChannel: 14, // CAPCOM
};

// A11 has the same MOCR positions but the legacy code has a separate
// catalog. The shape is identical; populating it from
// `public/11/MOCRviz/MOCRviz.js` `cTrackInfo` is mechanical and can be
// done when A11 MOCRviz is wired in.
const A11_CHANNELS: MissionChannels = {
  all: buildAll(A13_ENTRIES), // TEMP: A13 catalog stand-in until A11 catalog imported
  available: A13_CHANNELS.available,
  redacted: A13_CHANNELS.redacted,
  defaultChannel: 14,
};

/** Return the channel catalog for a mission, or `null` if MOCRviz doesn't apply. */
export function channelsFor(mission: string): MissionChannels | null {
  if (mission === "13") return A13_CHANNELS;
  if (mission === "11") return A11_CHANNELS;
  return null;
}

/** Look up a {@link ChannelInfo} by id within a catalog. */
export function channelInfo(catalog: MissionChannels, id: number): ChannelInfo | null {
  return catalog.all.find((c) => c.id === id) ?? null;
}
