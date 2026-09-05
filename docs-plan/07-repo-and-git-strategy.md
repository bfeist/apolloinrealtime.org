# 07 — Repository provenance and preservation

AiRT2 is the chosen fresh repository. The original four histories were
imported under `legacy/`; their provenance is recorded in
[legacy/LEGACY.md](../legacy/LEGACY.md). Keep that history and the original
repositories intact. The earlier import proposal is complete historical
work, not a command sequence to rerun.

| Repository area                                             | Purpose                                                                                                   |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `legacy/17/`, `legacy/11/`, `legacy/13/`, `legacy/landing/` | Permanent source/history reference for the original projects                                              |
| `legacy-src/{N}/`                                           | Convenient text/script copies for source analysis                                                         |
| `legacy-oracle/{N}/`                                        | Original HTML served by the development-only oracle plugin                                                |
| `public/{N}/`                                               | Copied legacy asset trees, also supplying images/indexes/MOCR data and vendored Paper.js to the typed app |
| `src/`                                                      | Shared typed application under development                                                                |

All legacy/reference trees are read-only during recovery. Excluding obsolete
scripts from the production build is a later packaging concern; do not delete
shared assets or disable the oracle to simplify visual comparisons.

## If drift is discovered

First inspect a targeted diff and identify its provenance. Restore only the
affected reference files from the matching sibling source, preserving any
unrelated user changes:

| Mission | Source repository        | Webroot                 |
| ------- | ------------------------ | ----------------------- |
| 11      | `F:/_repos/Apollo_11`    | `_website/_webroot/11/` |
| 13      | `F:/_repos/Apollo_13`    | `_website/_webroot/13/` |
| 17      | `F:/_repos/Apollo17.org` | `_Website/_webroot/17/` |

Verify those paths before restoration. Existing copies exclude retired
`mobile/`, A13 `spacecraft_dev/`, and A17 `nominee/`; do not reintroduce
them. CRLF/LF differences alone are harmless.

## Working history

Commit meaningful units only after `npm run check` passes, with
`phase(N): short description`. Keep app fixes, documentation evidence, and
verification together where they form one reviewable unit. Do not rewrite
history, reimport subtrees, prune objects, migrate LFS, add remotes, or publish
as part of application salvage. Earlier sessions performed repository setup;
that history does not authorize repeating those operations.

Production release is separate work after product/browser acceptance.
Preserve the original deploy as the rollback reference. Confirm actual
hosting and rollback mechanics before release instead of assuming an old
DNS proposal describes the current host.
