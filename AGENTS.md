# AGENTS.md — AiRT2

## Start here

Begin every session with these reads, in order:

1. [docs-plan/README.md](docs-plan/README.md) — product intent, feature contract, and source map.
2. [00-decisions.md](docs-plan/00-decisions.md) — architectural and scope constraints.
3. [visual-reference.md](docs-plan/visual-reference.md) — layout and interaction reference.

Finish the requested application work before moving to future missions or
rebuilding the data pipeline. User instructions take precedence over older docs.

## Product standard

This project consolidates three working mission experiences. Preserve their
recognizable layout, content, and interactions. The September 2026 salvage
request accepts modest visual differences; exact production pixel equality
is not required. Broken layout and missing visualizations are unacceptable.

Use live `https://apolloinrealtime.org/{11,13,17}/` and the adjacent
`../Apollo_11`, `../Apollo_13`, and `../Apollo17.org` repositories as
references. Open real browser windows and inspect the same mission, GET,
viewport, and selected panel before and after changes.
Do not declare parity from screenshots of the splash screen, DOM existence,
or unit tests alone. MOCRviz completion is authorized by the salvage request;
the former audio-MVP sign-off gate is superseded.

The homepage reference is `https://apolloinrealtime.org/` itself. Preserve
its original wording, mission photographs, insignia, Saturn V background,
and forum link. Do not invent marketing copy or a new landing-page design.
Its source is `../apolloinrealtime.org/_website/_webroot/`; reusable copies
live in `public/landing/`.

## Implementation constraints

- Vanilla TypeScript, ESM, Vite, strict types. No React or other framework.
- No jQuery, peaks.js, or new runtime package dependencies in `src/` or the
  shipped app. Paper.js is the existing vendored exception. Keep build tools
  pinned; ship static HTML, CSS, and JavaScript.
- Build the typed app in `src/`; bootstrap through `src/app/missionApp.ts`.
  Never integrate by shimming legacy globals or loading legacy app scripts.
- Apollo 13 is the first implementation reference. Verify Apollo 11 and 17
  before calling shared work complete. Preserve mission-specific data,
  channel catalogs, console positions, and capabilities.
- Preserve mission routes, GET links, channel links, and media paths.
  Media resolves through `media.apolloinrealtime.org`; no new KeyCDN URLs.
- Keep one shared shell/style system with small explicit mission differences.
  Mount new panels into the real app as part of their implementation.
- The unified app must work on phones; the old `/mobile/` applications,
  A13 `spacecraft_dev`, and A17 `nominee` remain retired.

## Reference trees and git hygiene

`public/{11,13,17}/` is read-only during application work because
it contains assets used by the typed app, not just obsolete scripts. Preserved
non-runtime sources and intermediates live in `mission-data/`; legacy Python
processes live in `pipeline/` and are not yet a working replacement pipeline.
Their manifests point back to the adjacent source repositories and exact source
blobs. The other repositories' filtered commit graphs are retained under
namespaced `legacy/*` refs; do not delete those refs during cleanup. Read
[07-repo-and-git-strategy.md](docs-plan/07-repo-and-git-strategy.md) for
provenance and targeted restoration sources if drift is found.

Inspect the working tree before edits and preserve unrelated user changes.
Use concise conventional commit subjects such as `fix:`, `feat:`, `test:`, or
`docs:`; never commit without `npm run check` green. Do not rewrite history or
deploy as a side effect of application repair.

## Verification and handoff

- Run `npm run check` before each commit; run `npm run build` for changes
  affecting the app or build output. Use the applicable browser and Playwright
  checks for the affected scope.
- For layout work, inspect desktop, tablet, and phone; verify no accidental
  page overflow, clipped controls, empty panes, or hidden active tabs.
- Compare production for recognizable structure. Production screenshots
  provide reference evidence; accepted typed-app snapshots catch regressions.
  Never update snapshots solely to silence an unexplained failure.
- Verify visible controls actually work. Distinguish code bugs from blocked
  third-party media, and record the precise unverified behavior.
- In the final handoff, summarize completed work, verification, and any precise
  limitations. Keep durable behavior and architecture in the reference docs;
  do not maintain a session ledger.

Use bounded subagents for independent source analysis or implementation when
helpful. Give them the relevant constraints and exclusive file ownership. Keep
integration, browser comparison, test interpretation, and communication in the
coordinating agent.
