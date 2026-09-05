# 07 — Repository provenance and preservation

AiRT2 contains only the unified application, its runtime content, planning, and
verification material. Original website and processing repositories remain
adjacent to this checkout and are the source references:

| Mission | Source repository         | Webroot                 |
| ------- | ------------------------- | ----------------------- |
| 11      | `../Apollo_11`            | `_website/_webroot/11/` |
| 13      | `../Apollo_13`            | `_website/_webroot/13/` |
| 17      | `../Apollo17.org`         | `_Website/_webroot/17/` |
| Landing | `../apolloinrealtime.org` | `_website/_webroot/`    |

`public/{11,13,17}/` remains the read-only runtime asset/data tree for the typed
app. Pre-pipeline sources, raw inputs, working files, and intermediates are not
stored in AiRT2. Consult the adjacent repositories until they are added through
a separately approved storage mechanism. A future replacement pipeline must
define and verify a new contract before changing runtime data.

The complete commit topology from each adjacent repository is retained in
namespaced `legacy/{apollo11,apollo13,apollo17,landing}/` branch and tag refs.
Those histories are filtered to the current AiRT2 path set: commit metadata,
parents, branches, and tags remain, while files absent from the current tree do
not retain historical blobs. Each source repository's imported default-branch
tip is the second parent of its original import merge on `main`. Auxiliary
branches and tags remain available through the namespaced refs.

If runtime drift is found, inspect a targeted diff against the appropriate
adjacent webroot and restore only the affected files. The retired `/mobile/`
applications, A13 `spacecraft_dev/`, and A17 `nominee/` remain out of scope.
CRLF/LF-only differences are harmless. Preserve the existing production
deployment as the rollback reference until cutover and rollback are verified.
