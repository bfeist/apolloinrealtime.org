# Apollo in Real Time v2 (AiRT2) — Planning Workspace

This folder contains **planning only** — no application code yet. The goal is to
consolidate the three sibling codebases

- `../Apollo17.org/` (built first, ~2013-era jQuery)
- `../Apollo_11/` (forked from 17)
- `../Apollo_13/` (forked from 11)

…plus the standalone landing page at `../apolloinrealtime.org/`, into a single
modern web app that serves the same UX at the same URLs (`/11`, `/13`, `/17`,
and future missions).

## Starting a new agent session

If you are an agent picking up this work, read these two files first:

1. **[08-progress-tracker.md](08-progress-tracker.md)** — where work stands right now; the "Resume here" block tells you exactly what to do next.
2. **[05-migration-plan.md](05-migration-plan.md)** — phased plan, verification steps, lint rules, subagent guidance.

Agent operating rules are in [.github/copilot-instructions.md](.github/copilot-instructions.md).

## Full planning-doc reading order

0. [00-decisions.md](00-decisions.md) — locked answers from Ben (read first)
1. [01-current-state.md](01-current-state.md) — what exists today
2. [02-problem-analysis.md](02-problem-analysis.md) — what's shared, what drifted, why this is hard
3. [03-architecture-options.md](03-architecture-options.md) — chosen stack + folder shape
4. [04-data-and-content-strategy.md](04-data-and-content-strategy.md) — CSV indexes, media (no KeyCDN), MOCRviz refactor, new uv data pipeline
5. [05-migration-plan.md](05-migration-plan.md) — phased plan + parallel data-pipeline track
6. [06-open-questions.md](06-open-questions.md) — closed questions + remaining follow-ups
7. [07-repo-and-git-strategy.md](07-repo-and-git-strategy.md) — fresh repo vs fold-in, preserving the old repos' history
8. [08-progress-tracker.md](08-progress-tracker.md) — live execution state

## TL;DR (decisions locked)

- **Vanilla + ESM + Vite + TypeScript** (no React). jQuery is **ripped out**
  and replaced with small typed DOM helpers.
- **Longevity is a first-class goal.** Shipped output is zero-dependency
  static JS/CSS/HTML; the toolchain (TS, Vite) compiles away and is pinned.
  No package-upgrade chores on the live site — same durability as today.
- **Canonical base: Apollo 13.**
- **One app, route-based mission selection** (`/11`, `/13`, `/17`, future
  `/8`/`/12`/`/14`/`/15`/`/16`). Per-mission config + data loaded lazily.
  Same static host as today.
- **Mobile subfolders dropped.** Unified app must be responsive.
- **MOCRviz is a first-class panel** (iframe coupling refactored away).
  `spacecraft_dev` and `nominee` are discarded/retired.
- **URL stability is non-negotiable** — every existing deep link survives
  cutover byte-for-byte.
- **KeyCDN dropped.** Media resolves to `media.apolloinrealtime.org` directly.
- **Tests grow progressively:** Vitest unit (CSV loader, clock/GET math) +
  browser tests per panel + Playwright visual regression against production
  screenshots captured _before_ any code lands.
- **Data pipeline replaced, not migrated.** New uv + Python 3 ingestion with a
  standardized schema. Only transcripts + photo-timing corrections run going
  forward; the rest of the old Python is reference-only.
- **Future missions** (A8/A12/A14/A15/A16) are first-class design targets,
  not afterthoughts.
