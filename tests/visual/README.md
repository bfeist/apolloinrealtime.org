# Visual regression baselines

Captured from production (`apolloinrealtime.org`) in Phase 0 by
`tests/visual/baseline.spec.ts`. Stored as Playwright snapshots under
`tests/visual/baseline.spec.ts-snapshots/baseline/`. Re-run with:

```bash
npm run test:baseline   # rewrite baselines from prod
npm run test:visual     # diff local app vs baselines
```

Snapshot set per `docs-plan/05-migration-plan.md`:

- Six GET points per mission (pre-launch, launch, key-event-1,
  key-event-2, final-phase, end)
- Three viewports (desktop 1440, tablet 768, phone 390)
- 54 images total (3 missions × 6 × 3)
