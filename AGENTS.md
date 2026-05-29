# AGENTS.md — AiRT2

Project-level agent instructions. Auto-loaded by pi (and any other
AGENTS.md-aware coding agent: Claude Code, Cursor, Codex, etc.) at the
start of every session that runs from this repo. Read before doing
anything else.

---

## 1. Orient yourself before starting

Every session must begin with these two reads, in order:

1. `docs-plan/08-progress-tracker.md` — current state, what's done, exact
   resume point. The top "⏩ Resume here" block tells you what the next
   action is and why.
2. `docs-plan/05-migration-plan.md` — phases, verification steps,
   strategy decisions.

If the tracker shows a phase as `in progress` or `first pass landed`,
finish that phase before starting the next one. **Never skip ahead.**

Full planning-doc reading order when re-orienting from scratch:

```
00-decisions.md          ← locked architectural decisions, do not relitigate
01-current-state.md
02-problem-analysis.md
03-architecture-options.md
04-data-and-content-strategy.md
05-migration-plan.md     ← phases + verification + lint rules
06-open-questions.md
07-repo-and-git-strategy.md
08-progress-tracker.md   ← ground truth for where work is now
```

Phase-specific reference docs:

- **`docs-plan/PHASE6-shell-analysis.md`** — exhaustive analysis of the
  legacy HTML shells; the spec for the typed shell template.
- **`docs-plan/PHASE6-visual-reference.md`** — live production URLs as
  the **visual layout oracle**, measured layout diagrams, and the gap
  between the current typed shell and production. Read before any
  Phase 6 / 6.5 styling work.

---

## 1a. Locked decisions (do not relitigate)

Full list in `docs-plan/00-decisions.md`. The ones that come up most:

- **A1 Stack:** Vanilla + ESM + Vite + TypeScript. No React, no Vue, no
  any framework.
- **A2 jQuery:** Rip it out. No `src/**` file imports jQuery. The
  typed DOM shim is `src/dom/index.ts`.
- **A2b Longevity:** Zero runtime dependencies in the shipped bundle.
  Build-time tools (TS, Vite, ESLint, Prettier, Vitest) are pinned and
  compile away. Paper.js is vendored, not npm-installed at runtime.
- **B3 UX goal:** Pixel-identical to production first, redesign later.
- **B4 URL stability:** Every existing deep link must survive cutover.
- **B5 Mobile:** The retired `/mobile/` subfolder is dropped. Make the
  unified app responsive enough instead.
- **B6 Side apps:** MOCRviz → refactor (de-iframe); spacecraft_dev →
  discarded; nominee → retired. Do not lift these.
- **C7 Canonical base:** Apollo 13. New panels prototype against A13
  first, then generalize to A11 / A17.
- **C9 Data pipeline:** Replace, don't migrate. New ingestion is uv +
  Python 3 with a standardized schema (Phase P-1 onward).
- **E11b Media CDN:** KeyCDN dropped. Media is served from
  `media.apolloinrealtime.org` directly. Don't reintroduce KeyCDN
  URLs or commented-out KeyCDN config.
- **F13 Tests:** Vitest unit + (progressively) browser + Playwright
  visual regression against 54 production baselines.

---

## 1b. Current phase, in two sentences

Check the tracker for the authoritative state. As of the most recent
session: **Phases 1–5 substantially complete; Phase 6 first pass
landed** (typed shell + unified CSS + per-mission overrides, all 8
panels wired). Next action is **Phase 6.5**: restructure the typed
shell from 2-col to 3-col to match production (see
`docs-plan/PHASE6-visual-reference.md`).

Phase 4.5b (MOCRviz waveform canvas / isometric MOCR / transcript
loader / tape activity heatmap) is deferred behind Ben's sign-off on
the audio MVP. Don't start it without that gate.

---

## 2. Update the tracker as you go

`docs-plan/08-progress-tracker.md` is the ground truth for where work
stands. Keep it current — it's how the next session picks up.

