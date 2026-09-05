# 08 — Progress tracker

## Resume here

**2026-09-05: Mission entry/splash parity repair complete.** Bare Apollo 11, 13,
and 17 routes now open on responsive mission-specific entry overlays using the
preserved production imagery, insignia, wording, inventories, one-minute and
in-progress choices, fullscreen control, instructions/credits entry, and forum
link. Both entry choices start the shared transport; query-string deep links
still enter the mission directly and paused. Visible Chrome comparisons covered
live/local Apollo 11, 13, and 17 desktop pages plus local 390 x 844 views. Six
focused desktop/phone browser cases pass, as do `npm run check` (279 tests) and
`npm run build`. The broader recovery run passed 26/36 cases; its ten MOCR
snapshot expectations retain unrelated pre-existing typography drift and were
not regenerated. Push the current branch to exercise the first dev deployment,
then validate the homepage and all three bare/deep-linked mission routes on the
staging host. No deployment has been triggered yet.

Useful review routes:

- homepage: `http://localhost:5173/`
- Apollo 13 MOCR: `/13/?t=055:54:53&ch=14`
- Apollo 11 samples: `/11/?t=109:34:00`
- Apollo 17 dashboard/biometrics: `/17/?t=118:00:00`

Deep links start paused; mission-entry choices start playback. The shared
mission controls own playback intent after entry.

## Current state

| Area                | State                                                                                                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared application  | One vanilla TypeScript/ESM/Vite app serves Apollo 11, 13, and 17 with mission-specific configuration and data.                                                                                                                     |
| Homepage            | Original wording, mission photography, insignia, Saturn V background, launch dates, and forum link are restored.                                                                                                                   |
| Shell and timeline  | Responsive shared shell, three-tier navigator, synchronized GET/date/seeks, transport controls, video/dashboard behavior, and mission-specific layouts are implemented.                                                            |
| Mission content     | Transcript, milestones, commentary, photography, search, Apollo 11 samples, Apollo 13 spacecraft information, and Apollo 17 biometrics are mounted in the typed app.                                                               |
| MOCRviz             | Apollo 11/13 use the production interaction hierarchy with typed room selection, synchronized hover/seek previews, smooth activity/waveform motion, real audio/transcripts, and tape boundaries. Apollo 17 has no MOCR dataset.    |
| Photo sources       | The selected large photograph links to the highest-resolution source available for each mission without changing thumbnail seeking or timed progression.                                                                           |
| Source preservation | Complete filtered graphs remain under `legacy/*`; 1,935 non-runtime source files and 179 pipeline/support files are restored with exact commit/blob manifests and branch overlays. Runtime `public/{11,13,17}/` remains read-only. |
| Release             | Not ready for cutover; the release audit and environment validation below remain open.                                                                                                                                             |

## Current verification evidence

The restored mission entries were inspected directly against the three live
production mission routes in Chrome at desktop size and locally at 390 x 844.
All original hero images, mission-specific text/inventories, entry controls,
instructions link, and forum link are present; phone layouts have no horizontal
overflow and can scroll to the forum. Six focused browser cases cover both entry
choices, deep-link bypass, instructions, transport state, and phone reachability.
`npm run check` passes all 279 tests and `npm run build` emits all three routes.

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
matching GETs and against the original waveform renderer. Twelve focused
browser cases pass the shared channel/GET hover preview, subsecond redraw,
seek/channel selection, exact-zero waveform baseline, complete mission-specific
About content, and six Apollo 11/13 MOCR snapshots at 1440, 768, and 390 px plus
four About snapshots at desktop and phone widths. Six local control cases and
three live/local production-reference cases also pass.

The history cleanup retained 353/353 Apollo 11 commits, 173/173 Apollo 13
commits, 939/939 Apollo 17 commits, and 14/14 landing-site commits. A path audit
found no reachable file outside the current 975-file AiRT2 path set. This was a
repository-only change, so no new browser comparison was required.

