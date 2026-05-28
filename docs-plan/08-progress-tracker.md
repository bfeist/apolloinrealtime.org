# 08 — Progress tracker

This is the ground truth for the current state of the AiRT2 migration.
Every agent session must read this first and update it before ending.

---

## ⏩ Resume here

**Status:** Phases 1–3 complete (Ben confirmed Phase 3). Phase 4 in progress: four typed reference modules landed as additive ESM (legacy `index.js`/`ajax.js`/`navigator.js` not touched, per the wire-up lesson below):

- `src/shell/clock.ts` + 28 unit tests
- `src/data/csvLoader.ts` (pipe-delimited CSV parse + fetch + cache-bust) + 13 unit tests
- `src/engines/ytplayer/index.ts` (typed YouTube IFrame API loader with promise + cache + chain-onto-existing-callback) + 3 unit tests
- `src/engines/navigator/layout.ts` (pure tier layout + seconds<->x mapping per tier + nav box position/clamp + `tier{2,3}StartSeconds` derivation, no Paper.js, no DOM) + 23 unit tests

68/68 tests green; `npm run check` green.

**Browser dev harness:** `dev/index.html` + `src/dev/harness.ts` give a button-driven page at `http://localhost:5173/dev/` that imports each typed module directly and exercises it in the browser (clock conversions and round-trips; CSV loader against `/13/indexes/utteranceData.csv`; YouTube IFrame API load + cache). No legacy `index.js` is involved on this page — purely the Phase 4 modules. Use this to verify each module behaviorally in a real browser without touching mission pages. Confirmed all three URLs return 200 from the dev server.

**Realistic path through remaining Phase 4 / 4.5 / 5 work (multi-session):**

1. **Paper.js navigator rendering** — `layout.ts` (pure math) landed this session. Still to do: the Paper.js drawing layer (`drawTier1/2/3`, `drawCursor`, `drawNavCursor`, nav box rectangles, mouse handlers) as a separate `renderer.ts` that takes the `NavigatorLayout` from this module. That layer is tightly coupled to mission state + `paper.view` and is the natural Phase 5 entry point for navigator wire-up.
2. **Audio scheduler** — inventory needed; not yet read.
3. **Phase 4.5 MOCRviz** — iframe-to-ESM is inherently runtime-changing; needs Ben's verification gate before and after.
4. **Phase 5 panels** (TOC, transcript, commentary, photos, telemetry, crew, dashboard, search) — each is its own conversion + jQuery removal + browser test. Plan declares Playwright visual diff blocking from this phase onward.
5. **jQuery removal** — follows the last panel conversion; delete the dep.

**Important lesson (this session):** Do NOT shim legacy globals via `window.X` from the ESM entry. Two reasons:

1. In prod the head builder is called with `{ includeEsmEntry: false }` — `src/main.ts` doesn't load at all, so `window.X` is undefined.
2. Even in dev, `<script type="module">` is deferred to run AFTER all classic scripts. Legacy `index.js` registers handlers and starts intervals during parse; the module isn't resolved yet.

Phase 4 modules are parallel typed references; legacy callers stay on their inline copies until the caller itself converts to ESM in Phase 5.

**Next action (agent):** Continue Phase 4 with audio scheduler inventory + extraction, OR begin the navigator Paper.js renderer layer on top of `layout.ts`. Hold MOCRviz and panels until at least one full side-by-side verification of an engine reference module against legacy behavior.

**Notes from this session (Phase 3):**

- `MissionConfig` extended with `meta` (title, description, ogImage, ogUrl, fbAppId) and `head` (paperVariant, includeYouTubeIframeApi, stylesCacheBust, extendedFavicons, manifestFile). All three configs populated to reproduce each mission's legacy head verbatim.
- New: `src/template/head.ts` — `renderMissionHead(config, { includeEsmEntry })` builds the shared head HTML (5 cache/copyright metas, mission title + og/fb/desc/image_src, favicon set, robots, stylesheet, GA, full lib script chain in legacy order, navigator.js/index.js/ajax.js, optional `<script type="module" src="/src/main.ts">`).
- New: `src/dom/index.ts` — typed DOM shim (`qs`, `qsa`, `on`, `delegate`, `ready`, `setText`, `setHtml`, class/attr helpers, `show`/`hide`). API kept small and intentional; expand as concrete migration sites need it.
- New: `src/main.ts` — ESM bootstrap entry. For now only verifies `window.MISSION` is set and emits a console.warn. Future phases will move engine init here.
- `vite.config.ts`: `injectMissionConfig` plugin now REPLACES the full `<head>...</head>` (no longer just prepends a script). New `applyHeadInjection` helper is shared between the dev plugin (`transformIndexHtml`) and the build plugin (`copyLegacyHtml.closeBundle`), so dev and prod produce the same head. Build path passes `{ includeEsmEntry: false }` because the TS module isn't bundled into a stable chunk yet (Phase 4 follow-up).
- Each `{N}/index.html` now contains only `<html><head></head><body>...</body></html>` (head fully config-driven).
- ESLint: `qs`/`qsa` had unnecessary-type-parameter warnings; reverted to a non-generic signature returning `HTMLElement | null` / `HTMLElement[]`. Callers cast at the site if a more specific element type is needed.
- A17 `<title>` text preserved verbatim ("Apollo 17 in Real-time", lowercase + hyphen). og:title and og:site_name use the title-cased form (the head builder rewrites "Real-time" → "Real Time" for those tags only), matching legacy prod.