- **Before starting a task:** mark its phase row in progress in the
  tracker phase table.
- **After finishing a task:** mark it done; add a brief note about
  anything unexpected (deviations from plan, decisions made, issues
  found).
- **Before ending a session:** rewrite the "⏩ Resume here" block at the
  top so the next agent can resume in <2 minutes. Add a row to the
  bottom of the "Session log" table.

A stale tracker forces the next agent to re-read the whole codebase to
reconstruct state. That's the single biggest waste of context tokens
in this project.

---

## 3. Verification — what counts as "done"

The verification ladder is defined in
`docs-plan/05-migration-plan.md` §Verification (4 layers). Quick summary:

1. **`npm run check`** (typecheck + lint + prettier + vitest) — green on
   every commit. No exceptions.
2. **Progressive in-browser pages** — `/{11,13,17}/` for the typed app;
   `/legacy/{11,13,17}/` for the byte-for-byte legacy oracle. Smoke
   both in a Chrome session before considering visual work done.
3. **Manual side-by-side** at the snapshot GETs listed in
   `05-migration-plan.md`. Compare typed `/{N}/` to legacy
   `/legacy/{N}/` to the live production deploy at
   `https://apolloinrealtime.org/{N}/`.
4. **Playwright visual regression** — informational through Phase 4;
   **blocking from Phase 6 onward**.

Before marking a phase done, **all four layers must pass** for that
phase's scope.

---

## 4. Subagent delegation (pi-specific)

Use subagents to preserve the main context window for coordination and
decision-making. In pi, the subagent skills are `/sub-haiku`,
`/sub-sonnet`, `/sub-opus` (defined in `~/.pi/agent/skills/`).

**Haiku subagent (`/sub-haiku`)** — cheap, parallel, read-only work:

- Repetitive file generation from a template (e.g., per-mission CSV
  fixtures, per-mission config scaffolds)
- Grep / search passes across large legacy files
- Simple one-shot string replacements across many files
- Read-only legacy-shell analysis (proven this session — 650-line
  analysis doc in ~2 min, ~130k tokens)

**Sonnet subagent (`/sub-sonnet`)** — heavier reasoning, 1M-token
context window:

- Engine extraction (Phase 4): reading 2000+ line JS and splitting
  into typed TypeScript modules
- Panel extraction (Phase 5)
- CSS analysis and consolidation across multi-thousand-line stylesheets
- Any task requiring reading multiple large legacy files simultaneously

**Keep in the main agent:**

- Phase-level decisions and deviations from plan
- Resolving conflicts between planning docs
- Writing tracker entries
- Running `npm run check` and interpreting failures
- Playwright baseline capture and diff triage
- Anything requiring back-and-forth with the user

When delegating, **give the subagent the relevant section of
`05-migration-plan.md` as context** so it knows the constraints
(TypeScript strict, no jQuery in `src/`, ESLint enforced, etc.).

---

## 5. Coding standards (enforced by `npm run check`)

```
npm run check
  ├─ tsc --noEmit            # TypeScript strict
  ├─ eslint src tests        # typescript-eslint strictTypeChecked
  ├─ prettier --check        # format diff blocks the build
  └─ vitest run              # 238/238 tests must pass
```

- TypeScript: strict mode, no `any`, no `@ts-ignore` without a comment
  explaining why.
- ESLint key rules:
  - `@typescript-eslint/no-unused-vars`: error
  - `@typescript-eslint/no-floating-promises`: error
  - `@typescript-eslint/no-explicit-any`: error
  - `@typescript-eslint/no-confusing-void-expression`: error
  - `no-console`: warn (allow `console.warn` / `console.error`)
- Prettier: format before committing; CI blocks on any diff. Quick
  fix: `npx prettier --write <files>`.
- `legacy-src/`, `public/{N}/`, `legacy-oracle/` are **excluded** from
  ESLint — lifted legacy code is reference-only and not linted. Code
  only comes under lint when it moves to `src/`.

