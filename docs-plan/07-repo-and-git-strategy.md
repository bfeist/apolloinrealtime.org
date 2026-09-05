# 07 — Repository provenance and preservation

AiRT2 contains only the unified application, its runtime content, planning and
verification material, and preserved mission data-processing snapshots. The
original website repositories remain adjacent to this checkout and are the
source references:

| Mission | Source repository         | Webroot                 |
| ------- | ------------------------- | ----------------------- |
| 11      | `../Apollo_11`            | `_website/_webroot/11/` |
| 13      | `../Apollo_13`            | `_website/_webroot/13/` |
| 17      | `../Apollo17.org`         | `_Website/_webroot/17/` |
| Landing | `../apolloinrealtime.org` | `_website/_webroot/`    |

`public/{11,13,17}/` remains the read-only runtime asset/data tree for the typed
app. `pipeline/{11,13,17}/` preserves the old processing scripts with their
source and intermediate data in the state copied on 2026-09-05. These snapshots
are provenance, not a functioning replacement pipeline; modern pipeline work
must define and verify a new contract before changing them.

If runtime drift is found, inspect a targeted diff against the appropriate
adjacent webroot and restore only the affected files. The retired `/mobile/`
applications, A13 `spacecraft_dev/`, and A17 `nominee/` remain out of scope.
CRLF/LF-only differences are harmless. Preserve the existing production
deployment as the rollback reference until cutover and rollback are verified.