---

## Phase status

| Phase                            | Status      | Notes                                                                                                                                                                                                                                                    |
| -------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git init + subtree imports       | done        | All 4 repos on master; LFS migration + prune applied                                                                                                                                                                                                     |
| 0 — Scaffold + baseline capture  | done        | Vite/TS/ESLint/Prettier/Vitest/Playwright pinned; 54 prod baselines captured (Windows host)                                                                                                                                                              |
| 1 — Lift A13                     | done        | All three missions (A11, A13, A17) files lifted to `public/{N}/` and `legacy-src/{N}/`. Dev boots clean. Ben confirmed on all three.                                                                                                                     |
| 2 — Mission config (typed)       | done        | Typed `{11,13,17}.config.ts`; `window.MISSION` wired; KeyCDN stripped. Ben confirmed all three.                                                                                                                                                          |
| 3 — Unified entry + jQuery start | done        | Shared head builder + ESM entry + jQuery shim landed. `npm run check` + `npm run build` green. Ben confirmed head is correct, all 3 missions load clean.                                                                                                 |
| 4 — Extract engines              | in-progress | Reference modules landed: `src/shell/clock.ts` (28 tests), `src/data/csvLoader.ts` (13 tests), `src/engines/ytplayer/index.ts` (3 tests), `src/engines/navigator/layout.ts` (23 tests — pure layout + coord math, no Paper.js). Still to do: navigator Paper.js renderer layer, audio scheduler. Legacy `index.js`/`ajax.js`/`navigator.js` unchanged (consumed in Phase 5). |
| 4.5 — MOCRviz refactor           | not started |                                                                                                                                                                                                                                                          |
| 5 — Panels + finish jQuery       | not started |                                                                                                                                                                                                                                                          |
| 6 — CSS + responsive             | not started |                                                                                                                                                                                                                                                          |
| 7 — Cutover                      | not started |                                                                                                                                                                                                                                                          |
| 8 — Cleanup + future missions    | not started |                                                                                                                                                                                                                                                          |
| P-1 Pipeline scaffold (uv)       | not started |                                                                                                                                                                                                                                                          |
| P-2 CSV schema + data-inputs     | not started |                                                                                                                                                                                                                                                          |
| P-3 A13 ingestion                | not started |                                                                                                                                                                                                                                                          |
| P-4 A11 + A17 ingestion          | not started |                                                                                                                                                                                                                                                          |

---

## Decisions made during execution

_(Record here any deviations from the plan, on-the-fly decisions, or
discoveries that change how a future phase should be done.)_

| Date       | Phase    | Decision / Finding                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-28 | Git init | All 4 legacy repos on `master`; subtrees imported oldest-first (A17→A11→A13→landing)                                                                                                                                                                                                                                                                                                                                                |
| 2026-05-28 | Git init | `git lfs migrate import --everything --above=5mb` — 1,464 commits rewritten; large Premiere Pro, OCR, PDF, Sketch files now in LFS                                                                                                                                                                                                                                                                                                  |
| 2026-05-28 | Git init | `git lfs prune` removed 14 transient LFS objects (deleted-file blobs that had no branch-tip reference)                                                                                                                                                                                                                                                                                                                              |
| 2026-05-28 | Git init | Decision in `07-repo-and-git-strategy.md` ("do not run filter-repo to strip assets") updated: we DO strip transient blobs via LFS + prune, but the original legacy repos are untouched                                                                                                                                                                                                                                              |
| 2026-05-28 | Phase 0  | Toolchain pinned with exact (no-caret) versions per longevity principle (A2b). Lockfile committed.                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-28 | Phase 0  | Playwright baseline capture uses `toMatchSnapshot()` (single-shot) instead of `toHaveScreenshot()` because live mission clock at pre-launch/launch never produces two identical frames.                                                                                                                                                                                                                                             |
| 2026-05-28 | Phase 0  | Baselines captured on Windows host; filenames include `-win32` suffix. Re-capture on cutover host (likely Linux CI) before Phase 7.                                                                                                                                                                                                                                                                                                 |
| 2026-05-28 | Phase 1  | A13 `index.html` placed at project root (`13/index.html`), not in `public/13/`. Vite's middleware does not serve `public/*/index.html` for directory URLs; without a root entry, Vite SPA-falls-back to the landing `index.html`. Pattern to repeat for A11/A17: HTML at root, assets in `public/{N}/`.                                                                                                                             |
| 2026-05-28 | Phase 1  | Copied full `_webroot/13/` into `public/13/` (14 MB incl. img/, indexes/, MOCRviz/) so the app is self-contained in dev. Phase 2 will strip KeyCDN references in `index.js`.                                                                                                                                                                                                                                                        |
| 2026-05-28 | Phase 2  | `window.MISSION` injected via Vite `transformIndexHtml` (`head-prepend`) keyed off `/{NN}/index.html` URL. Chosen over a generated public JS file so the TS config stays the single source of truth. Pattern works for dev and build. Legacy `index.js` files keep their `var c*` names but source from `window.MISSION`.                                                                                                           |
| 2026-05-28 | Phase 4  | Do NOT shim legacy globals via `window.X` set from `src/main.ts`. Two reasons: (1) build path uses `{ includeEsmEntry: false }` so `main.ts` doesn't load in prod, and (2) `<script type="module">` is deferred so even in dev it runs after classic `index.js` handlers register. Phase 4 extractions are reference implementations; legacy callers stay on their inline copies until the caller itself converts to ESM (Phase 5). |

