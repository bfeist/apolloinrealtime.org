# 05 — Migration plan (phased)

> **Agent:** Read [08-progress-tracker.md](08-progress-tracker.md) before
> starting any work session. Agent operating rules (subagent delegation,
> commit hygiene, what not to do) are in
> [.github/copilot-instructions.md](../.github/copilot-instructions.md).
> Update the tracker before ending every session.

Principle throughout: **never have a "the new site doesn't work yet" window
in production.** The old `_webroot` folders keep serving until the new app
passes a side-by-side check.

## Verification approach (applies every phase)

Four layers, lightest to heaviest:

### 1. Automated gates (run on every commit / `npm run check`)

```
npm run check
  ├─ tsc --noEmit          (TypeScript: type errors fail the build)
  ├─ eslint src/          (lint: real bugs + style)
  ├─ prettier --check     (formatting: diff must be empty)
  └─ vitest run           (unit + browser tests)
```

These run fast and gate every PR. They do **not** check "does the app look
right" — that's the human and Playwright layers.

### 2. Progressive in-browser dev pages (run continuously during a phase)

Each typed module should be exercisable in a real browser **the same day it
lands**, not at the end of the phase. Two surfaces:

- **`/dev/` — module harness.** Imports each typed module directly from
  `src/` and exposes button-driven smoke tests (input → output). Already in
  place for `clock`, `csvLoader`, `ytplayer`. Add one block per new module
  as it lands. No legacy code, no mission config — pure module surface.
- **`/dev/{11,13,17}/` — per-mission progressive pages.** A near-blank
  shell per mission that boots through `src/main.ts` against the typed
  `MissionConfig`, but loads **only** the engines and panels that have been
  converted to ESM so far. No legacy `index.js`, `ajax.js`, or
  `navigator.js`. Starts almost empty (mission name + a running clock
  readout) and grows as each Phase 4 / 4.5 / 5 deliverable lands: navigator
  tier-bar renders, CSV loader feeds a transcript stub, MOCRviz panel
  mounts, etc. This is the place an agent verifies a fresh extraction
  behaviorally in a real browser without disturbing the legacy mission
  pages at `/{11,13,17}/`.

Rules for the per-mission `/dev/{N}/` pages:

- They are scaffolding, not product. No Playwright baselines are captured
  against them; the production-equivalence oracle remains the legacy
  `/{N}/` pages.
- Every typed module added to `src/engines/` or `src/panels/` MUST be wired
  into all three `/dev/{N}/` pages it applies to before that module is
  considered "done". The author is the first user of their own module in
  context.
- The legacy `/{N}/` pages stay byte-for-byte the lift from Phase 1 (head
  injection aside) until Phase 5 converts call sites. Never edit them as a
  way to smoke-test ESM work — use `/dev/{N}/` instead.

### 3. Manual browser comparison (every phase exit)

Open the staging app and the production app **side by side in two browser
windows** at the same mission, same GET, same viewport. The quickest way:

```
# Local dev server on one port, prod open in a second tab
npm run dev  # -> http://localhost:5173/13/
# Prod:       https://apolloinrealtime.org/13/
```

Things to explicitly check each phase:

- Same GET displayed, same transcript / commentary / photo visible
- Play/pause + scrub: clock advances, panels update together
- Channel selector: audio channel switches
- TOC: deep-link jumps to right GET
- Photo panel: images load (lazy), click-through opens correctly
- Dashboard panels: telemetry, crew status visible
- Console: zero JS errors (browser DevTools)
- Network tab: no 4xx media errors

For phases that affect layout (3, 6): also check tablet and mobile viewport
widths in DevTools responsive mode.

### 4. Playwright visual regression (phase exit + pre-cutover)

Playwright captures full-page screenshots at fixed GET snapshots and diffs
them against the baseline set captured from production in Phase 0.

```bash
npm run test:visual             # run Playwright visual tests
npm run test:visual -- --update-snapshots  # if an intentional change needs a new baseline
```

**Snapshot set per mission (Copilot picks these for narrative significance):**

| Snapshot name | A11 GET    | A13 GET    | A17 GET    |
| ------------- | ---------- | ---------- | ---------- |
| `pre-launch`  | -002:00:00 | -002:00:00 | -002:00:00 |
| `launch`      | 000:00:00  | 000:00:00  | 000:00:00  |
| `key-event-1` | 004:06:54  | 055:54:53  | 022:00:00  |
| `key-event-2` | 075:31:12  | 087:58:00  | 118:00:00  |
| `final-phase` | 195:03:00  | 141:00:00  | 295:00:00  |
| `end`         | 195:18:35  | 142:54:41  | 301:51:59  |

