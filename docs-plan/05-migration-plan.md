# 05 — Remaining release plan

Read [08-progress-tracker.md](08-progress-tracker.md) first. The local recovery
scope is implemented and verified; the work below is what remains before a
production cutover can be considered. This plan does not authorize deployment
or changes to the preserved reference trees.

## 1. Media resilience sessions

Run extended listening sessions on Apollo 11 and 13 across YouTube and MOCR tape
boundaries. Exercise slow buffering, autoplay rejection, connection loss,
recording gaps, mission end, channel changes, seeks, mute, pause, and resume.
Confirm that canonical transport intent, displayed GET, video, MOCR audio,
waveform, transcript, activity, and photos remain coherent.

Record browser, mission, GET/channel, duration, and any external-service failure.
The known limitation is that the shared clock can continue while external media
buffers; decide from observed sessions whether a fuller buffering state machine
is required for release.

## 2. Complete the feature audit

Compare the same mission, GET, viewport, and active panel against live production
and the adjacent original mission repositories. Resolve or explicitly accept
gaps in:

- mission entry and splash behavior;
- complete credits, help, navigator legend, and ancillary overlays;
- photo source/download interactions and mission-specific photo aliases;
- Apollo 11 samples and metadata links;
- Apollo 13 spacecraft information;
- Apollo 17 geology/sample content and crew biometrics.

The local samples panel intentionally uses preserved indexes and source links; it
does not recreate the obsolete live MoonDB chemistry interface unless that scope
is separately approved.

## 3. Audit URLs, assets, and historical dates

Inventory supported production routes and verify built-output behavior for the
homepage, `/11/`, `/13/`, `/17/`, GET links, channel links, photo links, old
redirects, asset aliases, case-sensitive media paths, social metadata, countdown
dates, launch boundaries, and mission-end dates. Fix unsupported historical URLs
or document an intentional redirect/retirement decision.

## 4. Validate release environments

Verify on real phones and the staging host:

- keyboard navigation, focus visibility, and screen-reader names;
- portrait and landscape layout, panel reachability, and page overflow;
- full-screen behavior and autoplay/media restrictions;
- production cache headers, route fallbacks, redirects, and CDN paths;
- Linux visual baselines and built-output browser checks;
- deployment and rollback procedure using the current host configuration.

Do not restore the retired `/mobile/`, A13 `spacecraft_dev/`, or A17 `nominee/`
applications to satisfy these checks.

## 5. Release decision and cutover

Summarize the evidence and unresolved limitations in the tracker. Cut over all
three missions together only after the release audit is accepted, the production
and rollback procedures are rehearsed, and the final source/build checks are
green. Preserve the previous production deployment for rollback.

## Verification baseline

- Run `npm run check` before every commit and `npm run build` for application or
  build-output changes.
- Use visible production and typed browser windows plus the adjacent original
  source repositories as described in
  [PHASE6-visual-reference.md](PHASE6-visual-reference.md).
- Exercise GET input, navigator, transcript/TOC/commentary/photo/search seeks,
  play/pause/mute, tab switching, dashboard, share/fullscreen/help controls, and
  MOCR channel changes for the affected scope.
- Run the relevant Playwright behavioral and visual checks. Inspect images before
  changing a reviewed typed baseline; production screenshots remain reference
  evidence, not an exact-pixel gate.
- For control changes, run `npm run test:controls-reference` and
  `npx playwright test --project=visual tests/visual/controls.spec.ts`.

### Fixed comparison GETs

| Snapshot    | A11        | A13        | A17        |
| ----------- | ---------- | ---------- | ---------- |
| pre-launch  | -002:00:00 | -002:00:00 | -002:00:00 |
| launch      | 000:00:00  | 000:00:00  | 000:00:00  |
| key-event-1 | 004:06:54  | 055:54:53  | 022:00:00  |
| key-event-2 | 075:31:12  | 087:58:00  | 118:00:00  |
| final-phase | 195:03:00  | 141:00:00  | 295:00:00  |
| end         | 195:18:35  | 142:54:41  | 301:51:59  |

The complete responsive matrix is three missions × six GETs × desktop
1440×900, tablet 768×1024, and phone 390×844. Standard photography views do
not establish MOCRviz behavior; inspect the open MOCR panel on Apollo 11 and 13.

## Deferred beyond release

Future Apollo missions and rebuilding the preserved ingestion pipeline are
separate work.
Their scope is recorded in [00-decisions.md](00-decisions.md) and
[04-data-and-content-strategy.md](04-data-and-content-strategy.md).
