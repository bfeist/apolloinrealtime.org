# Product intent and documentation map

Apollo in Real Time lets visitors experience historical missions as they
unfolded. Mission time connects the recordings, transcript, commentary,
photographs, and operational context on one screen. Visitors can listen
continuously, jump to a milestone or photograph, explore a Mission Control
channel, and share that exact moment.

Apollo 17 was built first, followed by 11 and then 13. The sites share a
common experience but accumulated different features and datasets. AiRT2
must consolidate the implementation while preserving those differences.
Apollo 13 is the first reference for shared work, not a substitute for
checking the other missions.

## What success means

The September 2026 salvage request changes the old pixel-identical target:
modest design differences are welcome if the experience remains recognizable
and usable. Repair the broken layout and restore substantive features,
especially MOCRviz. A generic dashboard or audio-button grid does not meet
that goal. Architectural tidiness and passing tests are supporting evidence,
not the product outcome.

The live references are [Apollo 11](https://apolloinrealtime.org/11/),
[Apollo 13](https://apolloinrealtime.org/13/), and
[Apollo 17](https://apolloinrealtime.org/17/). Enter the application past its
splash before judging its layout. Compare the same GET, viewport, and active
panel. Read the [visual reference](PHASE6-visual-reference.md) for structure
and the [plan](05-migration-plan.md) for repeatable verification.

## Experience contract

These are acceptance requirements, not claims that each feature is complete.
Current evidence and missing behavior belong in the [tracker](08-progress-tracker.md).

| Surface                            | Observable acceptance                                                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Entry and identity                 | Mission picker and mission identity are clear; launch/start controls enter the correct mission; deep links reach their requested moment without being overwritten by a default or live clock.                                                                            |
| Header and navigator               | Mission patch/title, historical date, editable GET, and a useful three-tier timeline remain visible and readable. Seeking updates the mission experience together.                                                                                                       |
| Desktop composition                | Video/dashboard and text occupy the left area; A11/A13 have a narrow channel strip; photography or MOCR occupies the large right area. Photos have a vertical thumbnail rail. A17 uses the space without an empty channel column.                                        |
| Video and dashboard                | The video player occupies the left top monitor beneath the mission-status overlay. Dashboard auto-display follows video availability; manual controls work. Mission day, stage, crew status, and telemetry represent the selected time.                                  |
| Transcript, milestones, commentary | Tabs switch real content. Relevant rows follow GET; clicking a timestamp seeks. Long transcripts remain scrollable and performant. User browsing is not constantly pulled away by unrelated updates.                                                                     |
| Photography                        | Correct mission photos load with caption/attribution; the active photo follows GET; thumbnails navigate to their associated moment. Images remain contained without distortion.                                                                                          |
| Search and transport               | Search results navigate to actual moments. Play/pause, sound, dashboard, share, fullscreen, and help controls perform their advertised actions. No decorative no-op buttons.                                                                                             |
| Shared time and links              | Typed GET, timeline clicks, transcript/TOC/photo/search seeks, and `?t=` share links agree. A11/A13 `?ch=` links select the requested valid channel when asynchronous MOCR loading completes.                                                                            |
| MOCRviz, A11/A13                   | A recognizable Mission Control room with selectable console positions, channel information, real recording waveform and playhead, channel activity, and channel transcript where available. Selection, audio, waveform, transcript, and mission clock stay synchronized. |
| Responsive behavior                | At desktop, tablet, and phone sizes, users can reach each applicable panel and operate controls. No accidental horizontal page overflow, overlapping controls, clipped tab labels, or empty panes caused by fixed desktop dimensions.                                    |
| Data and media failure             | Missing recordings and unavailable transcripts are described truthfully. Third-party loading errors do not destroy the rest of the experience. Do not draw fabricated activity or waveform data.                                                                         |

## Mission differences that must survive consolidation

| Mission   | Distinct reference behavior/data                                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apollo 11 | MOCR audio, mission-specific console positions and tape/channel catalog; lunar-surface photos and astromaterial/sample content.                                                   |
| Apollo 13 | MOCR audio with its own positions, channel catalog and tapes; mission-specific trajectory/dashboard behavior; no lunar-surface geology.                                           |
| Apollo 17 | No MOCR dataset in the current site; use the simpler photo layout. Lunar-surface content plus Cernan/Schmitt heart-rate and metabolic-rate data require an explicit parity audit. |

The legacy A13 Spacecraft information tab and the discarded
`spacecraft_dev/` prototype are different surfaces. Do not infer that
retiring the prototype authorizes silently dropping other production
content. Audit optional production features, record gaps, and resolve their
scope in the plan before declaring full parity.

A11 and A13 MOCR assets cannot be unified by copying one mission's data over
the other. Code is shared; recordings, channel availability, controller
positions, and content remain mission-specific. Future missions opt in when
real datasets are available.

## Where to work

| Location                                   | Responsibility                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `src/app/missionApp.ts`                    | Application composition, clock coordination, event wiring, and panel mounting           |
| `src/app/shell.ts`                         | Shared shell and controls                                                               |
| `src/app/deepLink.ts`                      | GET and channel URL handling                                                            |
| `src/missions/` and `src/types/`           | Mission configuration and typed data contracts                                          |
| `src/data/`                                | Existing mission CSV adapters and time-indexed lookup                                   |
| `src/engines/`                             | Navigator and YouTube integration                                                       |
| `src/panels/`                              | Typed feature panels, including `mocrviz/`                                              |
| `src/styles/`                              | Shared layout, tokens, panel styles, and small mission overrides                        |
| `public/{11,13,17}/`                       | Pristine legacy asset trees reused by the typed app; read-only during recovery          |
| `legacy-src/`, `legacy-oracle/`, `legacy/` | Read-only source/reference copies; see provenance guide                                 |
| `tests/`                                   | Unit and browser/visual verification; screenshots must correspond to an inspected state |

## Integration lessons from the recovery

- The homepage has its own live reference: `https://apolloinrealtime.org/`.
  Preserve the actual wording and photographic mission cards. The original
  source is `legacy/landing/_website/_webroot/`, with copied images in
  `public/landing/`. A generic mission-picker redesign is not the requested product.
- `src/app/playback.ts` owns GET and transport intent. `airt:seek` and
  `airt:transport` fan changes out to panels; do not create panel-local clocks
  or logging-only seek callbacks. Initial async deep links must not override
  a more recent user seek.
- `videoURLData.csv` describes long YouTube media files, including audio-only
  portions. `videoSegmentData.csv` describes actual footage intervals. Use
  the latter for dashboard visibility and navigator footage bars.
- A media element's aspect ratio cannot set a grid row's minimum height.
  The shell owns available space; scrolling children need zero minimum sizes.
  The outer grid also needs `minmax(0, 1fr)` to avoid channel-strip overflow.
- MOCRviz audio, waveform and activity use the original CDN data, while tape
  ranges, room images and channel transcripts have their documented mission
  roots. Use the faded 746×419 console image with its matching coordinates;
  the taller non-faded image shifts every console. Do not substitute mock peaks.
- MOCRviz, spacecraft and samples are lazy panels in the real right column.
  A17 biometrics mounts inside the dashboard and consumes the same GET.
- Vite URL normalization must match only application routes. Rewriting
  `/@vite/client` broke transformed HMR configuration and dynamic CSS imports.
  Query strings must survive the local legacy-oracle middleware.
- Unit tests establish calculations, not product completeness. Review full
  browser pages, scroll their panels, and exercise interactions. Typed and
  production screenshot directories are separate sources of evidence.

## Reading map and authority

1. [08-progress-tracker.md](08-progress-tracker.md): one current resume point,
   work status, verification evidence, and remaining gaps.
2. [05-migration-plan.md](05-migration-plan.md): ordered recovery work and
   acceptance/verification procedure.
3. This document: product contract and orientation.
4. [00-decisions.md](00-decisions.md): durable architectural and scope decisions.
5. [PHASE6-visual-reference.md](PHASE6-visual-reference.md): visual structure
   and comparison procedure, without implementation-status claims.
6. [01-current-state.md](01-current-state.md) and
   [PHASE6-shell-analysis.md](PHASE6-shell-analysis.md): historical source
   inventory and selector/DOM analysis. Check the actual source and browser
   before treating old measurements as facts.
7. [04-data-and-content-strategy.md](04-data-and-content-strategy.md): existing
   data compatibility, media, and the separately deferred ingestion track.
8. [07-repo-and-git-strategy.md](07-repo-and-git-strategy.md): provenance and
   preservation rules.

The obsolete problem-analysis, rejected architecture-options, and answered
questionnaire documents were removed during salvage. Their useful decisions
are consolidated above and in 00/04/07; git retains the original history.
No document should introduce another current-status summary. When observed
behavior contradicts prose, investigate the browser/source and correct the
document rather than coding toward an obsolete description.