(A11 key events: TLI + touchdown. A13 key events: O2 tank explosion +
powering down CM. A17 key events: lunar orbit insertion + first EVA
start + end of last EVA.)

All three missions × 6 snapshots × 3 viewports (desktop 1440, tablet 768,
phone 390) = 54 baseline images. Stored in `tests/visual/baseline/`.

Visual diffs are **informational** on partial phases (we expect some panels
not to match yet). They become **blocking** from Phase 5 onward and for the
final cutover build.

### Lint — yes, it matters here

With ~3,000 lines of global-variable JS being converted to typed modules, the
biggest risk category is **silent correctness bugs**: a renamed variable that
still resolves as `undefined`, an optional chain that wasn't there before,
a CSV column name typo that's only caught at runtime. ESLint with strict
TypeScript rules catches a meaningful fraction of these at commit time.

Rule set used (in `eslint.config.js`, flat config):

```js
// flat config excerpt
import tseslint from "typescript-eslint";

export default tseslint.config(
  tseslint.configs.strictTypeChecked, // includes no-explicit-any, no-unsafe-*
  tseslint.configs.stylisticTypeChecked,
  {
    rules: {
      // Upgrade the most useful rules to errors:
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Allow the trace() calls in the legacy lift-phase; remove after Phase 2
      "no-restricted-globals": "off",
    },
  },
);
```

