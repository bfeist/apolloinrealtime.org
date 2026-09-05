# 08 - Progress tracker

## Resume here

**2026-09-05: the recovery implementation is complete; final screenshot verification is in progress. No production cutover.** Read this file, `05-migration-plan.md`, then `README.md`. The owner requested recognizable production layouts and explicitly corrected the homepage: use the actual live content, not invented copy.

The local app at `http://localhost:5173/` has the restored original homepage. Use `/13/?t=055:54:53&ch=14` to review MOCRviz, `/11/?t=109:34:00` for sample collections, and `/17/?t=118:00:00` for dashboard/biometrics. Playback starts paused; the mission controls own playback intent.

## Phase status

| Phase                                | Status                  | Evidence / remaining work                                                                                                                                                                 |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation (old 0-5)                 | retained and repaired   | Typed data/engine foundation reused; no new runtime dependencies.                                                                                                                         |
| Recovery R1 - docs                   | done                    | Product contract, source map, architectural decisions, concise plan/tracker; obsolete 02/03/06 removed.                                                                                   |
| Recovery R2 - shell and interactions | done for recovery scope | All three missions, desktop/tablet/phone; shared GET/transport, navigator, real seek callbacks, historical clock, photography, share/help, mission-specific panels and original homepage. |
| Recovery R3 - MOCRviz                | done for recovery scope | Native room, actual channel catalogs, activity, waveform, synchronized channel transcript/search and correct media paths.                                                                 |
| Recovery R4 - verification           | in progress             | 267 unit tests, check/build and 4 built-app smoke tests pass; 76 browser cases pass on capture. Final saved-screenshot comparison pending.                                                |
| Cutover (old 7)                      | not ready               | Remaining release work below; no reference deletion or deployment.                                                                                                                        |
| Future missions / ingestion          | deferred                | Preserve scope in 00 and 04.                                                                                                                                                              |

## What changed

- Fixed video/grid overlap that hid controls, negative GET clipping, channel-strip phone overflow, photo caption sizing, and panel scrolling that moved the entire page.
- Replaced independent wall-clock display and logging-only callbacks with `MissionPlayback`, immediate shared seeks, pause/play/mute and same-file YouTube seeking. Historical dates show explicit UTC.
- Restored navigator detail data and labels at all three levels. Dashboard visibility now uses actual footage intervals, not continuous YouTube audio file ranges.
- Rebuilt MOCRviz around actual tape activity chunks, binary audiowaveform data, original faded console image/coordinates and channel transcripts. Corrected CDN roots and A11 channel metadata. Requests cancel on channel changes and activity cache is bounded.
- Restored A11 sample collections and indexed NASA photographs/catalogs/papers, A13 spacecraft text/video, and A17 heart/metabolic recordings. Untimed collections remain browsable without invented GETs.
- Preserved A13 `?img=` navigation after asynchronous photo loading, guarded against overwriting a more recent seek. Share links include GET and active MOCR channel.
- Replaced the temporary invented homepage with the original Saturn V background, program emblem, mission photo cards, exact copy/launch dates and forum link. Reusable landing assets copied from the original source into `public/landing/`.
- Fixed Vite route normalization rewriting `/@vite/client`, which broke dynamic CSS imports; fixed legacy oracle query handling. Protected source/asset trees have no diff.

## Browser evidence

Chrome live/local/local-legacy comparisons: A11 `075:31:12`, A13 `055:54:53`, A17 `118:00:00`; live root compared with corrected local root. Also reviewed A13 MOCR at the incident, A11 sample details with loaded NASA photos, A13 spacecraft rotation and A17 biometric readings. At A17 `118:00:00`, Cernan is 139.2 bpm / 1746.1 btu/hr, Schmitt 114.3 / 1524.7, matching the original data.

Automated browser coverage includes all three widths, no horizontal overflow, no video/control/text overlap, GET seek and pause persistence, transcript/search/photo navigation, MOCR selection/CDN URL, sample/spacecraft tabs, photo deep links and dashboard behavior. Screenshots cover 54 mission views, six MOCR views, and three homepage views. YouTube content is hidden only for shell screenshots so local dashboard/controls remain visible; screenshots cannot prove external audio delivery.

## Remaining release work (do not hide these)

1. Conduct long-session listening tests across YouTube and MOCR tape boundaries, slow buffering, autoplay rejection, connection loss and mission end. The shared clock currently continues while external media buffers; synchronous media commands and bounded drift correction are implemented, but this is not a complete buffering state machine.
2. Finish the release feature audit against the product contract: mission entry/splash behavior, complete project credits/help, photo enlargement/download interactions, and mission-specific ancillary overlays. The new samples panel uses preserved local indexes and NASA links; it does not reproduce the obsolete live MoonDB chemistry interface.
3. Audit URL/asset coverage and actual date handling on target browsers, especially old redirects, photo aliases and historical mission-date edge cases. Normal mission, GET/channel and tested photo links work; this is not evidence that every historical URL has been checked.
4. Verify real phones and staging host, keyboard navigation, full-screen behavior, production cache/redirect rules, rollback and Linux screenshot baselines before cutover. The retired `/mobile/` and development side apps stay retired.

Modest intentional visual changes: stacked tablet/phone panels, readable accessible controls, explicit UTC date labels, native MOCR and auxiliary panels. These are not grounds to redesign the homepage or fabricate replacement historical content.

## Session log

| Date       | Work                                                                                                                                 | Verification                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 2026-09-05 | Audited and consolidated plans; restored shared layout/playback, native MOCRviz, mission-specific content and original landing page. | Check: 267 tests; build; 4 preview smoke tests; 76 browser cases on capture. Final screenshot comparison pending. |
