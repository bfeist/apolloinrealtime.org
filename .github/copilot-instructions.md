# Copilot agent instructions — AiRT2

These instructions apply to every Copilot agent session that works on this
repository. Read them before doing anything else.

---

## 1. Orient yourself before starting

Every session must begin with these two reads (in order):

```
read_file: 08-progress-tracker.md   ← current state, what's done, resume point
read_file: 05-migration-plan.md     ← phases, verification steps, lint rules
```

If the tracker says a phase is `in-progress`, finish it before starting the
next one. Never skip ahead.

Full planning-doc reading order (only needed when re-orienting from scratch):
`00-decisions.md` → `03-architecture-options.md` → `04-data-and-content-strategy.md`
→ `05-migration-plan.md` → `07-repo-and-git-strategy.md` → `08-progress-tracker.md`

---

## 2. Update the tracker as you go

`08-progress-tracker.md` is the ground truth for where work stands. Keep it
current; it is how the next session picks up where this one left off.

- **Before starting a task:** mark its phase row `in-progress`.
- **After finishing a task:** mark it `done`, add a brief note about anything
  unexpected (deviations from plan, decisions made, issues found).
- **Before ending a session:** write a "Resume here" block at the top of the
  tracker describing exactly what to do next and why.

Do not leave the tracker stale. A stale tracker forces the next agent to
re-read the whole codebase to reconstruct state.

---

## 3. Subagent delegation

Use subagents to preserve the main context window for coordination and
decision-making. Default guidance:

### Use a Haiku subagent (`/sub-haiku`) for:
- File copy / directory scaffolding operations
- Repetitive file generation from a template (e.g., generating `11.config.ts`
  and `17.config.ts` once `13.config.ts` is working)
- Grep / search passes across large legacy files
- Simple one-shot string replacements across many files
- Generating CSV fixture files for tests

### Use a Sonnet subagent (`/sub-sonnet`) for:
- Engine extraction tasks (Phase 4): reading 2000+ line JS and splitting into
  typed TypeScript modules
- MOCRviz refactor (Phase 4.5): untangling iframe postMessage state
- Panel extraction (Phase 5): converting jQuery-heavy panel code to typed modules
- CSS analysis and consolidation (Phase 6)
- Any task requiring reading multiple large files simultaneously

### Keep in the main agent:
- Phase-level decisions and deviations from plan
- Resolving conflicts between planning docs
- Writing tracker entries
- Running `npm run check` and interpreting failures
- Playwright baseline capture and diff triage

When delegating to a subagent, give it the relevant section of
`05-migration-plan.md` as context so it knows the constraints (TypeScript
strict, no jQuery in `src/`, ESLint enforced, etc.).

---

## 4. Coding standards (enforced)

All code written into `src/` must satisfy `npm run check` before committing:

```
npm run check
  ├─ tsc --noEmit
  ├─ eslint src/
  ├─ prettier --check src/
  └─ vitest run
```

- TypeScript: strict mode, no `any`, no `@ts-ignore` without a comment
  explaining why.
- ESLint: `typescript-eslint` `strictTypeChecked`. Key rules:
  - `@typescript-eslint/no-unused-vars`: error
  - `@typescript-eslint/no-floating-promises`: error
  - `@typescript-eslint/no-explicit-any`: error
  - `no-console`: warn (allow `console.warn` / `console.error`)
- Prettier: format before committing; CI blocks on any diff.
- `legacy-src/` is **excluded** from ESLint — lifted legacy code is not linted.
  Code only comes under lint when it moves to `src/`.

---

## 5. Verification checklist (every phase exit)

Before marking a phase `done` in the tracker, confirm:

- [ ] `npm run check` passes cleanly
- [ ] Manual browser comparison: staging and prod open side-by-side at the
  same GET, same mission — behavior is equivalent
- [ ] Zero JS console errors at all tested GETs
- [ ] Network tab: no requests to `kxcdn` or `keycdnmedia` hosts (Phase 2+)
- [ ] Playwright visual diff run; result noted in tracker (informational
  through Phase 4, blocking Phase 5+)

Full verification spec is in `05-migration-plan.md` under
"Verification approach (applies every phase)".

---

## 6. Repo / git hygiene

- Commit after each meaningful unit of work (one engine extracted, one
  panel converted, etc.) — not at end-of-phase.
- Commit message format: `phase(N): short description` (e.g.
  `phase(4): extract clock.ts + GET conversion unit tests`).
- Never commit directly to `main` without `npm run check` passing.
- The legacy repos are under `legacy/` (subtree import). Do not modify them;
  they are read-only reference material.

---

## 7. What not to do

- Do not start Phase N+1 before Phase N's exit criterion is met.
- Do not add runtime dependencies. The longevity principle (see
  `00-decisions.md` A2b) requires zero runtime deps in the shipped bundle.
  Paper.js is vendored and pinned; jQuery is being removed.
- Do not touch `legacy/` files.
- Do not guess at Playwright baseline timestamps — use the table in
  `05-migration-plan.md`.
- Do not make "improvements" outside the current phase scope. Log them in
  the tracker as deferred notes if you notice them.
