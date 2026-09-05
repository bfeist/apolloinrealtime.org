# 04 — Data, media, and future ingestion

## Current runtime contract

The typed app consumes the preserved mission files under
`public/{11,13,17}/indexes/` plus the existing mission-specific MOCR assets
and media paths. These source files stay unchanged. Loaders in `src/data/`
normalize real schema differences into the contracts in `src/types/`; row
types do not validate downloaded content, so inspect the source file before
changing an adapter.

Important differences include two-column Apollo 13 versus four-column Apollo
11/17 commentary, multiple `videoURLData.csv` formats, and mission-specific
photo and MOCR filenames. Shared loaders normalize those differences without
rewriting a source CSV. Tests cover normalization and boundary lookup where a
schema difference affects behavior.

GET is Ground Elapsed Time and may be negative during countdown. Numeric
seconds, colon-formatted GET, and compact time IDs are distinct representations.
Use the shared time conversion code and preserve mission bounds and historical
date behavior.

Mission configuration in `src/missions/` and the types in `src/types/` are the
implementation contract. Apollo 11 and 13 have separate MOCR channel catalogs,
redactions, console positions, tape ranges, and audio paths. Apollo 17 has no
MOCR recordings in the current project. Share code, not mission data. Missing,
unsupported, and failed media states must be distinguishable; never fabricate
waveforms, activity, descriptions, transcripts, or substitute another mission's
data.

Typed media URLs use `https://media.apolloinrealtime.org/A{N}` and configured
mission-specific roots. Deployment paths such as `/{N}/img/`, `/{N}/indexes/`,
and `/{N}/MOCRviz/` are case-sensitive. Preserve photo identifiers, filenames,
attribution, and source links. Do not add KeyCDN URLs or CDN-switching logic to
the typed app.

## Preserved processing material

Mission-specific raw inputs, working files, editorial sources, and historical
intermediates are preserved under `mission-data/{11,13,17}/`. Legacy Python
processes are separated under `pipeline/{11,13,17}/` with their original paths
and branch-specific variants. The manifests in those two roots map each file to
its original repository, branch snapshot, path, and Git blob.

Apollo 17's 21,000-file `! Previous Steps` OCR/scratch tree remains in the
adjacent legacy repository and is intentionally not duplicated. The retained
archive prioritizes the mission CSVs and the other usable source material.

These files are provenance snapshots, not runtime inputs and not a working
replacement pipeline. The typed app continues to consume the unchanged files
under `public/`. Embedded credentials found in the old scripts were replaced by
an explicit redaction placeholder; no other pipeline repair was attempted.

## Future ingestion work

The replacement ingestion pipeline rebuild is deferred and does not block release.
Existing CSVs remain the runtime input until a separately verified pipeline can
regenerate equivalent output.

When modernization starts:

- Add a unified harness with uv, Python 3.12+, pinned dependencies, and a typed,
  validated writer contract matching the runtime adapters without rewriting the
  preserved mission snapshots in place.
- Keep the initial workflow interactive. Transcript generation and photo-timing
  correction are the ongoing tools; old scrapers and experiments are reference
  material.
- Unify the harness around WhisperX. Do not change models or regenerate
  historical content without a separate content decision.
- Consult `../ArtemisInRealTime/src/server-batch/` for current WhisperX patterns.
- Define how external source material is acquired, then define a standard
  per-mission input layout and output schema and reproduce Apollo 13, 11, and 17
  in that order. Validate and diff output before switching the application to
  it.

Schema documents and CLI names remain proposals until implemented.
