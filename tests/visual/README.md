# Browser verification

`npm run test:visual` runs local behavioral checks and compares the typed app
with its own reviewed screenshots. `npm run test:visual:update` deliberately
replaces those screenshots; inspect changes before committing them.

- `visual.spec.ts`: 54 full-page views (three missions, six fixed GETs, three
  viewports). Exact coordinates are in docs-plan/visual-reference.md.
- `recovery.spec.ts`: shared transport, seek sources, photo deep links,
  mission-specific content, no horizontal overflow or overlapping controls,
  real MOCR data paths, plus six MOCR panel screenshots.
- `baseline.spec.ts-snapshots`: original production references. They are
  separate from typed screenshots; the local test does NOT compare their
  pixels automatically. Use them and live production for human comparison.

YouTube embeds are hidden in shell snapshots because posters, ads and player
chrome vary independently of this repository. Local controls and dashboard
remain visible in those screenshots. Photo and MOCR requests still use the actual
historical services. Capture waits for the selected photo to load; investigate
network failures before changing a baseline.

Windows screenshots are platform-specific. Review intentional snapshot changes
when moving the suite to a different operating system. Keep the dev server stable
during runs: HMR caused by concurrent source edits can reset a test.

`npm run test:baseline` overwrites production references; it is not a routine
verification command. Never overwrite the production oracle to match new code.

## Compare a migration with main

`npm run test:main-comparison` captures unchanged main and the working branch
at matching mission times, viewports, and selected panels. It covers the
homepage, 54 mission views, MOCR, text tabs, samples, and spacecraft. Expected
images come from main on every run, and generated comparisons stay under
ignored `.local/`; this command never updates committed screenshots.

Run an unchanged checkout of main with `node node_modules/vite/bin/vite.js
--port 5174`, then run this branch on port 5173. Set `AIRT_MAIN_BASE` and
`AIRT_LOCAL_BASE` to override those addresses. Both servers must serve the
same original public assets. Freeze source edits during the comparison run.

`routing.spec.ts` checks React Router navigation, state reset, route stylesheet
cleanup, shared Query requests, and late photo responses. The older committed
visual snapshots may lag main; investigate differences against main before
replacing them.
