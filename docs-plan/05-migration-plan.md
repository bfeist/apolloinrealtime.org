# 05 — Migration plan (phased)

> **Agent:** Read [08-progress-tracker.md](08-progress-tracker.md) before
> starting any work session. Agent operating rules (subagent delegation,
> commit hygiene, what not to do) are in
> [.github/copilot-instructions.md](../.github/copilot-instructions.md).
> Update the tracker before ending every session.

## Strategy (binding — read before phase work)

This is a **greenfield port**, not a gradual conversion. The new app is
built end-to-end in `src/` (plus its dev pages under `dev/`) until it has
full feature parity with the legacy missions. Then we **cut over once**,
deleting the legacy sources. There is no intermediate hybrid state in
production.

Specifically:

1. **The legacy code is reference-only.** `legacy/` (subtree imports of the
   four original repos) is permanently read-only. `legacy-src/{11,13,17}/`
   and `public/{11,13,17}/index.js` / `navigator.js` / `ajax.js` / `lib/*` /
   `MOCRviz/*` exist solely as the **production-equivalence oracle**: we
   open the live legacy `/{N}/` pages and compare behavior. We do **not**
   edit them to slowly integrate new code into them, and we do not "convert
   call sites" inside them. They are deleted in Phase 7 (cutover), not
   piecemeal.
2. **The new app is built independently.** Every typed module lives in
   `src/`. Every behavioral check during Phases 4 / 4.5 / 5 / 6 happens on
   `/dev/{N}/` (which boots through `src/main.ts` against the typed
   `MissionConfig` and loads only typed ESM modules — never legacy
   `index.js` / `navigator.js` / `ajax.js`). The new app must run
   stand-alone before cutover.
3. **jQuery is not removed from the legacy code — by construction, the
   new code never used it.** `src/dom/index.ts` is the typed DOM shim; no
   `src/**` file ever imports jQuery. The "remove jQuery" milestone that
   appeared in earlier drafts of this plan was a hybrid-era artifact; it
   is dropped. jQuery disappears from the deployed bundle the moment the
   legacy `public/{N}/index.js` etc. are deleted in Phase 7.
4. **Cutover is atomic.** Phase 7 (a) builds the new app at `/{N}/` paths,
   (b) deletes the legacy `public/{N}/` script payloads, (c) replaces
   `{N}/index.html` with the new app's HTML shell, (d) deploys. Before
   that moment, `apolloinrealtime.org` keeps serving the old repos
   unchanged.
5. **No "hybrid" feature flags.** We do not ship a build that mixes legacy
   `index.js` with typed ESM modules. The two systems coexist only on the
   developer machine: `/{N}/` runs the legacy lift (oracle), `/dev/{N}/`
   runs the typed app (under construction).

Principle throughout: **never have a "the new site doesn't work yet" window
in production.** The legacy repos keep serving until the new app passes a
side-by-side check and lands in Phase 7.

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
  `src/` and exposes button-driven smoke tests (input → output). No mission
  config — pure module surface.
- **`/dev/{11,13,17}/` — per-mission progressive pages.** A near-blank
  shell per mission that boots through `src/main.ts` against the typed
  `MissionConfig`, loading **only** typed ESM modules. No legacy
  `index.js`, `ajax.js`, or `navigator.js` — ever. This is where the agent
  verifies a fresh extraction behaviorally in a real browser. By the end
  of Phase 5 this page mounts every typed engine and panel; in Phase 6 it
  grows into the production HTML shell.

Rules for the `/dev/{N}/` pages:

- They are the in-flight version of the production app. By Phase 6 they
  effectively become the production page (Phase 6 promotes the layout +
  CSS work; Phase 7 swaps URLs).
- The legacy `/{N}/` pages remain the production-equivalence oracle until
  Phase 7. They stay byte-for-byte the lift from Phase 1 (head injection
  aside). Never edit them to integrate typed modules.
- Every typed module added to `src/engines/` or `src/panels/` MUST be wired
  into all three `/dev/{N}/` pages it applies to before that module is
  considered "done". The author is the first user of their own module in
  context.

### 3. Manual browser comparison (every phase exit)

Open the new app and the legacy app **side by side in two browser windows**
at the same mission, same GET, same viewport:

