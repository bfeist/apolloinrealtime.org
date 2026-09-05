# 08 — Progress tracker

## Resume here

**2026-09-05: MOCRviz visual baselines regenerated. No production cutover.**
All ten responsive Apollo 11/13 MOCR and About snapshots were recreated from the
current renderer and inspected. The six waveform-inclusive baselines changed;
the four About crops remained byte-identical. The unchanged-reference MOCR run
passes. Next, resume long-session media resilience work in
[05-migration-plan.md](05-migration-plan.md).

Useful review routes:

- homepage: `http://localhost:5173/`
- Apollo 13 MOCR: `/13/?t=055:54:53&ch=14`
- Apollo 11 samples: `/11/?t=109:34:00`
- Apollo 17 dashboard/biometrics: `/17/?t=118:00:00`

Playback starts paused and the mission controls own playback intent.

## Current state

| Area               | State                                                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared application | One vanilla TypeScript/ESM/Vite app serves Apollo 11, 13, and 17 with mission-specific configuration and data.                                                                                                                  |
| Homepage           | Original wording, mission photography, insignia, Saturn V background, launch dates, and forum link are restored.                                                                                                                |
| Shell and timeline | Responsive shared shell, three-tier navigator, synchronized GET/date/seeks, transport controls, video/dashboard behavior, and mission-specific layouts are implemented.                                                         |
| Mission content    | Transcript, milestones, commentary, photography, search, Apollo 11 samples, Apollo 13 spacecraft information, and Apollo 17 biometrics are mounted in the typed app.                                                            |
| MOCRviz            | Apollo 11/13 use the production interaction hierarchy with typed room selection, synchronized hover/seek previews, smooth activity/waveform motion, real audio/transcripts, and tape boundaries. Apollo 17 has no MOCR dataset. |
| Photo sources      | The selected large photograph links to the highest-resolution source available for each mission without changing thumbnail seeking or timed progression.                                                                        |
| Protected trees    | `legacy/`, `legacy-src/`, `legacy-oracle/`, and `public/{11,13,17}/` remain preserved and read-only.                                                                                                                            |
| Release            | Not ready for cutover; the release audit and environment validation below remain open.                                                                                                                                          |

## Current verification evidence

The last completed application baseline passed `npm run check` with 276 tests,
`npm run build`, all 82 browser cases in one unchanged-reference run, and three
direct live/local mission comparisons. Focused responsive checks covered
transport reconciliation, timed photo advancement, MOCR behavior, navigator
geometry, controls, channel labels/activity, and high-resolution photo links.

Saved coverage includes 54 mission views, six MOCR views, and three homepage
views. Screenshots establish reviewed local layout, not external audio delivery
or complete production parity. A visible Apollo 13 high-resolution-photo click
opened the expected 3900 × 3900 LPI source in a separate tab. Representative
Apollo 11, 13, and 17 source URLs returned HTTP 200 at verification time.

The MOCRviz parity repair was compared visibly against live Apollo 11 and 13 at
matching GETs and against the preserved waveform renderer. Twelve focused
browser cases pass the shared channel/GET hover preview, subsecond redraw,
seek/channel selection, exact-zero waveform baseline, complete mission-specific
About content, and six Apollo 11/13 MOCR snapshots at 1440, 768, and 390 px plus
four About snapshots at desktop and phone widths. Six local control cases and
three live/local production-reference cases also pass.

## Remaining release work

1. Run long-session YouTube/MOCR listening tests across tape boundaries, slow
   buffering, autoplay rejection, connection loss, recording gaps, channel
   changes, and mission end. Determine whether the clock-continuing-during-buffer
   limitation needs a fuller state machine.
2. Complete the feature audit for entry/splash behavior, credits/help/navigator
   legend, photo download/source interactions, and mission-specific ancillary
   overlays and content.
3. Audit production URL, redirect, asset-alias, social-metadata, case-sensitivity,
   and historical-date coverage, including countdown and mission boundaries.
4. Verify real phones and staging: keyboard/screen-reader behavior, portrait and
   landscape layout, full-screen/media restrictions, cache/redirect rules, CDN
   paths, Linux visual baselines, deployment, and rollback.
5. Record accepted limitations and release evidence, then make a separate
   all-mission cutover decision. Do not deploy or delete references as a side
   effect of local repair.

The detailed order and evidence requirements are in
[05-migration-plan.md](05-migration-plan.md). Future missions and the replacement
ingestion pipeline remain deferred beyond this release.

## Session log

| Date       | Work                                                                                                                                                         | Verification                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-05 | Force-regenerated and inspected all ten retained Apollo 11/13 MOCR and About visual baselines after the waveform rendering repair.                            | Six MOCR images updated, four About images byte-identical; subsequent unchanged-reference run passes all 12 focused MOCR cases.                       |
| 2026-09-05 | Replaced dim MOCR waveform strokes with the original solid blue filled envelope and retained a continuous one-pixel line through exact-zero samples.          | Legacy renderer/source comparison; visible A11/A13 checks; synthetic-silence regression and all 12 focused MOCR browser cases pass.                    |
| 2026-09-05 | Completed Apollo 11/13 MOCRviz visual/content parity: original About content and typography, waveform spacing, canvas-label removal, and compact controller/transcript layout. | Matching-GET live A11/A13 review; 11 focused MOCR, 6 control, and 3 live-reference browser cases pass; `npm run check` (276) and build pass.          |
| 2026-09-05 | Restored Apollo 11/13 MOCRviz production-style layout, hover/seek feedback, 10 Hz motion, native waveform scaling, transcript views, and phone reachability. | Live A11/A13 comparison; 9 focused MOCR browser cases, 6 control cases, and 3 live control-reference cases pass; `npm run check` (276) and build pass. |
| 2026-09-05 | Consolidated planning docs around current state and unfinished work; removed the two historical inventories and corrected adjacent stale references.         | Local Markdown links and Prettier pass; `npm run check` passes 276 tests; protected reference trees unchanged.                                         |
