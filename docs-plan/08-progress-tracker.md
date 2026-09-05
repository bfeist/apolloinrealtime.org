# 08 — Progress tracker

## Resume here

**2026-09-05: planning docs consolidated. No production cutover.** The local
recovery scope is complete. The planning set now contains only the current
product/architecture contracts, current evidence, remaining release sequence,
preservation rules, and deferred ingestion scope. Next, run the long-session
media resilience work in [05-migration-plan.md](05-migration-plan.md).

Useful review routes:

- homepage: `http://localhost:5173/`
- Apollo 13 MOCR: `/13/?t=055:54:53&ch=14`
- Apollo 11 samples: `/11/?t=109:34:00`
- Apollo 17 dashboard/biometrics: `/17/?t=118:00:00`

Playback starts paused and the mission controls own playback intent.

## Current state

| Area               | State                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared application | One vanilla TypeScript/ESM/Vite app serves Apollo 11, 13, and 17 with mission-specific configuration and data.                                                                        |
| Homepage           | Original wording, mission photography, insignia, Saturn V background, launch dates, and forum link are restored.                                                                      |
| Shell and timeline | Responsive shared shell, three-tier navigator, synchronized GET/date/seeks, transport controls, video/dashboard behavior, and mission-specific layouts are implemented.               |
| Mission content    | Transcript, milestones, commentary, photography, search, Apollo 11 samples, Apollo 13 spacecraft information, and Apollo 17 biometrics are mounted in the typed app.                  |
| MOCRviz            | Apollo 11/13 use native typed room selection, real channel catalogs/activity/waveforms/audio/transcripts, tape boundaries, and synchronized transport. Apollo 17 has no MOCR dataset. |
| Photo sources      | The selected large photograph links to the highest-resolution source available for each mission without changing thumbnail seeking or timed progression.                              |
| Protected trees    | `legacy/`, `legacy-src/`, `legacy-oracle/`, and `public/{11,13,17}/` remain preserved and read-only.                                                                                  |
| Release            | Not ready for cutover; the release audit and environment validation below remain open.                                                                                                |

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

| Date       | Work                                                                                                                                                 | Verification                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 2026-09-05 | Consolidated planning docs around current state and unfinished work; removed the two historical inventories and corrected adjacent stale references. | Local Markdown links and Prettier pass; `npm run check` passes 276 tests; protected reference trees unchanged. |