The original four import merges were subsequently reconnected to the granular
filtered source tips instead of attaching all histories to one recent merge.
`main` now reaches 1,519 commits through the semantically correct import graph;
the complete source graphs remain namespaced. All 17 locally or remotely known
source branches have canonical aliases. In particular,
`legacy/apollo17/develop` has the same 919-commit topology as the source branch;
the other non-default live source branches also match their source commit counts.

The source-data recovery audited 4,452 retained entries across every original
branch tip against the two manifests with no missing mapping. A content-hash
audit matched all 2,101 byte-exact files; the remaining 13 pipeline copies differ
only because embedded ADS, Hugging Face, and Flickr credentials were replaced
with an explicit redaction placeholder. No Python remains in `mission-data/`,
and `npm run check` passes all 276 tests. Apollo 17's 21,065-file
`! Previous Steps` OCR/scratch tree remains only in its adjacent legacy
repository by request. No browser or build verification was required because
application code and runtime files did not change.

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
[05-migration-plan.md](05-migration-plan.md). Future missions and rebuilding the
preserved ingestion pipeline remain deferred beyond this release.

## Session log

| Date       | Work                                                                                                                                                                                    | Verification                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-05 | Restored responsive, mission-specific Apollo 11/13/17 entry overlays with production imagery/copy, entry controls, instructions, and forum access while preserving deep links.          | Direct live/local desktop and local phone review; six focused browser cases, `npm run check` (279), and build pass. Broader recovery: 26/36, with ten unrelated stale MOCR snapshots. |
| 2026-09-05 | Restored mission-specific transcript role-name substitution across transcript, commentary, and search displays, including PAO and Mission Control labels.                               | Live A13 naming reference and 1440/390 local review; six all-mission desktop/phone cases; `npm run check` (279) and build pass.                                                   |
| 2026-09-05 | Matched shared transcript/commentary typography and three-column flow to production, removing table spacing and fixed column widths while restoring wrapped, right-aligned speakers.    | Live A13 measurement and 1440/768/390 local review; six desktop/phone mission cases; `npm run check` (276) and build pass. Control-reference gate retains its known tab-size gap. |
| 2026-09-05 | Removed mistaken local commit `373f57af` from `main` and restored the three mission entry files it had deleted.                                                                         | `npm run test:all` passes lint, TypeScript, production build, and all 276 unit tests; the build emits entry pages for Apollo 11, 13, and 17.                                      |
| 2026-09-05 | Added a dev-only GitHub Actions check, build, and DreamHost rsync workflow based on ISSIRT, using AiRT2's Node version, output path, and configured repository values.                  | `npm run check` passes 276 tests; workflow/docs formatting and `git diff --check` pass. Its initially blocked build was repaired by restoring the three mission entry files.      |
| 2026-09-05 | Recovered retained branch-tip mission sources into `mission-data/` and separated every legacy Python process plus branch variant into `pipeline/`, without rebuilding the toolchain.    | 4,452 retained branch entries mapped; 2,101 files match source blobs exactly; 13 credential-bearing copies are intentionally redacted; `npm run check` (276) passes.              |
| 2026-09-05 | Published stable `legacy/<source>/<branch>` aliases for all 17 locally or remotely known branches from Apollo 11, Apollo 13, Apollo 17, and the original landing repository.            | Remote audit finds all 17 aliases; Apollo 17 `develop` retains all 919 commits; every live non-default branch count matches its source; Git fsck passes.                          |
| 2026-09-05 | Published the rewritten repository to `bfeist/apolloinrealtime.org`, made `main` the GitHub default, and added linked abandonment notices to the Apollo 11, 13, and 17 repositories.    | Remote HEAD resolves to `main`; all legacy refs were pushed; the three notice commits are published; GitHub's 23-commit activity figure matches the selected one-week window.     |
| 2026-09-05 | Repaired the four original import merge parents so granular filtered legacy histories appear at their actual import points instead of beneath one recent multi-parent merge.            | `main` reaches 1,516 commits; all source commit counts, merge-parent mapping, path audit, Git fsck, and `npm run check` (276) pass.                                               |
| 2026-09-05 | Removed copied pre-pipeline material and rewrote all refs to expunge removed legacy files while retaining the four source repositories' complete commit topology under namespaced refs. | Per-repository commit counts match all four sources; reachable-path audit, Git fsck, `npm run check` (276), and repository repack pass.                                           |
| 2026-09-05 | Externalized original-site references, removed dead public legacy code, and moved build output to `.local/dist/`.                                                                       | Exact mirror checks for 13 source trees; `npm run check` (276), build, built-payload audit, and six desktop/phone control cases pass.                                             |
| 2026-09-05 | Moved the desktop Share and Play labels down with a 5 px top inset, retaining control height and icon placement.                                                                        | Visible A13 review; `npm run check` (276), build, and all six `controls.spec.ts` desktop/phone cases pass.                                                                        |
| 2026-09-05 | Increased shared right-column top-tab horizontal padding to 11 px on desktop, retaining 8 px on phones and the original 38 px control height.                                           | Visible A13 desktop review; `npm run check` (276), build, and all six `controls.spec.ts` desktop/phone cases pass. Production gate has pre-existing 13 px text-tab mismatch.      |
| 2026-09-05 | Restored Apollo 11 Astromaterial Samples to its production-shaped introductory panel, including the five timed collection rows, source copy, and curation image.                        | Visible live/local desktop comparison at GET 109:34:00; mission-specific panel browser test; `npm run check` (276) and build pass.                                                |
| 2026-09-05 | Sized top app tabs to their label content and prevented wrapping after the text-size increase.                                                                                          | `npm run check` (276), build, all six `controls.spec.ts` desktop/phone cases, and local browser tab-strip review pass.                                                            |
| 2026-09-05 | Explicitly aligned shared and MOCR transcript-tab labels to the top-left of their inset control faces.                                                                                  | `npm run check` (276), build, six `controls.spec.ts` desktop/phone cases (A13 fixture passed on retry), and local browser review pass.                                            |
| 2026-09-05 | Increased shared text-tab labels to 13 px and MOCR transcript-tab labels to 11 px following visual review, retaining all button dimensions and states.                                  | `npm run check` (276), build, and all six `controls.spec.ts` desktop/phone cases pass; desktop browser review confirmed contained labels.                                         |
| 2026-09-05 | Force-regenerated and inspected all ten retained Apollo 11/13 MOCR and About visual baselines after the waveform rendering repair.                                                      | Six MOCR images updated, four About images byte-identical; subsequent unchanged-reference run passes all 12 focused MOCR cases.                                                   |
| 2026-09-05 | Replaced dim MOCR waveform strokes with the original solid blue filled envelope and retained a continuous one-pixel line through exact-zero samples.                                    | Legacy renderer/source comparison; visible A11/A13 checks; synthetic-silence regression and all 12 focused MOCR browser cases pass.                                               |
| 2026-09-05 | Completed Apollo 11/13 MOCRviz visual/content parity: original About content and typography, waveform spacing, canvas-label removal, and compact controller/transcript layout.          | Matching-GET live A11/A13 review; 11 focused MOCR, 6 control, and 3 live-reference browser cases pass; `npm run check` (276) and build pass.                                      |
| 2026-09-05 | Restored Apollo 11/13 MOCRviz production-style layout, hover/seek feedback, 10 Hz motion, native waveform scaling, transcript views, and phone reachability.                            | Live A11/A13 comparison; 9 focused MOCR browser cases, 6 control cases, and 3 live control-reference cases pass; `npm run check` (276) and build pass.                            |
| 2026-09-05 | Consolidated planning docs around current state and unfinished work; removed the two historical inventories and corrected adjacent stale references.                                    | Local Markdown links and Prettier pass; `npm run check` passes 276 tests; protected reference trees unchanged.                                                                    |
