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
 * Mission catalogs preserve the genuine role differences between A11 and A13.
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

// Apollo 11 has distinct INCO, EECOM, ALSEP and LM positions. Descriptions
// are transcribed from public/11/MOCRviz/MOCRviz.js, not borrowed from A13.
const A11_ENTRIES: readonly (readonly [number, string, string])[] = [
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
    "OPS & PRO",
    "Operations and Procedures Officer – Supervised the application of mission rules and detailed implementation of the Mission Control Center/Ground Operational Support Systems mission control procedures.",
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
    "Directed all operational medical activities and crew’s medical status. (left seat)",
  ],
  [
    13,
    "SURGEON-R",
    "Directed all operational medical activities and crew’s medical status. (right seat)",
  ],
  [
    14,
    "CAPCOM",
    "Spacecraft Communicator – or Capsule Communicator - An astronaut who provided all the voice communications between the ground and the spacecraft. (left seat)",
  ],
  [
    15,
    "CAPCOM-R",
    "Spacecraft Communicator – or Capsule Communicator - An astronaut who provided all the voice communications between the ground and the spacecraft. (right seat)",
  ],
  [
    16,
    "INCO",
    "Instrumentation and Communications Officer – With the advent of dual spacecraft operations, lunar surface operations, science TV, and extensive data recovery, a new operating position was added, beginning with the Apollo 11 mission.",
  ],
  [
    17,
    "EECOM",
    "Electrical, Environmental and Consumables Manager - Monitored cryogenic levels for fuel cells, and cabin cooling systems; electrical distribution systems; cabin pressure control systems; and vehicle lighting systems. EECOM originally stood for Electrical, Environmental and COMmunication systems",
  ],
  [
    18,
    "GNC",
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
    "Flight Dynamics Officer - Responsible for the flight path of the space vehicle, both atmospheric and orbital. During lunar missions the FDO was also responsible for the lunar trajectory. The FDO monitored vehicle performance during the powered flight phase and assessed abort modes, calculated orbital maneuvers and resulting trajectories, and monitored vehicle flight profile and energy levels during re-entry.",
  ],
  [
    21,
    "GUIDO",
    "Guidance Officer - Monitored onboard navigational systems and onboard guidance computer software. Responsible for determining the position of the spacecraft in space. One well-known Guidance officer was Steve Bales, who gave the GO call when the Apollo 11 guidance computer came close to overloading during the first lunar descent. (left seat)",
  ],
  [
    22,
    "GUIDO-R",
    "Guidance Officer - Monitored onboard navigational systems and onboard guidance computer software. Responsible for determining the position of the spacecraft in space. One well-known Guidance officer was Steve Bales, who gave the GO call when the Apollo 11 guidance computer came close to overloading during the first lunar descent. (right seat)",
  ],
  [23, "CCATS LD", "Communications, Command and Telemetry Support, Command Load Controller."],
  [24, "CCATS RTC", "Communications, Command and Telemetry Support, Real-Time Command Controller."],
  [25, "CCATS CMD", "Communications, Command and Telemetry Support, Command Controller."],
  [
    26,
    "CCATS TIC",
    "Communications, Command and Telemetry Support, Telemetry Instrumentation Contoller.",
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
  [
    34,
    "RCVY STUS",
    "Recovery Operations Control Room (ROCR), Recovery Status Monitor - Assembling and displaying, on ROCR group displays, information on recovery force positions and status, pertinent recovery weather data and significant mission events.",
  ],
  [
    35,
    "EVAL",
    "Recovery Operations Control Room (ROCR), Evaluator / Display Controller - Assimilating and evaluating all data necessary to select the most desirable target points for any situation and recommending them to the Recovery Officer.",
  ],
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
    "Apollo Guidance Computer Supervisor is in overall control of the RTCC Complex and its associated mission computers Often pronounced 'computer soup'.",
  ],
  [
    46,
    "SPAN",
    "Spacecraft Analysis Room - Official interface for the Manager of the Apollo Spaceflight Program Office. Located on the 3rd floor the mission control building.",
  ],
  [
    47,
    "BOOSTER",
    "Monitored and evaluated performance of propulsion-related aspects of the launch vehicle during prelaunch and ascent. During the Apollo program there were three Booster positions, who worked only until Trans Lunar Injection (TLI); after that, their consoles were vacated. Booster had the power to send an abort command to the spacecraft. All Booster technicians were employed at the Marshall Space Flight Center and reported to JSC for the launches. (left seat)",
  ],
  [
    48,
    "BOOSTER-C",
    "Monitored and evaluated performance of propulsion-related aspects of the launch vehicle during prelaunch and ascent. During the Apollo program there were three Booster positions, who worked only until Trans Lunar Injection (TLI); after that, their consoles were vacated. Booster had the power to send an abort command to the spacecraft. All Booster technicians were employed at the Marshall Space Flight Center and reported to JSC for the launches. (center seat)",
  ],
  [
    49,
    "BOOSTER-R",
    "Monitored and evaluated performance of propulsion-related aspects of the launch vehicle during prelaunch and ascent. During the Apollo program there were three Booster positions, who worked only until Trans Lunar Injection (TLI); after that, their consoles were vacated. Booster had the power to send an abort command to the spacecraft. All Booster technicians were employed at the Marshall Space Flight Center and reported to JSC for the launches. (right seat)",
  ],
  [50, "FLIGHT", "FD clean voice-only recording of Flight Director [R]"],
  [51, "CONF LOOP", "Assistant Flight Director - Comm line."],
  [52, "GOSS 2", "Ground Operational Support System (GOSS) - Comm line."],
  [53, "EASEP", ""],
  [54, "MOCR DYN", "Comm line."],
  [55, "GOSS CONF", "Ground Operational Support System (GOSS) - Comm line."],
  [56, "GOSS 4", "Ground Operational Support System (GOSS) - Comm line."],
  [57, "CONTROL", "Lunar Module Guidance, Navigation, and Controls Systems Engineer."],
  [58, "TELCOM", "Lunar Module Electrical, Environmental and Consumables Management Engineer."],
  [59, "EXPMT AO", "Experiments Officer."],
  [60, "HR2 VOX", ""],
];

const A11_CHANNELS: MissionChannels = {
  all: buildAll(A11_ENTRIES),
  // Keep the original A11 shell order, which differs from A13.
  available: [
    2, 3, 50, 7, 8, 14, 15, 47, 48, 49, 19, 20, 21, 22, 12, 13, 17, 18, 58, 57, 16, 5, 9, 6, 11, 42,
    43, 28, 29, 32, 33, 34, 51, 52, 53, 54, 55, 56, 23, 24, 25, 26, 27, 59, 35, 44, 45, 46,
  ],
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
