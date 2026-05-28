# 04 — Data and content strategy

## CSV indexes — standardize the schema, type the loader

Today every mission ships its own `indexes/*.csv`, and the three apps each
have their own ad-hoc parser in `ajax.js`. They mostly agree but not exactly.
The old Python that produced them was loose and per-mission (see the pipeline
section below) — so we **standardize the schema now** rather than preserving
any of the old quirks.

Plan:

1. **Define one canonical schema** per CSV file type (one TOCData schema, one
   utteranceData schema, etc.) in `docs/csv-schemas.md`, mirrored as
   TypeScript row types in `src/types/csv.ts`. This is the contract the new
   data pipeline writes and the loader reads.
2. **Write one typed CSV loader** in `src/data/csvLoader.ts` that parses +
   builds a GET-second-indexed lookup table, returning typed rows. Replaces
   the three different implementations in the old `ajax.js`.
3. **Validate on load (dev only)** — schema-check each CSV column against the
   TS row type. Fail loudly in dev, log in prod.
4. **Mission-specific columns/files are optional** in the types (geology,
   paper, heartrate, AV). The loader returns `undefined` for absent columns;
   panels guard on `mission.features.*`. This is what makes adding A8/A12/
   A14/A15/A16 cheap.
5. Keep the **filenames and locations identical** to today
   (`/{N}/indexes/foo.csv`) so existing deep links and caches are unaffected.
   Where the new pipeline standardizes a column name that differs from a
   legacy file, the pipeline re-emits the file — the runtime only ever sees
   the standardized schema.

## Mission config module (typed)

Each mission gets one typed file, e.g.:

```ts
// src/missions/13.config.ts
import type { MissionConfig } from "../types/mission";

const apollo13: MissionConfig = {
  id: "13",
  name: "Apollo 13",
  preTitle: "The Third Lunar Landing Attempt",
  subtitle: "Real-Time Mission Experience",
  patch: "/13/img/patch.png",
  launchDate: "1970-04-11T19:13:00Z",
  countdownStart: "1970-04-10T07:55:50Z",
  countdownSeconds: 127048,
  durationSeconds: 547200,
  defaultStartTimeId: "-000102",
  mediaRoot: "https://media.apolloinrealtime.org/A13",
  lpiImageRoot: "{media}/images/lpi_mirror",
  alsjImageRoot: "{media}/images/alsj_mirror",
  youtube: { qualityDefault: "sd" },
  redactedChannels: [1, 4, 10, 30, 31, 36, 37, 38, 39, 40, 41, 60],
  features: {
    geology: false,
    paperData: false,
    heartrates: false,
    mocrviz: true,
  },
  splash: {
    metaDescription: "...",
    ogImage: "https://apolloinrealtime.org/13/img/13home_screengrab.jpg",
  },
};

export default apollo13;
```

This is the **single source of truth** for everything that's currently a
`var c*` constant scattered through `index.js`. The `MissionConfig` type
(`src/types/mission.ts`) makes a malformed or incomplete future-mission
config a compile error. Adding A12 / A14 / A16 later is dropping in another
typed config file plus its standardized `indexes/` CSVs.

Note: `spacecraftDev` and `mobile` feature flags are gone — those features
are discarded/dropped (see below).

## Media root — KeyCDN removed (00-E11b)

`media.apolloinrealtime.org/A{N}` is the runtime media root. **KeyCDN is no
longer used** — remove every KeyCDN reference from the codebase:

- The commented-out `cMediaCdnRoot` KeyCDN variants in each `index.js`
  (`keycdnmedia…`, `keycdnmediado…`, `apollort-26f5.kxcdn.com`, etc.).
- The commented `cLPIImageRoot` / `cWebCdnRoot` KeyCDN cache variants.

The new app builds URLs from `mission.mediaRoot` only. No CDN-switching
logic, no commented alternates. Media filenames and the `media.…` host are
unchanged, so no media has to move.

## Data ingestion pipeline — replace, don't migrate (00-C9)

The `scripts/` (A11/A13) and `Processing_Scripts/` (A17) folders hold ~30+
Python tools accumulated over a decade. Per Ben: **most were run-once or
experimental, the approach was loose and different for every mission, and
none of it should be treated carefully.** Only two kinds of tool actually
run going forward:

1. **Transcript generation** (Whisper/WhisperX of mission audio → utterance
   CSVs).
