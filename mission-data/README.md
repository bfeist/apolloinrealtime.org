# Preserved mission source data

This directory is the consolidated, non-runtime source-data archive for Apollo
11, 13, and 17. It was recovered from the unfiltered repositories adjacent to
this checkout because the namespaced `legacy/*` refs in AiRT2 preserve commit
topology but intentionally omit these payload blobs.

The latest pre-abandonment `master` snapshot is stored directly beneath each
mission number. Original top-level names and relative paths are retained so the
provenance remains recognizable. When a legacy branch has different content at
the same path, or a path absent from `master`, that branch-tip version is stored
under `legacy-variants/<branch>/`. Identical branch content is not copied again.

Python and other executable pipeline files were separated into `../pipeline/`.
The data files that historically lived beside those programs remain here in
their original `scripts/` or `Processing_Scripts/` paths. Runtime website files
remain under `../public/` and are not duplicated here.

`SOURCE-MANIFEST.tsv` records the mission, snapshot, exact source commit, source
path, Git blob, destination, and whether the imported content is exact. It is
the machine-readable inventory for all 1,935 files in this directory, excluding
this README and the manifest itself.

## Canonical snapshots

| Mission | Original repository | Canonical source commit | Preserved source roots |
| ------- | ------------------- | ----------------------- | ---------------------- |
| 11 | `../../Apollo_11` | `09356a2` | `MISSION_DATA`, `Premiere Pro`, `scripts`, `support` |
| 13 | `../../Apollo_13` | `17e2998` | `MISSION_DATA`, `Premiere Pro`, `scripts`, `support` |
| 17 | `../../Apollo17.org` | `4ac61997` | `Corrections from others`, `MISSION_DATA`, `Premiere Pro`, `Processing_Scripts`, `Youtube`, `_AFJ`, `_MC_Output`, `assets` |

Apollo 11's `mocr_transcript` branch and Apollo 17's `develop` branch have no
data variants relative to their canonical snapshots. Apollo 13's
`mocr-viz-transcript` branch likewise has no data variants. The other published
legacy branch tips are represented by their named variant directories and the
manifest. The landing repository contains no mission dataset or Python process,
so it contributes no files here.

Apollo 17's `! Previous Steps` tree is intentionally left only in the adjacent
legacy repository. Its 21,065 canonical OCR and scratch files, plus 36 repeated
branch-overlay entries, are not copied here; the mission CSVs and other useful
source material are preserved. No application code reads this directory.