Prettier runs separately (`eslint-config-prettier` turns off formatting rules
so they don't conflict):

```bash
npm run format          # prettier --write src/
npm run format:check    # CI: fails on any diff
```

Editor integration: recommend the ESLint + Prettier VS Code extensions with
"format on save" and "fix all on save" enabled — that way lint errors surface
in the editor before they ever hit the terminal.

During the **lift phase (Phases 1–2)** the legacy `index.js` lives in
`legacy-src/`, which is excluded from ESLint. Only `src/` is linted. As code
moves from `legacy-src/` → `src/` it comes under lint; that's intentional
— the move is the moment we commit to the new standard.

## Phase 0 — Scaffolding + baseline capture

- Stand up Vite + **TypeScript** (strict), ESLint (flat config,
  `typescript-eslint` `strictTypeChecked`), Prettier (reuse the existing
  `.prettierrc.json`), **Vitest** for unit tests. Wire them all into a
  single `npm run check` script so the full gate is one command.
- **Prettier and ESLint are enforced from commit #1.** All new code in
  `src/` must pass `tsc + eslint + prettier --check` before merging.
  `legacy-src/` is excluded from lint (it's lifted code, not new code).
- **Pin the toolchain for longevity:** `.nvmrc`, exact (non-caret) versions in
  `package.json`, commit the lockfile. Rebuilds stay reproducible for years;
  we are never _forced_ to upgrade.
- Stand up **Playwright** and capture baseline screenshots from production
  (`apolloinrealtime.org/{11,13,17}/`) at the 18 GET snapshots defined in
  the Verification section above (6 per mission × 3 viewports = 54 images).
  These are the regression oracle for every subsequent phase.
  **Do this before touching anything.**
- Scaffold the test layout: `tests/unit/` (Vitest), `tests/browser/`
  (Vitest browser mode / Playwright component — starts empty, grows per
  phase), `tests/visual/baseline/`.
- Canonical base = **Apollo 13** (locked).
- Wire `AiRT2/` to a staging URL (e.g. `airt2.apolloinrealtime.org` or a
  Cloudflare Pages preview) so every phase is visible.

**Verification:** Run `npm run check` (trivially green on empty scaffold).
Run `npx playwright test --project=visual` to confirm all 54 baseline images
are captured and committed. No manual browser comparison needed this phase.

**Exit criterion:** `npm run dev` serves an empty Vite shell at `/13/`,
`/11/`, `/17/`, and `/`; `npm run check` passes; 54 Playwright baseline
screenshots checked into `tests/visual/baseline/`.

## Phase 1 — Lift A13 onto the new shell, unchanged

- Copy `Apollo_13/_website/_webroot/13/{index.html,index.js,ajax.js,navigator.js,styles.css,lib/}`
  into `AiRT2/public/13/` and `AiRT2/legacy-src/13/`.
- Make `AiRT2/index.html` just serve the existing A13 markup with its
  existing script tags. No ESM yet.
- Confirm A13 boots in dev exactly like production.

**Verification:** `npm run check` (TS + lint + format on the tiny copied
files — will need a temporary lint-ignore block on the legacy `var`
globals). Manual browser comparison: open staging `/13/` and prod side by
side, play through launch and the key events, confirm pixel-equivalent
behavior. No Playwright visual diff required yet (the app is identical to
prod; any diff is a setup error).

**Exit criterion:** screen-record the new dev server playing A13 from
`T-2 hours` through `T+0:30`, compare to prod — pixel-equivalent.

## Phase 2 — Extract mission config (typed)

- Create `src/types/mission.ts` (`MissionConfig` type) and
  `src/missions/13.config.ts` populated from A13's `var c*` constants.
- **Strip KeyCDN here:** drop the commented `keycdn*` / `kxcdn` media-root
  variants; the config carries a single `mediaRoot`.
- Replace those constants in the legacy code with reads from the typed
  config object (exposed as `window.MISSION` for now).
- Repeat for A11 and A17 — copy their webroots into `public/{N}/`, copy
  their constants into `src/missions/{N}.config.ts`.
- Add a router that selects the active mission config from the URL.

**Verification:** `npm run check` must pass for all new `.ts` files.
Manual: open all three missions at a neutral GET (e.g. `T+001:00:00`) in
staging and confirm the right mission name, dates, media CDN root (check
Network tab — requests must go to `media.apolloinrealtime.org`, not any
`kxcdn` host), and redacted channels behave correctly.

**Exit criterion:** all three missions boot at `/{N}/` with the legacy code,
using only the typed mission config for per-mission constants; no KeyCDN
references remain.

## Phase 3 — Unify the entry point + start removing jQuery

- Replace per-mission `index.html` files with a single shared `index.html`
  template. Per-mission meta tags (og:image, etc.) come from mission config
  and get injected at build time (Vite plugin or a small build script that
  emits one HTML file per mission route).
- Convert the load-order spaghetti in `<head>` into ESM imports in
  `src/main.ts`.
- **Begin jQuery removal.** Introduce `src/dom/index.ts` (typed `qs`, `qsa`,
  `on`, `html`, class/attr helpers). Route the highest-traffic jQuery call
  sites through it. Goal is no `import $ from 'jquery'` by end of Phase 5;
  Phase 3 lands the shim and migrates the entry/bootstrap code.

**Verification:** `npm run check` passes. Manual browser comparison at all
three missions — check the full checklist from the Verification section
above. Give specific attention to console errors (load-order bugs are most
likely here) and the Network tab (confirm all scripts load from the expected
paths, no 404s). Playwright visual diff: informational; note any regressions
but don't block on them yet.

**Exit criterion:** one `index.html`, three working missions, same UX, the
`src/dom/` shim exists and the bootstrap path is jQuery-free. Per-mission
progressive dev pages exist at `/dev/{11,13,17}/` (initially: mission name

- live clock readout via `src/shell/clock.ts`, booted through
  `src/main.ts` against `window.MISSION`). From this phase onward, every
  typed engine/panel landed in `src/` must be wired into the matching
  `/dev/{N}/` page before the work is considered done.

## Phase 4 — Extract shared engines (typed, tested)

Tackle in this order (most independent first). Each becomes a `.ts` module
with **Vitest unit tests landing alongside it**, and its jQuery usage
removed in favor of `src/dom/`:

1. **Clock + GET conversion** → `src/shell/clock.ts`. Pure functions, easy;
   first real unit-test target.
2. **CSV loader** → `src/data/csvLoader.ts`. Collapse the three `ajax.js`
   implementations into one typed loader; unit-test parsing + GET indexing
   against fixture CSVs.
3. **YouTube player wrapper** → `src/engines/ytplayer/`. The duplicate
   iframe-API load goes away.
4. **Paper.js navigator** → `src/engines/navigator/` (Paper.js vendored +
   pinned). Largest engine; do this when the others are stable.
5. **Audio scheduler** → `src/engines/audio/`.

After each extraction, all three missions must still pass the side-by-side
check.

**Verification:** `npm run check` + `vitest run` (unit tests for the modules
extracted this phase). Each extracted module is also wired into `/dev/` (raw
module harness) and into all three `/dev/{N}/` pages it applies to — the
agent's first behavioral check is opening those pages in a real browser and
exercising the new module against real mission data, before any side-by-side
against legacy. After clock extraction: paste a known GET string into the
dev console at `/dev/`, confirm round-trip; on `/dev/{N}/` the live clock
readout should tick. After CSV loader: open Network tab on `/dev/13/` and
confirm `utteranceData.csv` loads once, scrub through the timeline and
watch the transcript stub update. Playwright visual diff against the legacy
`/{N}/` pages after each extraction: should be 0 pixel changes (legacy
pages are unchanged); any diff is a bug.

**Exit criterion:** `index.js` is gone (lifted into typed modules); clock
and CSV loader have Vitest unit tests; engines no longer use jQuery. Each
extracted engine is exercisable at `/dev/{N}/` for every mission it applies
to.

## Phase 4.5 — MOCRviz refactor

MOCRviz is a fundamental part of A11 and A13 today, embedded via an
`<iframe>`. Replace that:

- Move `MOCRviz/` contents into `src/panels/mocrviz/` (ES modules) with
  its assets in `public/{N}/mocrviz/`.
- Drop the iframe; mount as a regular panel that shares the clock + CSV
  data engines from Phase 4.
- Remove any `postMessage` glue between parent app and MOCRviz iframe.
- Lazy-load the panel (it's the largest single asset block).
- Gated by `mission.features.mocrviz` (true for A11/A13 initially).

**Verification:** Before starting: check the current MOCRviz on prod in A11
and A13 — screenshot the panel open, note what mission-time it's synced to.
During the refactor: mount the new ESM MOCRviz panel on `/dev/11/` and
`/dev/13/` as soon as it loads at all (even if it can't sync yet), then
iterate in-browser. After refactor: open the staging A13 MOCRviz panel,
scrub the main player forward and back, confirm MOCRviz follows the main
clock in real time (no iframe lag or postMessage gap). Repeat on A11. Run
Playwright visual diff on the MOCRviz snapshot if one exists in the
baseline set; otherwise add one now.

**Exit criterion:** A11 and A13 render MOCRviz natively (no iframe), and
MOCRviz reacts to scrubbing/playback from the main player in real time.
Playwright baselines for the MOCRviz view still match.

## Phase 5 — Extract panels (finish jQuery removal)

Convert each panel (TOC, transcript, commentary, photos, telemetry, crew
status) into a self-contained `.ts` module. Move per-mission-only panels
(geology, heartrates) behind `mission.features.*` flags. **Remove the last
jQuery call sites** as each panel is converted; delete the `jquery` dep when
the final one is gone. Add **browser tests** (`tests/browser/`) for panels
with non-trivial DOM behavior (transcript scrolling, photo grid, search).

**Verification:** `npm run check` with zero jQuery remaining (confirm by
running `grep -r '\$(' src/` — should be empty or only in `.spec` fixtures).
Each panel converted to ESM gets wired into `/dev/{N}/` first; the
per-mission dev page is the panel author's working surface throughout the
phase. At end of phase, `/dev/{N}/` should be visually and behaviorally
close to legacy `/{N}/` — that closeness is the cue that Phase 5 is
converging. Playwright visual diff against the legacy `/{N}/` pages:
**blocking from this phase onward** — all 54 baseline images must match
within tolerance (legacy pages are still the oracle until Phase 7 cutover).
Manual browser test for each panel's non-trivial behavior: transcript
auto-scroll at a dense dialogue section, photo lazy-load scroll, search
overlay open/close/result-click, telemetry chart at several GET points.

**Exit criterion:** `src/panels/*.ts` exists, each panel can be loaded /
unloaded without breaking the rest, no jQuery remains in the bundle, and
key panels have browser tests.

## Phase 6 — CSS unification + responsive (mobile-replacement)

- Collapse three `styles.css` files into `src/styles/base.css` +
  `src/styles/panels/*.css`.
- Extract per-mission colors and accents into CSS custom properties driven
  by `<body data-mission="13">`.
- Per-mission stylesheet (`src/styles/missions/{N}.css`) only contains
  overrides; the goal is for each to be < 100 lines.
- **Add responsive breakpoints** (phone-portrait, phone-landscape, tablet,
  desktop). This phase owns the work the old `/mobile/` subdir used to do.
  The unified app must be usable end-to-end on a phone.
- Add 301 redirects: `/{N}/mobile/...` → `/{N}/`.

**Verification:** Manual browser comparison at all three missions using
DevTools responsive mode for each breakpoint (390 px phone, 768 px tablet,
1440 px desktop). Walk through the full panel checklist at phone viewport:
navigator monitor readable, video plays, dashboard panels accessible,
transcript scrollable. Playwright phone baselines must pass.

**Exit criterion:** one base stylesheet, three tiny override files, visual
diff to production is acceptable on desktop **and** Playwright phone
baselines pass.

## Phase 7 — Cutover

- Deploy `AiRT2` build output to `apolloinrealtime.org` (and `/11`, `/13`,
  `/17` paths).
- Add redirects for `/{N}/mobile/*` → `/{N}/` and 404 (or 301) for the
  retired `spacecraft_dev/` and `nominee/` paths.
- Verify **every** captured Playwright baseline still passes on the
  production build.
- Keep old repos in a `legacy/` branch on the server for one week as
  rollback.
- Monitor analytics, share-link traffic, console errors.

**Verification:** Final `npm run check` on the production build (`npm run build
&& npx tsc -p tsconfig.json --noEmit`). Run the full Playwright suite against
the built output served locally (`npx vite preview`) — all 54 baselines
must pass before any DNS change. Check all six deep-link GET snapshots for
each mission manually (open `apolloinrealtime.org/13/?t=055:54:53` on staging,
confirm it lands at the right GET and plays). After DNS cutover: repeat the
manual deep-link checks against the live domain.

**Exit criterion:** four weeks post-cutover with no regression reports.
The `/dev/` and `/dev/{N}/` scaffolding pages are removed from the
production build (kept in dev only).

## Phase 8 — Cleanup + future missions

- Confirm zero runtime dependencies (jQuery gone, Paper.js vendored). Run a
  bundle audit to prove the shipped output is dependency-free.
- Add `src/missions/{8,12,14,15,16}.config.ts` + `public/{N}/` payloads
  as their data becomes ready. The typed mission-config + standardized CSV
  schema work done in earlier phases makes this drop-in.
- Tighten the responsive layout based on real-world phone usage data.

## Parallel: data-ingestion track (uv + Python 3)

Runs alongside Phases 1–7, not blocking them. **Replaces** the old Python
rather than migrating it (00-C9). Only transcript generation and
photo-timing correction are ongoing tools; the rest of the old scripts are
reference-only.

- **P-1** Stand up `pipeline/` with **uv** (`uv venv`, `uv.lock`), Python
  3.12+, ruff + black + mypy, pinned. Define the `airt-ingest` CLI skeleton.
- **P-2** Define + lock the canonical CSV schema in `docs/csv-schemas.md`
  (mirrored by `src/types/csv.ts`); define the standardized per-mission
  input layout in `docs/data-inputs.md`.
- **P-3** Implement A13 first (matches canonical base): `transcripts`,
  `photo-timing`, `build`, `validate`. Reproduce A13's `indexes/` from
  standardized inputs and diff against the committed CSVs to prove parity.
- **P-4** Implement A11 then A17.
- **P-5** Optional: improve transcription (newer Whisper models) — a content
  decision, not tooling; deferred.

May be delegated to a sub-agent — see the open follow-ups in 06. Network
(scraping) and GPU (transcription) needs affect where it runs.

## Estimated complexity (not time)

| Phase                      | Complexity  | Risk                               |
| -------------------------- | ----------- | ---------------------------------- |
| 0 — scaffold + baselines   | low         | low                                |
| 1 — lift A13               | low         | low                                |
| 2 — mission config         | medium      | low                                |
| 3 — unified entry          | medium      | medium (load-order bugs)           |
| 4 — engines                | high        | medium                             |
| 4.5 — MOCRviz refactor     | medium-high | medium (iframe state untangling)   |
| 5 — panels                 | medium      | low                                |
| 6 — CSS + responsive       | medium-high | medium (phone parity is real work) |
| 7 — cutover                | low         | medium (URL/SEO/share-link)        |
| 8 — cleanup + new missions | varies      | low                                |
| Data-ingestion track       | medium      | low (parallel, non-blocking)       |

The risk concentration is in Phases 3, 4, 4.5, and 6.
