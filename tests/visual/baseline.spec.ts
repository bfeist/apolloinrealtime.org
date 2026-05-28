import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 0 baseline capture: pull screenshots from production
 * (apolloinrealtime.org) at six narrative GETs per mission across three
 * viewports = 54 snapshots. These become the regression oracle for every
 * subsequent phase. Run with `npm run test:baseline` (rewrites snapshots).
 *
 * Snapshot table is from docs-plan/05-migration-plan.md.
 */

type MissionId = "11" | "13" | "17";

interface Snapshot {
  name: string;
  get: string; // "HHH:MM:SS" or "-HHH:MM:SS"
}

const SNAPSHOTS: Record<MissionId, Snapshot[]> = {
  "11": [
    { name: "pre-launch", get: "-002:00:00" },
    { name: "launch", get: "000:00:00" },
    { name: "key-event-1", get: "004:06:54" },
    { name: "key-event-2", get: "075:31:12" },
    { name: "final-phase", get: "195:03:00" },
    { name: "end", get: "195:18:35" },
  ],
  "13": [
    { name: "pre-launch", get: "-002:00:00" },
    { name: "launch", get: "000:00:00" },
    { name: "key-event-1", get: "055:54:53" },
    { name: "key-event-2", get: "087:58:00" },
    { name: "final-phase", get: "141:00:00" },
    { name: "end", get: "142:54:41" },
  ],
  "17": [
    { name: "pre-launch", get: "-002:00:00" },
    { name: "launch", get: "000:00:00" },
    { name: "key-event-1", get: "022:00:00" },
    { name: "key-event-2", get: "118:00:00" },
    { name: "final-phase", get: "295:00:00" },
    { name: "end", get: "301:51:59" },
  ],
};

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 390, height: 844 },
] as const;

/**
 * The legacy app reads the deep-link GET from `?t=HHH:MM:SS` (and a few
 * variants across missions). We try the most-common variants and fall back
 * to a postMessage-style hash. If a mission ignores the query param, the
 * baseline will still capture the default landing state for that viewport,
 * which is informative.
 */
async function gotoMissionAtGet(page: Page, mission: MissionId, get: string): Promise<void> {
  const encoded = encodeURIComponent(get);
  await page.goto(`/${mission}/?t=${encoded}`, { waitUntil: "networkidle" });
  // Best-effort settle: let any deferred load/animation complete.
  await page.waitForTimeout(2000);
}

for (const mission of Object.keys(SNAPSHOTS) as MissionId[]) {
  for (const snap of SNAPSHOTS[mission]) {
    for (const vp of VIEWPORTS) {
      test(`A${mission} ${snap.name} ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await gotoMissionAtGet(page, mission, snap.get);
        // Single-shot capture via toMatchSnapshot — avoids the two-consecutive-
        // identical-frames stability requirement of toHaveScreenshot, which the
        // live mission clock at launch/pre-launch points can never satisfy.
        const buf = await page.screenshot({ fullPage: true, animations: "disabled" });
        expect(buf).toMatchSnapshot([`baseline`, `a${mission}`, `${snap.name}-${vp.name}.png`]);
      });
    }
  }
}
