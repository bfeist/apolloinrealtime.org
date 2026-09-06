# Product intent and documentation map

Apollo in Real Time lets visitors experience historical missions as they
unfolded. Mission time connects recordings, transcript, commentary,
photographs, and operational context on one screen. Visitors can listen
continuously, jump to a milestone or photograph, explore a Mission Control
channel, and share that exact moment.

AiRT2 consolidates Apollo 11, 13, and 17 in one implementation while preserving
their real differences. Apollo 13 is the first reference for shared changes, not
a substitute for checking Apollo 11 and 17.

## Product standard

The experience must remain recognizable, complete, and usable. Modest visual
differences are acceptable; broken layout, missing visualizations, generic
replacement content, or decorative no-op controls are not. Architectural
tidiness and passing tests support acceptance but do not establish it alone.

Use live [Apollo 11](https://apolloinrealtime.org/11/),
[Apollo 13](https://apolloinrealtime.org/13/), and
[Apollo 17](https://apolloinrealtime.org/17/) as references. Enter past the
splash, then compare the same GET, viewport, and selected panel. The homepage
reference is [apolloinrealtime.org](https://apolloinrealtime.org/) itself.

## Experience contract

| Surface                            | Observable acceptance                                                                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Entry and identity                 | The original homepage content and mission identity are preserved. Start controls enter the correct mission, and deep links reach the requested moment without being overwritten.                                                     |
| Header and navigator               | Mission patch/title, historical date, editable GET, and useful three-tier timeline stay visible and readable. Every seek source updates the shared mission time.                                                                     |
| Desktop composition                | Video/dashboard and text occupy the left area; Apollo 11/13 have a narrow channel strip; photography or MOCR occupies the large right area. Apollo 17 uses the width without an empty channel column.                                |
| Video and dashboard                | Video occupies the upper-left monitor beneath the dashboard layer. Automatic and manual dashboard visibility follow actual footage intervals. Mission day, stage, crew status, telemetry, and biometrics represent the selected GET. |
| Transcript, milestones, commentary | Tabs show real content, current rows follow GET, timestamps seek, long data remains performant and scrollable, and manual browsing is not constantly pulled away.                                                                    |
| Photography                        | Correct photos, captions, attribution, and source links load. The active photo follows GET, thumbnails seek, and images remain contained without distortion.                                                                         |
| Search and controls                | Search results navigate to real moments. Play/pause, sound, dashboard, share, fullscreen, and help controls perform their advertised actions.                                                                                        |
| Shared time and links              | Typed GET, navigator, transcript/TOC/commentary/photo/search seeks, and `?t=` links agree. Apollo 11/13 `?ch=` links select a valid channel after asynchronous MOCR loading.                                                         |
| MOCRviz                            | Apollo 11/13 show their real Mission Control room positions, channel information, recording waveform/playhead, activity, and transcript where available. Selection, audio, visualization, and mission time stay synchronized.        |
| Responsive behavior                | Desktop, tablet, and phone users can reach every applicable panel and control without page overflow, overlap, clipped labels, or empty fixed-size panes.                                                                             |
| Failure states                     | Missing recordings/transcripts and third-party failures are reported truthfully without fabricating data or destroying the rest of the experience.                                                                                   |

## Mission differences

| Mission   | Required distinct behavior and data                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apollo 11 | Its own MOCR positions, channel catalog, tapes, activity, and transcripts; lunar photography and astromaterial/sample content.                                 |
| Apollo 13 | Its own MOCR positions, channel catalog, tapes, activity, and transcripts; mission-specific trajectory/dashboard and spacecraft information; no lunar geology. |
| Apollo 17 | No current MOCR dataset or channel strip; lunar-surface content plus Cernan/Schmitt heart-rate and metabolic-rate data.                                        |

The discarded A13 `spacecraft_dev/` prototype is not the production spacecraft
information panel. Shared code must never substitute one mission's data for
another. Future missions opt in only when real datasets are available.

## Architecture and scope

- React with strict TypeScript, ESM, and Vite. React Router composes the landing
  and mission pages; JSX components own the rendered shell and feature panels.
- `src/store/missionStore.ts` owns shared GET, transport, tab selection, and
  seek actions. It uses the pure clock in `src/app/playback.ts`; components
  subscribe through Zustand selectors and do not create local clocks. Route
  initialization happens before mounting, so data requests cannot overwrite
  a newer user seek.
- TanStack Query owns remote data. `src/api/dataFetchers.ts` calls the existing
  typed adapters, and `src/api/useMissionData.ts` exposes mission-keyed query
  hooks, following the fetcher/hook pattern in `../issirt`. Static mission
  indexes are cached; optional panel queries load on demand. Local component
  state owns transient details such as disclosures and text input.
- Imperative media and canvas engines stay behind React refs and effects with
  cleanup. Do not rebuild panels with DOM factories, legacy app scripts,
  jQuery, peaks.js, or legacy-global shims. Paper.js remains vendored for the
  navigator. Keep dependencies pinned and deploy only static HTML/CSS/JS.
- `videoURLData.csv` describes media files; `videoSegmentData.csv` describes
  actual footage intervals and controls dashboard visibility.
- The shell owns available space. Media aspect ratios cannot enlarge grid tracks;
  scrollable descendants use zero minimum sizes and the grid prevents content
  width from causing overflow.
- MOCR audio, waveform, activity, room coordinates, and transcripts use the
  correct mission roots and original data. The faded 746×419 room image must be
  paired with its matching positions.
- MOCRviz, spacecraft, and samples are lazy right-column panels. Apollo 17
  biometrics use the shared GET inside the dashboard.
- Preserve `/{11,13,17}/` routes, GET/channel links, media paths, metadata, and
  share previews. Keep one shared style system with explicit mission differences.
  The separate mobile apps, A13 `spacecraft_dev`, and A17 `nominee` remain retired.
- Apollo 8, 9, 10, 12, 14, 15, and 16 are separate future work. Additional missions
  require real datasets and recordings; pipeline modernization is also separate.
- Vite route normalization applies only to application routes. Development
  endpoints such as `/@vite/client` must survive.
- Browser interaction and visual inspection remain required; DOM presence and
  unit tests do not prove product completeness.

## Where to work

| Location                               | Responsibility                                                      |
| -------------------------------------- | ------------------------------------------------------------------- |
| `src/app/missionApp.ts`, `src/App.tsx` | React bootstrap, router, query provider, and route initialization   |
| `src/pages/`                           | Landing page and shared mission page composition                    |
| `src/components/`                      | Shell, controls, and feature panels; local state and engine effects |
| `src/store/missionStore.ts`            | Shared mission clock, transport, navigation, and user actions       |
| `src/api/`                             | Typed fetchers, mission query hooks, and query cache                |
| `src/app/deepLink.ts`                  | GET and channel URL handling                                        |
| `src/missions/`, `src/types/`          | Mission configuration and typed data contracts                      |
| `src/data/`                            | Mission CSV adapters and time-indexed lookup                        |
| `src/engines/`                         | Navigator and YouTube integration                                   |
| `src/styles/`                          | Shared layout, tokens, panel styles, and small mission overrides    |
| `public/{11,13,17}/`                   | Read-only assets and data used by the typed app                     |
| `mission-data/{11,13,17}/`             | Preserved non-runtime inputs, working data, and branch variants     |
| `pipeline/{11,13,17}/`                 | Preserved legacy Python processes; not yet a supported toolchain    |
| Adjacent Apollo repositories           | Original website and processing source; browser references          |
| `tests/`                               | Unit, browser, and visual verification                              |

## Documentation authority

1. This document — current product and experience contract.
2. [visual-reference.md](visual-reference.md) — layout, control, and
   production-comparison reference.
3. [04-data-and-content-strategy.md](04-data-and-content-strategy.md) — current
   data/media rules and preserved processing material.
4. [07-repo-and-git-strategy.md](07-repo-and-git-strategy.md) — provenance and
   reference-tree preservation.

See [src/README.md](../src/README.md) for the source walkthrough and examples
of the state/data flow.

When browser or source behavior contradicts prose, investigate the live evidence
and correct the documentation. Git retains removed historical analyses and
completed recovery narratives.
