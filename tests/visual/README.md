# Browser verification

`npm run test:visual` runs local behavioral checks and compares the typed app
with its own reviewed screenshots. `npm run test:visual:update` deliberately
replaces those screenshots; inspect changes before committing them.

- `visual.spec.ts`: 54 full-page views (three missions, six fixed GETs, three
  viewports). Exact coordinates are in docs-plan/05-migration-plan.md.
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

Windows screenshots are platform-specific. Recapture and review on the
cutover CI host before using Linux as the release gate. Keep the dev server
stable during runs: HMR caused by concurrent source edits can reset a test.

`npm run test:baseline` overwrites production references; it is not a routine
verification command. Never overwrite the production oracle to match new code.
