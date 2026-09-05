# AGENTS.md — AiRT2

## Start here

Begin every session with these reads, in order:

1. [docs-plan/08-progress-tracker.md](docs-plan/08-progress-tracker.md) — actual state and next action.
2. [docs-plan/05-migration-plan.md](docs-plan/05-migration-plan.md) — current recovery sequence and verification.
3. [docs-plan/README.md](docs-plan/README.md) — product intent, feature contract, and source map.

Read [00-decisions.md](docs-plan/00-decisions.md) for architectural
constraints and [PHASE6-visual-reference.md](docs-plan/PHASE6-visual-reference.md)
before changing layout. The tracker is the only current-status document.
Finish the active recovery task before moving to future missions, the data
pipeline, or deployment. User instructions take precedence over older docs.

## Product standard

This project consolidates three working mission experiences. Preserve their
recognizable layout, content, and interactions. The September 2026 salvage
request accepts modest visual differences; exact production pixel equality
is not required. Broken layout and missing visualizations are unacceptable.

Use live `https://apolloinrealtime.org/{11,13,17}/` and local
`/legacy/{11,13,17}/` as references. Open real browser windows and inspect
the same mission, GET, viewport, and selected panel before and after changes.
Do not declare parity from screenshots of the splash screen, DOM existence,
or unit tests alone. MOCRviz completion is authorized by the salvage request;
the former audio-MVP sign-off gate is superseded.

The homepage reference is `https://apolloinrealtime.org/` itself. Preserve
its original wording, mission photographs, insignia, Saturn V background,
and forum link. Do not invent marketing copy or a new landing-page design.
Its source is `legacy/landing/_website/_webroot/`; reusable copies live in
`public/landing/`.

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

`legacy/`, `legacy-src/`, `legacy-oracle/`, and `public/{11,13,17}/`
are read-only during recovery. The last group includes assets used by the
typed app, not just obsolete scripts. Never remove or edit these trees as
part of cleanup. Read [07-repo-and-git-strategy.md](docs-plan/07-repo-and-git-strategy.md)
for provenance and targeted restoration sources if drift is found.

Inspect the working tree before edits and preserve unrelated user changes.
Commit each meaningful completed unit with `phase(N): short description`;
never commit without `npm run check` green. Do not rewrite history or deploy
as a side effect of application repair.

## Verification and handoff

- Run `npm run check` before each commit; run `npm run build` for changes
  affecting the app or build output. Use the plan's browser and Playwright
  checks for the affected scope.
- For layout work, inspect desktop, tablet, and phone; verify no accidental
  page overflow, clipped controls, empty panes, or hidden active tabs.
- Compare production for recognizable structure. Production screenshots
  provide reference evidence; accepted typed-app snapshots catch regressions.
  Never update snapshots solely to silence an unexplained failure.
- Verify visible controls actually work. Distinguish code bugs from blocked
  third-party media, and record the precise unverified behavior.
- Before starting, mark the tracker task in progress. Before ending, rewrite
  its single resume block with remaining work, tests, browser evidence, and
  limitations; add one concise session-log entry. Never append competing
  resume blocks or claim a phase complete because its modules exist.

Use bounded subagents for independent source analysis or implementation when
helpful. Give them the relevant plan, constraints, and exclusive file
ownership. Keep integration, tracker updates, browser comparison, test
interpretation, and communication in the coordinating agent.