```
# Local dev server on one port, legacy oracle on a second tab
npm run dev  # -> http://localhost:5173/dev/13/   (new app)
#               http://localhost:5173/13/         (legacy oracle, unmodified)
# Prod:        https://apolloinrealtime.org/13/   (legacy in production)
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
phone 390) = 54 baseline images. Stored in
`tests/visual/baseline.spec.ts-snapshots/`.

The baselines were captured against the **legacy** `apolloinrealtime.org`
pages in Phase 0; they are the regression oracle for the new app. Visual
diffs are **informational** during Phases 3 / 4 / 4.5 / 5 (the new app at
`/dev/{N}/` is intentionally not pixel-equivalent yet). They become
**blocking** in Phase 6 (when the new app's HTML/CSS shell goes live at
`/dev/{N}/`) and again at Phase 7 pre-cutover.

### Lint — yes, it matters here

With ~3,000 lines of global-variable JS being **re-implemented** as typed
modules (not converted, not lifted — re-implemented while reading the
legacy as reference), the biggest risk category is **silent correctness
bugs**: a column name typo that's only caught at runtime, an off-by-one in
a binary search, an optional chain that masked a missing field. ESLint
with strict TypeScript rules catches a meaningful fraction of these at
commit time.

Rule set used (in `eslint.config.js`, flat config):

```js
// flat config excerpt
import tseslint from "typescript-eslint";