---

## Deferred improvements noticed

_(Things worth doing eventually but out of scope for the current phase.
Log them here so they don't get lost.)_

| Noticed in phase | Description |
| ---------------- | ----------- |
|                  |             |

---

## Playwright baseline snapshot inventory

Captured in Phase 0. Delete rows that haven't been captured yet; add rows
as new snapshots are added.

| File                                                                                                                                                                 | Mission  | GET                                       | Viewport                      | Captured           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------- | ----------------------------- | ------------------ |
| `tests/visual/baseline.spec.ts-snapshots/baseline/a{11,13,17}/{pre-launch,launch,key-event-1,key-event-2,final-phase,end}-{desktop,tablet,phone}-baseline-win32.png` | 11/13/17 | per `05-migration-plan.md` snapshot table | 1440×900 / 768×1024 / 390×844 | 2026-05-28 (54/54) |

---

## Session log

_(Brief one-liner per session. Newest at the top.)_

| Date       | Summary                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-28 | Phase 4 cont: `src/data/csvLoader.ts` (pipe-delimited CSV fetch + parse + cache-bust) + 13 tests; `src/engines/ytplayer/index.ts` (typed YouTube IFrame API loader: promise + caching + chain-onto-existing-callback) + 3 tests. 45/45 tests green. Legacy `ajax.js`/`index.js` untouched.                                                                    |
| 2026-05-28 | Phase 4 lesson: attempted to delegate legacy `secondsToTimeStr` etc. to `window.MissionClock` set by `src/main.ts`; reverted. Build path has `{ includeEsmEntry: false }` so `main.ts` is dev-only; deferred `<script type="module">` also breaks classic-script timing. Phase 4 modules stay as parallel typed references until Phase 5 converts call sites. |
| 2026-05-28 | Phase 4 start: `src/shell/clock.ts` extracted (typed pure fns: `padZeros`, `secondsToTimeStr`, `secondsToTimeId`, `timeIdToSeconds`, `timeIdToTimeStr`, `timeStrToTimeId`, `timeStrToSeconds`). 28 Vitest unit tests; `npm run check` green (29/29). Legacy `index.js` files left unmodified pending Ben's Phase 3 verification.                              |
| 2026-05-28 | Phase 3: shared `<head>` builder (`src/template/head.ts`) replaces per-mission heads via Vite plugin (dev + build). `src/dom/index.ts` jQuery shim + `src/main.ts` ESM entry land. `npm run check` + `npm run build` green; all 3 missions smoke clean.                                                                                                       |
| 2026-05-28 | Phase 2 (A11 + A17): webroots lifted to `public/{11,17}/` + `legacy-src/{11,17}/`; typed `{11,17}.config.ts` + `window.MISSION` wired; legacy `var c*`/`var g*` blocks read from it; KeyCDN stripped. `npm run check` green; all 3 missions smoke clean.                                                                                                      |
| 2026-05-28 | Phase 2 (A13): typed `MissionConfig` + `13.config.ts`; Vite `transformIndexHtml` plugin injects `window.MISSION`; `public/13/index.js` reads from it; KeyCDN stripped. `npm run check` green; A13 smoke clean.                                                                                                                                                |
| 2026-05-28 | Phase 1 file-lift: A13 webroot copied to `public/13/` + `legacy-src/13/`; dev server serves A13 clean (no JS errors). Awaits Ben's manual side-by-side.                                                                                                                                                                                                       |
| 2026-05-28 | Phase 0: Vite+TS+ESLint+Prettier+Vitest+Playwright scaffold; `npm run check` green; 54 Playwright production baselines captured.                                                                                                                                                                                                                              |
| 2026-05-28 | Git init; 4 subtree imports; LFS migration (>5MB); 14 transient LFS objects pruned; LEGACY.md added                                                                                                                                                                                                                                                           |
| 2026-05-28 | Planning complete. All 7 planning docs written and locked. `.github/copilot-instructions.md` and this tracker created. Ready for Phase 0.                                                                                                                                                                                                                     |
