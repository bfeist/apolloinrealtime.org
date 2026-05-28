# 08 — Progress tracker

This is the ground truth for the current state of the AiRT2 migration.
Every agent session must read this first and update it before ending.

---

## ⏩ Resume here

**Status:** Phase 0 complete. Vite + TS scaffold up, `npm run check` green, 54 Playwright production baselines captured. Ready for Phase 1 (lift A13).

**Next action:**

1. Phase 1 in `05-migration-plan.md`: copy `legacy/13/_website/_webroot/13/{index.html,index.js,ajax.js,navigator.js,styles.css,lib/}` into `public/13/` and `legacy-src/13/`. Make `13/index.html` (or the unified shell) serve the existing A13 markup. Confirm A13 boots in dev exactly like production. Screen-record T-2h through T+0:30 and compare side-by-side with prod.

**Notes from this session (2026-05-28, Phase 0):**

- Pinned toolchain (exact versions, no carets): Node 24.11.1, Vite 8.0.14, TypeScript 6.0.3, ESLint 10.4.0, typescript-eslint 8.60.0, Prettier 3.8.3, Vitest 4.1.7, Playwright 1.60.0. Lockfile committed.
- TS strict mode with `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. Path alias `@/*` -> `src/*`.
- ESLint flat config uses `strictTypeChecked` + `stylisticTypeChecked`, layered with `eslint-config-prettier`. `legacy/`, `legacy-src/`, `public/`, `pipeline/`, and the visual-snapshot dir are ignored.
- `npm run check` = typecheck + lint + format:check + vitest. Currently green on the empty scaffold.
- Vite multi-page setup: `index.html` (landing), `11/index.html`, `13/index.html`, `17/index.html` are placeholder shells with one-line entries in `src/entries/`.
- Playwright config has two projects: `baseline` (targets `https://apolloinrealtime.org`) and `visual` (targets `http://localhost:5173`). Baselines were captured with `npm run test:baseline`.
- **Baseline-capture gotcha worth remembering:** Playwright's `toHaveScreenshot()` requires two consecutive identical frames, which the live mission clock at pre-launch/launch GETs can never produce. Used `expect(buf).toMatchSnapshot()` instead (single-shot). Worth carrying the same approach into the Phase-5+ visual-diff tests.
- All 54 baselines saved under `tests/visual/baseline.spec.ts-snapshots/baseline/a{11,13,17}/{snap}-{viewport}-baseline-win32.png` (Playwright's `-snapshots` convention; `-win32` because captured on Windows — re-capture on Linux/CI host before cutover if CI runs there).
- Verified all four routes return 200 from `npm run dev`.

---

## Phase status

| Phase                            | Status      | Notes                                                |
| -------------------------------- | ----------- | ---------------------------------------------------- |
| Git init + subtree imports       | done        | All 4 repos on master; LFS migration + prune applied |
| 0 — Scaffold + baseline capture  | done        | Vite/TS/ESLint/Prettier/Vitest/Playwright pinned; 54 prod baselines captured (Windows host) |
| 1 — Lift A13                     | not started |                                                      |
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
`tests/visual/baseline.spec.ts-snapshots/baseline/a{11,13,17}/{pre-launch,launch,key-event-1,key-event-2,final-phase,end}-{desktop,tablet,phone}-baseline-win32.png` | 11/13/17 | per `05-migration-plan.md` snapshot table | 1440×900 / 768×1024 / 390×844 | 2026-05-28 (54/54)
| File | Mission | GET | Viewport | Captured |
| ---- | ------- | --- | -------- | -------- |
|      |         |     |          |          |

---

## Session log

_(Brief one-liner per session. Newest at the top.)_
Phase 0: Vite+TS+ESLint+Prettier+Vitest+Playwright scaffold; `npm run check` green; 54 Playwright production baselines captured. |
| 2026-05-28 | 
| Date       | Summary                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 2026-05-28 | Git init; 4 subtree imports; LFS migration (>5MB); 14 transient LFS objects pruned; LEGACY.md added |

| Date       | Summary                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-28 | Planning complete. All 7 planning docs written and locked. `.github/copilot-instructions.md` and this tracker created. Ready for Phase 0. |
