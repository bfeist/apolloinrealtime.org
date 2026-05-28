# 07 — Repo structure & git-history strategy

Ben's constraint (Round 3): the four source repos have long, decade-spanning
histories worth preserving. **Decision locked: Option 2 — fresh `AiRT2` repo
that imports the full history of all four legacy repos.** The driving goal
is that whole-history visualizations (e.g. **gource**) replay all four repos'
lifetimes inside the one new repo. New app files getting their own history
is fine — the point is to preserve the _memory_ of the four legacy repos.

This gates the first real commit and the eventual GitHub push (CI = GitHub
Actions, later).

## The four histories in play

| Repo                   | Role                               | History value              |
| ---------------------- | ---------------------------------- | -------------------------- |
| `apolloinrealtime.org` | landing page + most recent tooling | medium                     |
| `Apollo_13`            | canonical base for the rewrite     | high (newest, most active) |
| `Apollo_11`            | fork                               | high                       |
| `Apollo17.org`         | original fork                      | high (oldest, the genesis) |

All four are independent git repos with unrelated histories.

## Options

### Option 1 — Fresh `AiRT2` repo, old repos archived read-only (REJECTED)

- New repo starts clean. The old four are tagged (e.g. `final-legacy`) and
  archived (GitHub "archived" flag or a `legacy/` org), kept forever but
  frozen.
- New repo's `README` / this doc links back to the archived repos.
- **Pros:** cleanest history going forward; no decade of unrelated commits
  cluttering `git log`; smallest repo; simplest mental model.
- **Cons:** `git blame` on lifted code points at the new commit, not the
  original author/date; history is one click away but not inline.

### Option 2 — Fresh `AiRT2` repo, import all four histories via merge (CHOSEN)

- `git remote add` each old repo, then
  `git merge --allow-unrelated-histories` (or `git subtree add`) so all four
  histories are reachable from the new repo.
- Place each old tree under a path (e.g. `legacy/13/`, `legacy/11/`,
  `legacy/17/`, `legacy/landing/`) using subtree, then build the new app in
  `src/` / `public/` alongside.
- **Pros:** full history preserved _inside_ the new repo; `git log --follow`
  can trace lifted files back to their origin; single repo to clone.
- **Cons:** four unrelated histories make `git log` noisy; repo is larger
  (the old repos carry MBs of committed assets — MOCRviz, img, indexes);
  subtree merges are fiddly and easy to get wrong once.

### Option 3 — Fold into the existing `apolloinrealtime.org` repo (REJECTED)

- Continue history in the landing-page repo; add `src/`, `public/{N}/`,
  `pipeline/`, etc. Pull A11/A13/A17 trees in via subtree if their history
  is wanted.
- **Pros:** the public-facing repo keeps its identity and URL association;
  one repo already tied to the production domain.
- **Cons:** that repo's history is the _least_ valuable of the four (it's
  just the landing page); folding the three mission repos into it is the
  same subtree work as Option 2 but anchored to the weakest history;
  conflates "landing page" identity with "the whole platform."

## Decision (locked): Option 2 — full import of all four repos

Import the complete history of all four legacy repos into the new `AiRT2`
repo so every commit from every repo is reachable from `HEAD` and shows up
in gource and `git log`. The size cost is **accepted** — we explicitly do
**not** run `git filter-repo` to strip the committed assets, because that
would rewrite (and partially erase) the very history we're preserving.

### Why `git subtree` rather than a bare `merge --allow-unrelated-histories`

Both keep all commits in the DAG, but subtree also **relocates each repo's
files under a distinct prefix** (`legacy/<name>/`). That matters for two
reasons:

- **gource** renders files by path. Without prefixes, four repos that each
  have a root `index.js` / `styles.css` collide into the same nodes and the
  visualization is misleading. Prefixes give each legacy repo its own
  branch of the tree, so gource shows four distinct codebases growing over
  the decade, then the new `src/` appearing on top.
- It keeps the working tree tidy: legacy code lives under `legacy/`, the new
  app under `src/` / `public/` / `pipeline/`.

`git subtree add` does an unrelated-history merge under the hood, so the full
commit ancestry is preserved — it is not squashed (do **not** pass
`--squash`).

### Concrete plan

Do the imports **first**, before any new application code, so the new work
sits cleanly on top of the combined history.

1. **Freeze + tag the legacy repos.** In each of the four, commit any
   working changes and tag `final-legacy-YYYYMMDD`. Keep the originals
   intact (they remain the rollback target per the cutover plan).
2. **`git init` in `AiRT2/`** and make the first commit the existing
   planning docs (`00`–`07`). This is the base the subtrees attach to.
3. **Subtree-import each legacy repo** under a `legacy/` prefix, no squash:

   ```bash
   # from f:/_repos/AiRT2, with the repo already git-init'd
   git remote add legacy-17 ../Apollo17.org
   git remote add legacy-11 ../Apollo_11
   git remote add legacy-13 ../Apollo_13
   git remote add legacy-landing ../apolloinrealtime.org
   git fetch --all --tags

   # order them oldest-first so gource replays the real chronology
   git subtree add --prefix=legacy/17      legacy-17      <default-branch>
   git subtree add --prefix=legacy/11      legacy-11      <default-branch>
   git subtree add --prefix=legacy/13      legacy-13      <default-branch>
   git subtree add --prefix=legacy/landing legacy-landing <default-branch>
   ```

   (Confirm each repo's default branch name — `master` vs `main` — before
   running. gource orders by author/commit date, so import order doesn't
   change the timeline, but oldest-first keeps the merge commits tidy.)

4. **Drop the temporary remotes** once imported: `git remote remove legacy-*`.
5. **Add a `LEGACY.md`** at the repo root documenting what each `legacy/<n>/`
   subtree is, its `final-legacy-*` tag, and the original local path —
   provenance for anyone reading the combined history later.
6. **Build the new app alongside** — `src/`, `public/{N}/`, `pipeline/` —
   in subsequent commits. During Phase 1, files copied from `legacy/13/`
   into `public/13/` should reference their origin in the commit message.
7. **Push `AiRT2` to a new GitHub repo** when ready; wire GitHub Actions
   (typecheck + Vitest + Playwright) at that point.

### Accepted trade-offs

- **Repo size:** the combined repo carries every legacy commit including
  committed binaries (MOCRviz, `img/`, `indexes/`). Accepted in exchange for
  complete history. A `--depth` shallow clone is available to anyone who
  doesn't need the full past.
- **Noisy `git log`:** four unrelated histories interleave. Mitigated by the
  `legacy/` path prefixes and by using `git log -- src/` to view only the
  new app.
- **`git blame` on new files** starts at the new commits — which Ben
  explicitly said is fine.

### gource note

After import, a full-history visualization is just:

```bash
gource --seconds-per-day 0.5 --auto-skip-seconds 1
```

The four `legacy/<name>/` trees will appear on their real historical dates;
the new `src/` tree grows on top from 2026 onward.

## Status

R3-1 and R3-2 in [06-open-questions.md](06-open-questions.md) are resolved by
this doc (Option 2, full history, all four repos). `AiRT2/` stays a local,
un-pushed planning folder until we execute the import as the first step of
turning this into a working repo.