export default tseslint.config(
  tseslint.configs.strictTypeChecked, // includes no-explicit-any, no-unsafe-*
  tseslint.configs.stylisticTypeChecked,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
);
```

Prettier runs separately (`eslint-config-prettier` turns off formatting
rules so they don't conflict):

```bash
npm run format          # prettier --write src/
npm run format:check    # CI: fails on any diff
```

Editor integration: recommend the ESLint + Prettier VS Code extensions with
"format on save" and "fix all on save" enabled — that way lint errors
surface in the editor before they ever hit the terminal.

**`legacy-src/` and `public/{N}/*.js` are excluded from ESLint** (they are
reference-only lifted code, never modified). Only `src/` is linted.

## Phase 0 — Scaffolding + baseline capture

- Stand up Vite + **TypeScript** (strict), ESLint (flat config,
  `typescript-eslint` `strictTypeChecked`), Prettier (reuse the existing
  `.prettierrc.json`), **Vitest** for unit tests. Wire them all into a
  single `npm run check` script so the full gate is one command.
- **Prettier and ESLint are enforced from commit #1.** All new code in
  `src/` must pass `tsc + eslint + prettier --check` before merging.
- **Pin the toolchain for longevity:** `.nvmrc`, exact (non-caret) versions in
  `package.json`, commit the lockfile.
- Stand up **Playwright** and capture baseline screenshots from production
  (`apolloinrealtime.org/{11,13,17}/`) at the 18 GET snapshots defined in
  the Verification section above (6 per mission × 3 viewports = 54 images).
  These are the regression oracle for every subsequent phase.
  **Do this before touching anything.**
- Scaffold the test layout: `tests/unit/` (Vitest), `tests/browser/`
  (Vitest browser mode / Playwright component — starts empty, grows per
  phase), `tests/visual/baseline.spec.ts-snapshots/`.
- Canonical base = **Apollo 13** (locked).
- Wire `AiRT2/` to a staging URL (e.g. `airt2.apolloinrealtime.org` or a
  Cloudflare Pages preview) so every phase is visible.

**Exit criterion:** `npm run dev` serves a Vite shell; `npm run check`
passes; 54 Playwright baseline screenshots checked in.

## Phase 1 — Lift legacy oracles into the repo

- Copy each mission's `_webroot/` contents into `public/{N}/` (and the
  text-and-script files into `legacy-src/{N}/` for grep convenience).
- Make `{N}/index.html` serve the legacy markup with its existing script
  tags. No ESM yet.
- Confirm each mission boots in dev exactly like production.

This is the **last time** these files are written to. From here on,
`public/{N}/` and `legacy-src/{N}/` are read-only reference. Any new code
goes in `src/`.

**Exit criterion:** All three missions boot identically to production at
`/{11,13,17}/` from the local dev server.

## Phase 2 — Typed mission config

- Create `src/types/mission.ts` (`MissionConfig` type) and
  `src/missions/{11,13,17}.config.ts` populated from each legacy
  `var c*` block.
- **Strip KeyCDN here:** the typed config carries a single `mediaRoot`
  pointing at `media.apolloinrealtime.org`.
- Inject `window.MISSION = {...}` into each legacy `<head>` via a Vite
  plugin so the lifted `index.js` reads it (this is the one allowed
  cross-cutting tweak — it's a head injection on top of the lift, not a
  modification of `public/{N}/index.js`).

**Exit criterion:** All three missions boot at `/{N}/` using only the
typed mission config for per-mission constants; no KeyCDN references
remain.

## Phase 3 — Shared head + ESM entry stub

- Replace the per-mission `<head>` with a shared builder
  (`src/template/head.ts`) driven by `MissionConfig`. Both dev and build
  apply the same transform.
- Create `src/main.ts` (ESM entry) and `src/dom/index.ts` (typed DOM shim).
  In Phase 3 `main.ts` just verifies the runtime context (`window.MISSION`
  is set) and re-exports the DOM shim. It does **not** integrate with the
  legacy `index.js`.
- Create `/dev/{11,13,17}/index.html` + `src/dev/missionHarness.ts`. These
  pages do **not** load legacy `index.js` / `ajax.js` / `navigator.js`.
  They are the surface the rest of the migration is built on.

**Exit criterion:** Shared head builder + `/dev/{N}/` shells live; the
legacy `/{N}/` pages still boot identically to production (now with the
typed head + injected mission config); `/dev/{N}/` shows mission name and
a typed-clock readout.

## Phase 4 — Extract shared engines (typed, tested)

For each engine: implement in `src/` with Vitest unit tests, wire into
`/dev/` (raw harness) and into all three `/dev/{N}/` pages it applies to.
The legacy `public/{N}/*.js` files are **read for reference only** — they
are never imported, called, or modified.

1. **Clock + GET conversion** → `src/shell/clock.ts`.
2. **CSV loader** → `src/data/csvLoader.ts`. Pipe-delimited fetch +
   parse + cache-bust. Unit-tested against fixture CSVs.
3. **YouTube player wrapper** → `src/engines/ytplayer/`.
4. **Paper.js navigator** → `src/engines/navigator/` (`layout.ts` +
   `renderer.ts` + `paperApi.ts`). Paper.js is vendored at
   `public/{N}/lib/paper-full.js` and loaded via the shared head; the
   typed renderer accepts an injected `PaperScopeLike` (no `npm install
   paper`).

**Exit criterion:** All five typed reference modules exist in `src/` with
Vitest tests and are exercisable on `/dev/{N}/` for every mission they
apply to.

## Phase 4.5 — MOCRviz typed re-implementation

> **Gate:** Before starting, take a reference screenshot of the MOCRviz
> panel open in A11 and A13 at a known GET (legacy `/{N}/` only). This
> is the before-state for Ben's verification.

MOCRviz is a fundamental part of A11 and A13 today, embedded via an
`<iframe>` whose internals are jQuery + peaks.js + per-channel MP3
playback (`MOCRviz/MOCRviz.js`'s `gPlayer` + `loadChannelSoundfile()`).

- Re-implement as a typed ESM panel at `src/panels/mocrviz/`. Assets
  (waveform PNGs, channel MP3s, calibration JSON) stay under
  `public/{N}/MOCRviz/` (reference data, not code).
- No iframe; mount as a regular panel inside the typed app. Shares the
  Phase 4 clock + CSV data engines.
- No jQuery; no peaks.js (replace with the small subset we actually use —
  static waveform PNG + a typed playhead overlay).
- Lazy-load the panel module (it's a large code unit).
- Gated by `mission.features.mocrviz` (true for A11/A13).
- Unit-test the pure pieces: channel index, time-to-pixel mapping,
  channel filename resolution.

**Verification:** Mount the new ESM MOCRviz panel into `/dev/11/` and
`/dev/13/` as soon as it loads at all (even before audio works), then
iterate in-browser. After: scrub the typed clock forward and back, confirm
the MOCRviz playhead and channel audio follow without lag. Compare the
playhead position at fixed GETs to the legacy `/{N}/` MOCRviz iframe.
Update the Playwright snapshot set if needed.

**Exit criterion:** Typed MOCRviz mounts on `/dev/{11,13}/`, plays audio
on at least the default channel, follows the typed clock when scrubbing,
and visually matches the legacy waveform/playhead at the listed snapshot
GETs.

## Phase 5 — Data layer, navigator overlays, and panels

Phase 5 has three sub-tracks. Each must pass `npm run check` before the
next starts. All work happens in `src/` and `/dev/{N}/`. **Nothing in
`public/{N}/` or `legacy-src/{N}/` is modified.**

### Track A — Typed CSV data loaders

A typed loader + row type per CSV the legacy app reads. All loaders live
in `src/data/`; TypeScript row types in `src/types/data.d.ts`. Each has
Vitest unit tests against fixture CSVs and is wired into the
`/dev/{N}/` page (current entry at the live GET, refreshed per second).
Loaders: `csvLoader`, `tocData`, `missionStagesData`, `videoSegmentData`,
`commentaryData`, `utteranceData`, `photoData`, `videoUrlData`,
`crewStatusData`, `telemetryData`, `orbitData`.

### Track B — Navigator data overlays

Extend `renderer.ts` with draw groups that consume the typed data loaders.
Additive: the existing renderer API and tests are unchanged. Each overlay
gets unit tests and is wired into the `/dev/{N}/` navigator section.

Draw order mirrors the legacy `drawTier1` / `drawTier2`:

1. **Mission-stage ticks** (`missionStagesData`): half-height tick at each
   stage start in tier 1; tick + stage-name label in tier 2 within the
   visible window. Stroke `"grey"`, text `"lightgrey"`.
2. **Video-segment rectangles** (`videoSegmentData`): filled rectangle at
   the bottom of each tier (height
   `= tierHeight / gHeightVideoRectDenominator`). Regular: fill `"#010047"`
   / stroke `"blue"`. 3D/graph: fill `"#270047"` / stroke `"#4D0062"`.
3. **Photo ticks** (`photoData`): bottom-aligned tick in each tier.
   Color `"#00C000"`.
4. **TOC ticks + labels** (`tocData`): one-third-height tick from the
   bottom in tiers 2 and 3. Level-1 items get a text label.
   Tick `"orange"`, label `"#999999"`.

### Track C — Typed panels

A typed panel per legacy panel, in `src/panels/`. Each is jQuery-free,
iframe-free, mounted in `/dev/{N}/`, and unit-tested where it has
non-trivial pure logic (utterance-class mapping, telemetry interpolation,
search index/match, photo URL parsing, wake-up countdown, etc.). Panels:
TOC, transcript, commentary, photo, telemetry, crew status, dashboard,
search.

**Exit criterion (Phase 5):** All 11 data loaders, all four navigator
overlay types, and all eight panels live in `src/`. `/dev/{N}/` mounts
every one of them. `npm run check` passes. The new app at `/dev/{N}/` is
behaviorally close to legacy `/{N}/` at the snapshot GETs (panels show
the right content; only the page chrome/layout differs because Phase 6
hasn't built that yet).

## Phase 6 — Production HTML shell + CSS + responsive

Phase 6 turns `/dev/{N}/` into the production app. The legacy `/{N}/`
pages remain unchanged as the oracle.

- Author **one** HTML shell template in `src/template/page.ts` (or an
  `index.html` partial driven by `MissionConfig`) that composes the
  header (logo + mission title + GET input + navigator), the video block
  (with player + search/dashboard overlays), the tabs (transcript / TOC /
  commentary), the channel selector, and footer.
- Author the **unified stylesheet** in `src/styles/base.css` +
  `src/styles/panels/*.css`. Per-mission accents come from CSS custom
  properties keyed off `<body data-mission="{N}">`. Per-mission stylesheet
  (`src/styles/missions/{N}.css`) only contains overrides; target < 100
  lines each.
- **Wire the typed engines and panels into the shell** in `src/main.ts`:
  clock ticking, navigator mounted on `#navCanvas`, video player mounted,
  channel selector hooked to MOCRviz/audio scheduler, panels mounted into
  their tabs, search/dashboard overlays wired, deep-link GET parsing.
- **Add responsive breakpoints** (phone-portrait, phone-landscape, tablet,
  desktop). This phase owns the work the old `/mobile/` subdir used to
  do. The unified app must be usable end-to-end on a phone.
- `/dev/{N}/` is updated to use the production HTML shell (the dev-only
  diagnostic readouts move to `/dev/` raw harness or are deleted).

**Verification:** Side-by-side `/dev/{N}/` vs legacy `/{N}/` at every
snapshot GET and every viewport (phone, tablet, desktop). Playwright
visual diff is **blocking** from this phase onward. Walk the full panel
checklist at phone viewport.

**Exit criterion:** `/dev/{N}/` is the production app: one base
stylesheet, three tiny override files, the typed shell composes every
engine and panel, Playwright phone/tablet/desktop baselines pass.

## Phase 7 — Cutover (atomic, one shot)

This is the only phase that touches `public/{N}/`. It is destructive and
irreversible from a repo perspective (old repos are preserved separately
as rollback).

Sequence:

1. **Pre-flight:** Full Playwright suite green at every viewport + every
   snapshot GET against the built output served locally
   (`npx vite preview`). All 54 baselines pass. Manual deep-link spot
   check at every snapshot GET in every mission.
2. **Delete the legacy production payloads** in one commit:
   `public/{11,13,17}/{index.js,navigator.js,ajax.js,robots.txt,TOC.html,navigator_dev.{html,js}}`,
   `public/{11,13,17}/lib/` (jQuery + jQuery plugins + Paper.js stays only
   if Phase 4 keeps loading it as a vendored runtime), `public/{N}/MOCRviz/*.{html,js,css}`
   (waveform PNGs + audio + calibration JSON in `data/` and `img/` stay —
   they're reference data the typed MOCRviz reads). The legacy `styles.css`
   is deleted; the new `src/styles/` is what ships.
3. **Promote the new HTML shell** as each mission's `{N}/index.html`. The
   `/dev/{N}/` URLs and the `/dev/` raw harness are removed from the
   production build (they remain in dev for future feature work).
4. `legacy/` (the four subtree-imported repos) stays committed —
   permanent reference, never deleted.
5. **Deploy** the build to `apolloinrealtime.org`. Add 301 redirects for
   `/{N}/mobile/*` → `/{N}/` and 410/301 for retired
   `spacecraft_dev/` and `nominee/` paths.
6. Keep the **old apolloinrealtime.org code** (separate repo / branch) in
   a hot rollback slot for one week.
7. Monitor analytics, share-link traffic, console errors.

**Exit criterion:** Four weeks post-cutover with no regression reports.
Cutover commit can be reverted to the previous commit (which still has
the legacy payloads under `public/{N}/`) if needed within the rollback
window.

## Phase 8 — Cleanup + future missions

- Bundle audit to prove the shipped output is dependency-free (no jQuery,
  no peaks.js; Paper.js vendored if still needed).
- Add `src/missions/{8,12,14,15,16}.config.ts` + `public/{N}/` payloads
  (indexes/, img/, MOCRviz data assets) as their data becomes ready. The
  typed mission-config + standardized CSV schema work done in earlier
  phases makes this drop-in.
- Tighten the responsive layout based on real-world phone usage data.

## Parallel: data-ingestion track (uv + Python 3)

Runs alongside Phases 1–7, not blocking them. **Replaces** the old Python
rather than migrating it (00-C9). Only transcript generation and
photo-timing correction are ongoing tools; the rest of the old scripts
are reference-only.

- **P-1** Stand up `pipeline/` with **uv** (`uv venv`, `uv.lock`), Python
  3.12+, ruff + black + mypy, pinned. Define the `airt-ingest` CLI
  skeleton.
- **P-2** Define + lock the canonical CSV schema in `docs/csv-schemas.md`
  (mirrored by `src/types/data.d.ts`); define the standardized
  per-mission input layout in `docs/data-inputs.md`.
- **P-3** Implement A13 first (matches canonical base): `transcripts`,
  `photo-timing`, `build`, `validate`. Reproduce A13's `indexes/` from
  standardized inputs and diff against the committed CSVs to prove
  parity.
- **P-4** Implement A11 then A17.
- **P-5** Optional: improve transcription (newer Whisper models) — a
  content decision, not tooling; deferred.

May be delegated to a sub-agent — see the open follow-ups in 06. Network
(scraping) and GPU (transcription) needs affect where it runs.

## Estimated complexity (not time)

| Phase                          | Complexity  | Risk                                  |
| ------------------------------ | ----------- | ------------------------------------- |
| 0 — scaffold + baselines       | low         | low                                   |
| 1 — lift legacy oracles        | low         | low                                   |
| 2 — mission config             | medium      | low                                   |
| 3 — head + ESM entry stub      | medium      | low                                   |
| 4 — engines                    | high        | medium                                |
| 4.5 — MOCRviz typed            | medium-high | medium (audio + waveform sync)        |
| 5 — data, overlays, panels     | medium      | low                                   |
| 6 — production shell + CSS     | high        | medium-high (full layout + phone)     |
| 7 — atomic cutover             | low (code)  | medium-high (URL/SEO/share-link/DNS)  |
| 8 — cleanup + new missions     | varies      | low                                   |
| Data-ingestion track           | medium      | low (parallel, non-blocking)          |

The risk concentration is in Phases 4, 4.5, 6, and 7.
