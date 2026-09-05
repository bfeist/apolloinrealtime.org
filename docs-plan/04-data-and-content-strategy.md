# 04 — Data, media, and future ingestion

## Existing data is the recovery input

The typed app consumes the existing mission files under `public/{N}/indexes/`
and the existing MOCR data/media paths. Preserve these files during recovery.
The loaders in `src/data/` normalize actual legacy schema differences into
`src/types/data.d.ts`; TypeScript row types alone do not validate downloaded
content. Check the real source file before changing an adapter.

Important differences already documented by the port include two-column
A13 versus four-column A11/A17 commentary, multiple `videoURLData.csv`
formats, and mission-specific photo and MOCR filename conventions. Do not
standardize a source CSV in place to make a shared loader easier to write.
Test normalization and boundary lookup where data differences affect behavior.

GET means Ground Elapsed Time, including negative countdown values. Keep
numeric seconds, colon-formatted GET, and compact time IDs distinct. Use
`src/shell/clock.ts` conversions; keep offsets and end-of-range behavior
consistent with the mission's data and reference application.

## Mission configuration and capabilities

Use `src/missions/{N}.config.ts` and `src/types/mission.d.ts` as the actual
configuration contract. Shared code consumes identity, launch/countdown
bounds, media roots, and capability flags. Avoid speculative parallel
configuration examples in documentation: they previously diverged from the
real field names and encouraged incompatible code.

Optional features must reflect actual data. Apollo 17 currently has no MOCR
recordings in this project. Apollo 11 and 13 each have their own MOCR channel
catalog, redactions, console positions, tape ranges, and audio paths. Share
the controller and renderer, not the asset contents. Lazy-load substantial
MOCR data when the feature opens; resolve missing data honestly.

## Media and reference assets

Typed media URLs resolve through `https://media.apolloinrealtime.org/A{N}`
and configured mission-specific roots. Local paths such as `/{N}/img/`,
`/{N}/indexes/`, and `/{N}/MOCRviz/` are case-sensitive on the deployment
host. Do not invent lowercase `mocrviz/` paths from older prose.

Keep existing photo identifiers, media filenames, attribution, and source
links. No new KeyCDN URL or CDN-switching logic belongs in the typed app.
This rule does not authorize deleting historical KeyCDN text from the
read-only reference copies.

Differentiate an unavailable recording/transcript from a request error and
from an unsupported feature. Do not substitute random waveform peaks,
activity lights, channel descriptions, or another mission's data just to
make a panel look populated.

## Deferred ingestion track

This work does not block repairing the current sites. The existing CSVs
remain the runtime input until a separately verified replacement pipeline
can regenerate equivalent output.

The resolved future direction is:

- A new `pipeline/` using uv, Python 3.12+, pinned dependencies, and a typed,
  validated writer contract matching the runtime adapters.
- Ben runs it interactively initially; parts may later become build jobs.
- Ongoing tools are transcript generation and photo-timing correction.
  Old scrapers and experimental scripts are reference material.
- Unify the harness around WhisperX; do not change transcription models or
  regenerate historical content without a separate content decision.
- Consult `../ArtemisInRealTime/src/server-batch/` for the existing modern
  WhisperX patterns when this track is actually started.
- Define a standard per-mission input layout and output schema then reproduce
  A13, A11, and A17 in order. Validate and diff results before switching the
  application to new data. Future schema docs/CLI names are proposals until
  implemented, not present-day dependencies.