---

## 6. Repo / git hygiene

- Commit after each meaningful unit of work (one engine extracted, one
  panel converted, one shell scaffold landed) — not at end-of-phase.
- Commit message format: `phase(N): short description`
  (e.g. `phase(6): typed shell + tokens.css + per-mission overrides`).
- Never commit without `npm run check` green.
- The legacy repos are under `legacy/` (subtree imports). **Do not
  modify them** — they are read-only reference material.
- `public/{11,13,17}/`, `legacy-oracle/{N}/`, and `legacy-src/{N}/`
  must remain **byte-for-byte identical** to the upstream apolloinrealtime
  repos (modulo CRLF). They get deleted in Phase 7 once cutover ships.
  If you find drift, restore from the sibling repos at
  `F:/_repos/Apollo_11`, `F:/_repos/Apollo_13`, `F:/_repos/Apollo17.org`.

---

## 7. What not to do

- Do not add runtime dependencies. The longevity principle
  (`docs-plan/00-decisions.md` A2b) requires zero runtime deps in the
  shipped bundle. Paper.js is vendored and pinned; jQuery is being
  removed.
- Do not touch `legacy/` files.
- Do not shim legacy globals via `window.X` set from `src/main.ts` —
  this was a documented Phase 4 lesson; see the tracker note.
- Do not guess at Playwright baseline timestamps — use the table in
  `05-migration-plan.md`.
- Do not make "improvements" outside the current phase scope. Log them
  in the tracker's "Deferred improvements noticed" table if you spot
  them.

---

## 8. Mission URLs (quick reference)

| URL                                 | What it serves                                         |
| ----------------------------------- | ------------------------------------------------------ |
| `/`                                 | Landing page                                           |
| `/{11,13,17}/`                      | Typed app (production target)                          |
| `/{N}/?debug=1`                     | Typed app + diagnostic readout side host               |
| `/legacy/{11,13,17}/`               | Byte-for-byte legacy oracle (dev only)                 |
| `/dev/`                             | Per-module smoke harness (clock, CSV loader, ytplayer) |
| `https://apolloinrealtime.org/{N}/` | **Live production** — visual layout oracle             |

`public/{N}/` holds the legacy asset trees (CSS, JS, images, CSVs,
MOCRviz audio). The typed app at `/{N}/` reuses these assets directly
(`/${id}/indexes/...`, `/${id}/lib/paper-full.js`, `/${id}/img/...`,
`/${id}/MOCRviz/...`). Phase 7 deletes the legacy JS/CSS/HTML payloads
once cutover ships; the asset trees (img, indexes, MOCRviz data) stay.

---

## 9. Snapshot GETs for visual regression

The full per-mission table lives in `docs-plan/05-migration-plan.md`
§Verification layer 4. Snapshot set is `pre-launch` / `launch` /
`key-event-1` / `key-event-2` / `final-phase` / `end` for each of
A11 / A13 / A17, at three viewports (desktop 1440×900, tablet 768×1024,
phone 390×844) — **54 baselines total** in
`tests/visual/baseline.spec.ts-snapshots/`.

Baselines were captured on Windows in Phase 0 (filenames carry `-win32`
suffix). Re-capture on the cutover host (likely Linux CI) before Phase 7.

---

## 10. Source restore (if legacy drifts)

If `public/{N}/`, `legacy-oracle/{N}/`, or `legacy-src/{N}/` ever
drift from the upstream `apolloinrealtime.org/{N}/` byte-for-byte
state, restore from the sibling clones:

```
F:/_repos/Apollo_11
F:/_repos/Apollo_13
F:/_repos/Apollo17.org
```

Exclude the locked-dropped subdirs per decision B5/B6:
`mobile/` (all three), `spacecraft_dev/` (A13), `nominee/` (A17).
CRLF differences on a handful of files are harmless.
