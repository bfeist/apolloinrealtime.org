# 07 — Repository provenance and preservation

AiRT2 contains the unified application, runtime content, planning and
verification material, and preserved mission-processing sources. The original
repositories remain adjacent to this checkout and are the provenance references:

| Mission | Source repository         | Webroot                 |
| ------- | ------------------------- | ----------------------- |
| 11      | `../Apollo_11`            | `_website/_webroot/11/` |
| 13      | `../Apollo_13`            | `_website/_webroot/13/` |
| 17      | `../Apollo17.org`         | `_Website/_webroot/17/` |
| Landing | `../apolloinrealtime.org` | `_website/_webroot/`    |

`public/{11,13,17}/` remains the read-only runtime asset/data tree for the typed
app. Non-runtime source material is preserved under `mission-data/`, and the
legacy Python processes are preserved under `pipeline/`. Canonical files come
from each repository's latest pre-abandonment `master`; branch-only and changed
versions live in `legacy-variants/<branch>/`. The two source manifests retain
the exact commit, original path, and blob mapping. A future replacement pipeline
must still define and verify a new contract before changing runtime data.
Apollo 17's bulky `! Previous Steps` OCR/scratch tree remains available only in
the adjacent source repository and is an intentional archive exclusion.

The complete commit topology from each adjacent repository is retained in
namespaced `legacy/{apollo11,apollo13,apollo17,landing}/` branch and tag refs.
Those histories are filtered to the former AiRT2 application path set: commit
metadata, parents, branches, and tags remain, while the newly restored source
payload is represented in the working tree and manifests rather than rewritten
back into every legacy commit. Each source repository's imported default-branch
tip is the second parent of its original import merge on `main`. Auxiliary
branches are published as `legacy/<source>/<original-branch>`; for example, the
919-commit Apollo 17 development line is `legacy/apollo17/develop`. Namespaced
tags and the older internal `heads/` and `remotes/origin/` refs remain available
as additional provenance pointers. The three legacy `master` aliases stop at
their filtered archival tips, immediately before the later README-only
abandonment-notice commits in the now-frozen source repositories.

If runtime drift is found, inspect a targeted diff against the appropriate
adjacent webroot and restore only the affected files. The retired `/mobile/`
applications, A13 `spacecraft_dev/`, and A17 `nominee/` remain out of scope.
CRLF/LF-only differences are harmless. Preserve the existing production
deployment as the rollback reference until cutover and rollback are verified.
