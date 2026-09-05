# 07 — Repository provenance and preservation

AiRT2 is the active repository. The original histories and provenance are
recorded in [legacy/LEGACY.md](../legacy/LEGACY.md).

`legacy/`, `legacy-src/`, `legacy-oracle/`, and `public/{11,13,17}/` are
read-only reference trees. The `public/` copies also provide assets and data to
the typed app. Do not remove or edit them during application or release work.

If drift is found, inspect a targeted diff, verify the source path, and restore
only the affected reference files while preserving unrelated changes:

| Mission | Source repository        | Webroot                 |
| ------- | ------------------------ | ----------------------- |
| 11      | `F:/_repos/Apollo_11`    | `_website/_webroot/11/` |
| 13      | `F:/_repos/Apollo_13`    | `_website/_webroot/13/` |
| 17      | `F:/_repos/Apollo17.org` | `_Website/_webroot/17/` |

The preserved copies intentionally exclude the retired `/mobile/` applications,
A13 `spacecraft_dev/`, and A17 `nominee/`; do not reintroduce them. CRLF/LF-only
differences are harmless. Preserve the existing production deployment as the
rollback reference until cutover and rollback have been verified.
