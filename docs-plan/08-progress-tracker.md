# 08 — Progress tracker

This is the ground truth for the current state of the AiRT2 migration.
Every agent session must read this first and update it before ending.

---

## ⏩ Resume here

**Status:** Phase 1 file-lift done; A13 boots in `npm run dev` with no JS console errors. Manual side-by-side comparison vs prod is pending Ben.

**Next action (Ben):**

1. Run `npm run dev` and open `http://localhost:5173/13/` next to `https://apolloinrealtime.org/13/` in two browser windows. Play through T-2h → T+0:30. Confirm pixel-equivalent behaviour (clock, transcript, audio channels, photo panel, navigator). Note any deviations in this tracker.

**Next action (agent, once Phase 1 manual check passes):**

1. Phase 2 in `05-migration-plan.md` — extract `src/types/mission.ts` (`MissionConfig`) and `src/missions/13.config.ts` populated from A13's `var c*` constants. Strip KeyCDN. Then repeat for A11 and A17 (file-lift those webroots first using the same pattern as Phase 1).

**Notes from this session (Phase 1):**

- Copied `legacy/13/_website/_webroot/13/{index.html,index.js,ajax.js,navigator.js,styles.css,lib/}` into both `public/13/` (runtime) and `legacy-src/13/` (lift-staging) per plan.
- Also copied `img/`, `indexes/`, `MOCRviz/`, `favicons/`, `favicon.ico`, `robots.txt`, `TOC.html`, `navigator_dev.{html,js}` into `public/13/` so the app boots without reaching to prod. Total `public/13/` = 14 MB.
- **Key Vite gotcha:** `index.html` MUST live at the project root (`13/index.html`), not in `public/13/`. Vite's HTML middleware/SPA fallback won't serve `public/13/index.html` for the directory URL `/13/`; with no root entry it served the landing-page `index.html` instead. So: HTML at root, assets in `public/13/`. `13/index.html` is re-added to `vite.config.ts` rollupOptions.
- The HTML still contains its original `<script src="...">` tags and resolves all relative paths (`styles.css`, `lib/...`, `index.js`, `ajax.js`, `navigator.js`) to `/13/...` which hits `public/13/`. Vite injects `/@vite/client` for HMR; harmless and stripped in build.
- Smoke test (`scripts/smoke.mjs`): A13 loads with no JS console errors and no asset request failures. Only failed requests are Google Analytics `collect` and YouTube QoE telemetry — both expected in headless / ad-blocked browsers and present on prod too.
- `npm run check` still green.

---

## Phase status

| Phase                            | Status      | Notes                                                |
| -------------------------------- | ----------- | ---------------------------------------------------- |
| Git init + subtree imports       | done        | All 4 repos on master; LFS migration + prune applied |
| 0 — Scaffold + baseline capture  | done        | Vite/TS/ESLint/Prettier/Vitest/Playwright pinned; 54 prod baselines captured (Windows host) |
| 1 — Lift A13                     | in-progress | Files copied, dev boots clean (no console errors). Pending Ben's manual side-by-side vs prod. |
| 2 — Mission config (typed)       | not started |                                                      |
| 3 — Unified entry + jQuery start | not started |                                                      |
| 4 — Extract engines              | not started |                                                      |
| 4.5 — MOCRviz refactor           | not started |                                                      |
| 5 — Panels + finish jQuery       | not started |                                                      |
| 6 — CSS + responsive             | not started |                                                      |
| 7 — Cutover                      | not started |                                                      |
| 8 — Cleanup + future missions    | not started |                                                      |
| P-1 Pipeline scaffold (uv)       | not started |                                                      |
| P-2 CSV schema + data-inputs     | not started |                                                      |
| P-3 A13 ingestion                | not started |                                                      |
| P-4 A11 + A17 ingestion          | not started |                                                      |

---

## Decisions made during execution

_(Record here any deviations from the plan, on-the-fly decisions, or
discoveries that change how a future phase should be done.)_

| Date       | Phase    | Decision / Finding                                                                                                                                                                     |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-28 | Git init | All 4 legacy repos on `master`; subtrees imported oldest-first (A17→A11→A13→landing)                                                                                                   |
| 2026-05-28 | Git init | `git lfs migrate import --everything --above=5mb` — 1,464 commits rewritten; large Premiere Pro, OCR, PDF, Sketch files now in LFS                                                     |
| 2026-05-28 | Git init | `git lfs prune` removed 14 transient LFS objects (deleted-file blobs that had no branch-tip reference)                                                                                 |
| 2026-05-28 | Git init | Decision in `07-repo-and-git-strategy.md` ("do not run filter-repo to strip assets") updated: we DO strip transient blobs via LFS + prune, but the original legacy repos are untouched |
| 2026-05-28 | Phase 0  | Toolchain pinned with exact (no-caret) versions per longevity principle (A2b). Lockfile committed. |
| 2026-05-28 | Phase 0  | Playwright baseline capture uses `toMatchSnapshot()` (single-shot) instead of `toHaveScreenshot()` because live mission clock at pre-launch/launch never produces two identical frames. |
| 2026-05-28 | Phase 0  | Baselines captured on Windows host; filenames include `-win32` suffix. Re-capture on cutover host (likely Linux CI) before Phase 7. |
| 2026-05-28 | Phase 1  | A13 `index.html` placed at project root (`13/index.html`), not in `public/13/`. Vite's middleware does not serve `public/*/index.html` for directory URLs; without a root entry, Vite SPA-falls-back to the landing `index.html`. Pattern to repeat for A11/A17: HTML at root, assets in `public/{N}/`. |
| 2026-05-28 | Phase 1  | Copied full `_webroot/13/` into `public/13/` (14 MB incl. img/, indexes/, MOCRviz/) so the app is self-contained in dev. Phase 2 will strip KeyCDN references in `index.js`. |

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

| File | Mission | GET | Viewport | Captured |
| ---- | ------- | --- | -------- | -------- |
| `tests/visual/baseline.spec.ts-snapshots/baseline/a{11,13,17}/{pre-launch,launch,key-event-1,key-event-2,final-phase,end}-{desktop,tablet,phone}-baseline-win32.png` | 11/13/17 | per `05-migration-plan.md` snapshot table | 1440×900 / 768×1024 / 390×844 | 2026-05-28 (54/54) |

---

## Session log

_(Brief one-liner per session. Newest at the top.)_

| Date       | Summary                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-28 | Phase 1 file-lift: A13 webroot copied to `public/13/` + `legacy-src/13/`; dev server serves A13 clean (no JS errors). Awaits Ben's manual side-by-side. |
| 2026-05-28 | Phase 0: Vite+TS+ESLint+Prettier+Vitest+Playwright scaffold; `npm run check` green; 54 Playwright production baselines captured.          |
| 2026-05-28 | Git init; 4 subtree imports; LFS migration (>5MB); 14 transient LFS objects pruned; LEGACY.md added                                       |
| 2026-05-28 | Planning complete. All 7 planning docs written and locked. `.github/copilot-instructions.md` and this tracker created. Ready for Phase 0. |
