# 08 — Progress tracker

This is the ground truth for the current state of the AiRT2 migration.
Every agent session must read this first and update it before ending.

---

## ⏩ Resume here

**Status:** Git init + subtree imports complete. LFS migration done. Ready for Phase 0 (scaffolding).

**Next action:**

1. Proceed with Phase 0 in `05-migration-plan.md` — scaffold `src/`, `public/`, `pipeline/`, capture Playwright baselines.

**Notes from this session (2026-05-28):**

- All four legacy repos were on `master` branch.
- Subtree imports done in order: A17 → A11 → A13 → landing.
- `git lfs migrate import --everything --above=5mb` rewrote 1,464 commits; all tags updated.
  Large files now in LFS: Premiere Pro projects, OCR `.dat` files, PDFs, Sketch files.
- `git lfs prune`: 459 LFS objects, 14 transient (deleted-file) objects removed, 446 retained.
- `git gc --aggressive` run to compact the pack.
- `LEGACY.md` added at repo root with import provenance.

---

## Phase status

| Phase                            | Status      | Notes                                                |
| -------------------------------- | ----------- | ---------------------------------------------------- |
| Git init + subtree imports       | done        | All 4 repos on master; LFS migration + prune applied |
| 0 — Scaffold + baseline capture  | not started |                                                      |
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
|      |         |     |          |          |

---

## Session log

_(Brief one-liner per session. Newest at the top.)_

| Date       | Summary                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 2026-05-28 | Git init; 4 subtree imports; LFS migration (>5MB); 14 transient LFS objects pruned; LEGACY.md added |

| Date       | Summary                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-28 | Planning complete. All 7 planning docs written and locked. `.github/copilot-instructions.md` and this tracker created. Ready for Phase 0. |
