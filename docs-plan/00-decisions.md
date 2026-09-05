# 00 — Architectural and scope decisions

Original decisions came from Ben in May 2026. The September 2026 salvage
request updates the visual target and authorizes completing MOCRviz. This
file holds durable decisions; progress belongs only in the tracker.

| ID   | Decision                                                                                                                                                                                                                                                                    |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | Vanilla TypeScript, ESM, Vite. No React or other application framework.                                                                                                                                                                                                     |
| A2   | Remove jQuery from the typed app; use browser DOM APIs and the small typed `src/dom/` helpers.                                                                                                                                                                              |
| A2b  | Ship static HTML/CSS/JS with no new runtime package dependencies. Existing Paper.js remains vendored and pinned. Pin build tools and lockfiles for repeatable rebuilds. YouTube and the media host remain explicit external services.                                       |
| B3   | **Updated September 2026:** preserve the recognizable legacy layout and experience; exact pixel equality is unnecessary. Broken CSS and missing visualization behavior must be repaired.                                                                                    |
| B4   | Existing mission, time, and channel links must survive cutover. Preserve mission metadata and share previews.                                                                                                                                                               |
| B5   | Retire separate `/mobile/` apps. The unified application must be usable on phones and tablets.                                                                                                                                                                              |
| B6   | Refactor MOCRviz into a lazy typed panel, without the legacy application iframe/jQuery/peaks.js. Preserve each mission's assets and positions. `spacecraft_dev/` is discarded; `nominee/` is retired.                                                                       |
| C7   | Apollo 13 is the first reference for shared implementation. Verify Apollo 11 and 17 independently. The historical implementation order was 17, 11, 13.                                                                                                                      |
| C8   | Eventual production cutover is all missions together, as previously requested. Shipping the typed build is distinct from local development at the real mission paths. Hosting changes and rollback details must be verified at release time; this recovery does not deploy. |
| C9   | Replace the old Python tooling with a future uv + Python 3.12+ ingestion pipeline. Ben runs it interactively initially. Unify the WhisperX harness; do not re-transcribe content as part of tooling work.                                                                   |
| D10  | All other Apollo missions are future design targets, including 8, 9, 10, 12, 14, 15, and 16. Do not add missions before recovering the current three. MOCRviz requires real available recordings.                                                                           |
| E11  | Continue static hosting; do not introduce an application server.                                                                                                                                                                                                            |
| E11b | Typed media URLs use `media.apolloinrealtime.org`, not KeyCDN. Historical copies remain pristine, including historical URL text.                                                                                                                                            |
| F13  | Unit tests cover meaningful logic; real browser checks cover interactions; production screenshots guide recognizable parity; reviewed typed snapshots catch regressions. The plan defines current gates.                                                                    |
| F14  | Keep the fresh AiRT2 repo and preserved legacy histories. Source trees remain read-only. Remote publication and GitHub Actions are later work.                                                                                                                              |

## Longevity

TypeScript and Vite are authoring/build tools. Their output runs as static
files without a package manager or application server on the host. Keeping
the runtime small and vendoring Paper.js reduces moving parts, but does not
remove the external YouTube/media dependency or guarantee future browser
compatibility. Do not promise that tooling pinning guarantees byte-identical
builds across operating systems.

## Salvage authorization

The old plan deferred MOCR visualization behind a separate audio-MVP
sign-off. Ben's request to salvage the layout and MOCRviz supersedes that
gate. Implement and inspect the room, channel activity, waveform, transcript,
and synchronized audio using existing source/data references. Record actual
limitations rather than declaring placeholders complete.
