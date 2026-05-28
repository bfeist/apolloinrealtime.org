# 00 — Locked decisions

Answers from Ben on 2026-05-28. These are the inputs the rest of the plan
is now built against. If any change, the other docs need a sweep.

| #    | Decision                           | Choice                                                                                                                                                                                                                                                  |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | Stack                              | **Vanilla + ESM + Vite + TypeScript** (no React)                                                                                                                                                                                                        |
| A2   | jQuery                             | **Rip it out.** Replace with small typed vanilla DOM helpers during extraction. No jQuery in the shipped app.                                                                                                                                           |
| A2b  | Longevity principle                | **Zero runtime dependencies in shipped output.** Build output is plain static JS+CSS+HTML that never needs upgrading. TS/Vite are build-time only and compile away. Pin + vendor the toolchain. Goal: another 15 years of running untouched.            |
| B3   | UX goal                            | **Pixel-identical first, redesign later**                                                                                                                                                                                                               |
| B4   | URL stability                      | **Absolute requirement** — every existing deep link must survive cutover                                                                                                                                                                                |
| B5   | Mobile site (`/mobile/` subfolder) | **Drop it.** Make the unified app responsive enough                                                                                                                                                                                                     |
| B6   | Side apps                          | **MOCRviz = refactor** (fundamental part of A11/A13; de-iframe it). **spacecraft_dev = discard** (confirmed throwaway prototype: `spacecraft.{html,css,js}`). **nominee = retire.**                                                                     |
| C7   | Canonical base                     | **Apollo 13**                                                                                                                                                                                                                                           |
| C8   | Cutover                            | (not asked — default: big-bang DNS swap. Revisit if needed.)                                                                                                                                                                                            |
| C9   | Data pipeline                      | **Replace, don't migrate.** Old Python was loose, per-mission, mostly run-once/experimental. Build a new ingestion pipeline (uv + Python 3) with standardized naming + schema. Only **transcripts** and **photo-timing corrections** run going forward. |
| D10  | Future missions                    | **Yes — A8 / A12 / A14 / A15 / A16 design targets.** Mission-config + `public/{N}/` convention must make these cheap to add                                                                                                                             |
| E11  | Hosting                            | **Same static host as today** (no infra change)                                                                                                                                                                                                         |
| E11b | Media CDN                          | **KeyCDN dropped.** Media served from `media.apolloinrealtime.org` directly. Remove all KeyCDN config/commented URLs.                                                                                                                                   |
| E12  | Server-side bits                   | (not asked — assumed none. Flag during Phase 1 if any surface)                                                                                                                                                                                          |
| F13  | Tests                              | **Vitest** for unit (CSV loader, clock math, GET conversion) + **progressively added browser tests** (Vitest browser mode / Playwright) + Playwright visual regression against production screenshots. Tests grow per phase.                            |
| F14  | Repo location                      | **Fresh `AiRT2` repo** that imports the **full history of all four legacy repos** via `git subtree` under `legacy/<name>/` prefixes (preserves the decade for gource). Local for now; GitHub + Actions later. See [07](07-repo-and-git-strategy.md).    |

## The longevity principle (why TS + Vite is not a maintenance burden)

Ben's core requirement: this site has run ~15 years with minimal updates and
works like a charm. That property must survive the rewrite. There's an
apparent tension with adding TypeScript and Vite — resolved like this:

- **The shipped artifact is plain static JS + CSS + HTML with zero runtime
  dependencies.** TypeScript compiles to JS and disappears. Vite is a
  build-time bundler and disappears. Once built and deployed, there is
  nothing to upgrade — exactly like today.
- **Runtime third-party code is vendored and pinned, not npm-installed at
  runtime.** Paper.js (the navigator engine) is kept as a pinned vendored
  copy. We don't chase its releases. If it works, it ships, untouched.
- **Ripping out jQuery reduces long-term risk**, not increases it. jQuery
  2.1.4 (2015) is itself a frozen dependency today; replacing it with a few
  dozen lines of typed vanilla DOM helpers means one fewer black box.
- **The dev toolchain (Node, Vite, TS, Vitest) can rot freely** without
  affecting the live site, because the live site is just files. We pin the
  toolchain (`.nvmrc`, exact versions in `package.json`, committed lockfile)
  so a rebuild years later is reproducible, but we are never forced to
  rebuild. No package-upgrade chores on any cadence.

In short: TypeScript and Vite buy us correctness and a good authoring
experience during the rewrite, then get out of the way. The deployed site is
as dependency-free and durable as the current one — more so, once jQuery is
gone.

## Knock-on impacts vs. the original plan

- **TypeScript** everywhere in `src/`. Adds `tsconfig.json`, type-checking
  in CI, `.ts` files. Mission config and CSV schemas become typed contracts
  (see [03](03-architecture-options.md), [04](04-data-and-content-strategy.md)).
- **jQuery removal** is now an explicit goal woven through Phases 3–5, not a
  someday Phase-8 cleanup. A small `src/dom/` helper module replaces it.
- **MOCRviz** is no longer an opaque carry-through. It becomes a panel in
  the new architecture and the iframe coupling gets removed. See updated
  [04-data-and-content-strategy.md](04-data-and-content-strategy.md) and a
  new phase in [05-migration-plan.md](05-migration-plan.md).
- **Mobile** is removed from scope entirely. Responsive CSS becomes a
  Phase-6 requirement, not a Phase-8 maybe.
- **Data pipeline is replaced, not migrated.** The old Python is reference
  material only. A new uv-based ingestion pipeline with a standardized
  schema produces the `indexes/` CSVs. Only transcript generation and
  photo-timing correction are ongoing tools. See updated
  [04-data-and-content-strategy.md](04-data-and-content-strategy.md).
- **KeyCDN is removed** from all config; media resolves to
  `media.apolloinrealtime.org` directly.
- **Tests grow progressively.** Vitest unit tests land with the first
  extracted engine; browser tests follow per panel; Playwright visual
  regression baselines are captured in Phase 0.
- **Multiple future missions** means the mission-config schema and the
  `public/{N}/` layout are first-class typed abstractions, not just a
  refactor convenience. The CSV schema is designed for unknown future
  missions (loader treats all mission-specific columns as optional).

## Still-open follow-ups

See [06-open-questions.md](06-open-questions.md) — the original questions
are now marked closed and a short list of remaining ones is at the bottom.
