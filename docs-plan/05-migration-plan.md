# 05 — Recovery and migration plan

Read `08-progress-tracker.md` first; `README.md` defines the product. This plan replaces the abandoned phase checklist. The task is to recover a coherent Apollo in Real Time experience, not to maximize the count of typed modules.

## Strategy

Keep the useful vanilla TypeScript/ESM/Vite foundation and the shared data loaders. One app serves `/11/`, `/13/`, `/17/`; mission configuration/data represent genuine differences. A13 is the first comparison target, then generalize against A11 and A17. No framework, jQuery, peaks.js or runtime package dependencies. Vendored Paper.js and original images/data are allowed.

Production at `https://apolloinrealtime.org/{11,13,17}/` is the reference for visual hierarchy and behavior. `/legacy/{N}/` is the independent local oracle. Never modify `legacy/`, `legacy-src/`, `legacy-oracle/`, or `public/{N}/` to make comparisons pass. Preserve deep links and historical content.

The owner's 2026-09-05 direction supersedes pixel-identical styling and the old MOCRviz MVP sign-off gate. Modest design differences are acceptable; overlapping controls, unreachable panes, fake data and missing core interactions are not.

## R1 — Replace contradictory documentation

- Keep a short product contract, durable architecture decisions, source map, current plan and one truthful tracker.
- Remove obsolete framework proposals, answered questions and stale instructions. Git retains historical drafts.
- Retain detailed source analysis as reference, clearly distinguished from observed current behavior.
- Remove deployment-ready claims until the product has actually been verified.

## R2 — Restore the mission shell and shared timeline

- Homepage: compare with `https://apolloinrealtime.org/` and preserve its content and composition. Use the original landing imagery; no invented promotional copy.
- Desktop: compact patch/title/date/GET beside a three-tier navigator; left video/dashboard above text tabs and transport; narrow channel strip for A11/A13; large right photo viewer with vertical thumbnails and mission-specific tabs. A17 uses two columns without an empty channel gutter.
- Assign every region explicit sizing responsibilities. A media aspect ratio must not overflow its grid track. Give scrollable descendants `min-height: 0`; keep control rows visible.
- On tablet/phone stack panels with useful explicit heights and normal page scrolling. Keep channels, all tabs, photography and MOCRviz reachable. No content-width horizontal overflow.
- One playback state owns GET, play/pause, seek and mute. Date = historical launch epoch + selected GET. Every seek source updates the same state immediately. No logging-only callbacks.
- Use the existing YouTube API loader to synchronize segment loads, seeks within a segment, play/pause and sound. Mission control sound and video sound must not compete.
- Restore missing navigator data and useful labels at all three zoom levels.
- Keep photo resolution suitable for the main viewer, scroll only the relevant pane, and expose shareable current-time URLs.
- Restore A11 sample collections, A13 spacecraft information and A17 biometric readings from the original content/data. Do not treat these as disposable divergence.

## R3 — Restore recognizable native MOCRviz

MOCRviz is a primary experience, not an audio-element demo. Build it as a normal typed right-hand panel with:

- Real mission-specific channel names, availability, role descriptions and selection.
- Original isometric room asset and correct clickable console positions.
- Per-channel activity timeline using real CDN activity chunks, with GET cursor and seek.
- Real binary audiowaveform peaks and playhead synchronized to tape-relative time.
- Channel transcript where historical data exists, with clickable GETs.
- Shared transport, correct tape bank/channel paths, tape boundary handling, unavailable-data and audio failure states.

Load expensive data lazily and bound caches. Abort/ignore stale loads when channels/tapes change. A missing historical recording must be visibly unavailable, never filled with fabricated waveform/activity/transcript. Original asset and data trees remain untouched.

## R4 — Verify the result, then record evidence

1. `npm run check` (strict typecheck, lint, formatting, unit tests) before every commit. Run `npm run build` for integration changes.
2. Open Chrome tabs for production, local typed and local legacy sites. Match GET and viewport; dismiss splash and pause. Check all missions at desktop, and typed app at 768×1024 and 390×844. Record actual results and external-service failures separately.
3. Exercise GET input, timeline, transcript/TOC/commentary/photo/search seek, play/pause/mute, tab switching and MOCR channel changes. Check that GET and historical date remain coherent and no controls overlap.
4. Run Playwright screenshots and behavioral/layout assertions. Screenshot tests are blocking against reviewed **typed-app** baselines; production screenshots are the reference for human comparison, not an exact-pixel gate under the owner's revised goal. Never update baselines simply to make a failure disappear. Record intentional differences and inspect the images first.

### Fixed comparison GETs

Use these established times unchanged (historical labels from the abandoned plan were unreliable; GET values are test coordinates):

| Snapshot    | A11        | A13        | A17        |
| ----------- | ---------- | ---------- | ---------- |
| pre-launch  | -002:00:00 | -002:00:00 | -002:00:00 |
| launch      | 000:00:00  | 000:00:00  | 000:00:00  |
| key-event-1 | 004:06:54  | 055:54:53  | 022:00:00  |
| key-event-2 | 075:31:12  | 087:58:00  | 118:00:00  |
| final-phase | 195:03:00  | 141:00:00  | 295:00:00  |
| end         | 195:18:35  | 142:54:41  | 301:51:59  |

Three missions × six GETs × desktop 1440×900 / tablet 768×1024 / phone 390×844 = 54 views. Original Windows production references are in `tests/visual/baseline.spec.ts-snapshots/`. Typed snapshots are separate; these must never be described as automatically proving production parity. MOCRviz requires its own open-panel comparisons in A11/A13.

## Exit and later work

Recovery can be called complete only when the repaired scope has browser evidence, useful controls, honest data states and green automated checks. List residual gaps explicitly. Staging/deployment is subsequent work; do not delete legacy references or ship merely because the build succeeds. Existing `deploy/` instructions are operational references, not readiness evidence.

After product acceptance: verify built output, deep links, hosting redirects, rollback and mobile use on staging. Keep prior production available for rollback. Future missions and the Python ingestion replacement remain separate tracks documented in `04-data-and-content-strategy.md`.
