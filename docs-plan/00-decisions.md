# 00 — Architectural and scope decisions

These are the current constraints. Progress and remaining release work belong
only in [08-progress-tracker.md](08-progress-tracker.md).

| ID   | Decision                                                                                                                                                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | The application uses vanilla TypeScript, ESM, and Vite. Do not introduce React or another application framework.                                                                                                                                               |
| A2   | Typed application code uses browser DOM APIs and the small helpers in `src/dom/`; do not reintroduce jQuery or legacy application scripts.                                                                                                                     |
| A2b  | Ship static HTML, CSS, and JavaScript with no new runtime package dependencies. Paper.js is the existing vendored exception. Keep build tools and lockfiles pinned.                                                                                            |
| B3   | Preserve the recognizable legacy layout, content, and interactions. Exact pixel equality is unnecessary; broken layout and missing visualizations are unacceptable.                                                                                            |
| B4   | Preserve mission routes, GET links, channel links, media paths, mission metadata, and share previews through cutover.                                                                                                                                          |
| B5   | The unified application must work on phones and tablets. The separate `/mobile/` applications remain retired.                                                                                                                                                  |
| B6   | MOCRviz is a lazy typed panel using each mission's real assets, positions, recordings, activity, waveform, and transcript data. Do not restore the legacy iframe, jQuery, or peaks.js implementation. A13 `spacecraft_dev/` and A17 `nominee/` remain retired. |
| C7   | Shared changes use Apollo 13 as the first reference and must be verified independently against Apollo 11 and 17.                                                                                                                                               |
| C8   | Production cutover covers all three missions together. Local availability at the mission routes is not a deployment, and release requires verified hosting and rollback mechanics.                                                                             |
| D10  | Apollo 8, 9, 10, 12, 14, 15, and 16 are future work. Do not add missions before the current release work is complete; MOCRviz requires real available recordings.                                                                                              |
| E11  | Continue static hosting; do not introduce an application server.                                                                                                                                                                                               |
| E11b | Typed media URLs use `media.apolloinrealtime.org`, not KeyCDN. Historical reference repositories remain pristine.                                                                                                                                              |
| F13  | Unit tests cover logic, browser checks cover interactions, live production guides recognizable parity, and reviewed typed snapshots catch regressions. None of these alone establishes release readiness.                                                      |

TypeScript and Vite are authoring tools; their output must run as static files.
YouTube and the media host remain external dependencies whose failure states
must not break the rest of the experience.