2. **Photo-timing corrections** (adjusting photo timestamps to GET).

Everything else (AFJ/ALSJ scrapers, NARA scrapers, one-off cleaners, merge
experiments, ops-report tooling) is **reference material only** and is not
carried into the new repo.

### New pipeline: `pipeline/` (uv + Python 3)

Build a fresh, standardized ingestion pipeline rather than porting the old
scripts:

- **uv** for environment + dependency management (`uv venv`, `uv run`,
  `uv.lock`). Single Python 3.12+ target. Fast, reproducible, no global pip.
- **One package, clear entry points** — e.g. `airt-ingest` with subcommands:
  - `airt-ingest transcripts --mission 13 ...`
  - `airt-ingest photo-timing --mission 13 ...`
  - `airt-ingest build --mission 13` (emit all standardized `indexes/*.csv`)
  - `airt-ingest validate --mission 13` (schema-check output against
    `docs/csv-schemas.md` / `src/types/csv.ts`)
- **Standardized input layout + naming.** Define a single per-mission input
  convention (raw transcripts, photo manifests, telemetry sources) under
  `pipeline/missions/{N}/` so every mission is ingested the same way.
  Document it in `docs/data-inputs.md`.
- **Standardized output schema** — the pipeline is the _writer_ side of the
  same CSV schema the TypeScript loader reads. Schema lives in one place and
  both sides conform.
- **ruff + black + mypy**, pinned via `uv.lock`. Same longevity stance as
  the JS side: pin everything, rebuild only on purpose.

### Sequencing

- Runs as a parallel track to the web-app phases (does not block them).
- Start with **A13** (matches the canonical web-app base): define the schema,
  stand up `airt-ingest`, reproduce A13's `indexes/` from standardized
  inputs, diff against the existing committed CSVs to prove parity.
- Then A11 and A17.
- The web app keeps consuming the existing committed CSVs until the pipeline
  can regenerate equivalent (or improved, standardized) ones.

Ownership of this track is an open follow-up (see
[06-open-questions.md](06-open-questions.md)): Ben, Copilot on demand, or a
dedicated sub-agent. The scraping/transcription work has network + GPU
implications for where it runs.

## Landing page

`apolloinrealtime.org/` (the mission picker) becomes the new app's `/`
route. It's a ~80-line static page today; trivial to fold in.

## Mobile site — dropped (00-B5)

The per-mission `mobile/` subdirectory (A11 + A13, ~3.4 MB each) is **out of
scope**. The unified app is responsive instead. Phones in 2026 can run the
full app.

Consequence: Phase 6 (CSS unification) now owns responsive layout as a
hard requirement, not a follow-up. We need explicit breakpoints for
phone-portrait and phone-landscape, with the navigator monitor, video
monitor, and dashboard panels reflowing rather than truncating.

The legacy `/{N}/mobile/` URLs need a redirect strategy at cutover —
301 → `/{N}/` (the responsive unified app) is the default.

## Side apps — fate (00-B6)

- **MOCRviz** (A11 12 MB, A13 6 MB) — Mission Control Operations Room
  visualization. **Refactor**, not carry-through. Today it lives in its own
  subtree and is embedded into the main app via an `<iframe>` — this
  coupling is brittle and prevents shared state between the main player
  and MOCRviz. In the new architecture MOCRviz becomes a first-class panel
  (`src/panels/mocrviz/`) that:
  - imports the same clock + CSV-loader engines as the rest of the app
  - subscribes to mission-time updates directly (no `postMessage` glue)
  - keeps its bespoke visualization code, but loaded as ES modules
  - is enabled by `mission.features.mocrviz: true` (A11, A13; later
    missions opt in as their data appears)
    Large assets (the 12 MB on A11 in particular) stay in `public/{N}/mocrviz/`
    and are loaded lazily when the panel is opened.
- **`spacecraft_dev/`** (A13 28 KB — `spacecraft.{html,css,js}`) —
  **discard.** Confirmed throwaway prototype/test code, not a shipped
  feature. Not migrated; URL 404s (or 301 → `/13/`) post-cutover.
- **`nominee/`** (A17 340 KB, Webby submission) — **retire.** Same.

New Phase 4.5 in [05-migration-plan.md](05-migration-plan.md) covers the
MOCRviz extraction.
