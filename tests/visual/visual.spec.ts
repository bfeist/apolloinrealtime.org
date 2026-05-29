import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 6 visual regression spec — typed app at /{N}/?t=GET.
 *
 * Captures full-page screenshots of the local typed app at the 54
 * snapshot GET × viewport combinations and stores them as regression
 * baselines for the typed app. Initial capture: `npm run test:visual:update`.
 * Subsequent runs detect any unintended visual regression.
 *
 * To compare against the production baselines captured in Phase 0
 * (tests/visual/baseline.spec.ts-snapshots/), run both suites and open
 * the Playwright HTML report for a side-by-side inspection.
 *
 * The local dev server must be reachable at http://localhost:5173 — it
 * is auto-started (if not already running) via the webServer config in
 * playwright.config.ts.
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
 * Navigate to the typed app at a specific GET. Uses the `?t=` deep-link
 * that `parseDeepLink` in missionApp.ts handles (mirrors legacy
 * `initializePlayback`). Waits for the transcript panel to render at
 * least some rows, which signals that the CSV data pipeline has finished
 * loading, then allows a short settle window for any remaining panels.
 */
async function gotoTypedAppAtGet(page: Page, mission: MissionId, get: string): Promise<void> {
  const encoded = encodeURIComponent(get);
  await page.goto(`/${mission}/?t=${encoded}`, {
    waitUntil: "domcontentloaded",
  });

  // Wait up to 15 s for at least one transcript row. This is the signal
  // that the utterance CSV has loaded and the transcript panel has
  // rendered. If the mission has no utterances at this GET (shouldn't
  // happen for any snapshot GET), we fall through after the timeout.
  await page
    .locator(
      "#transcriptWrapper tr, #transcriptWrapper .utt_pao, " +
        "#transcriptWrapper .utt_capcom, #transcriptWrapper .utt_mocr, " +
        "#transcriptWrapper .utt_crew",
    )
    .first()
    .waitFor({ timeout: 15_000 })
    .catch(() => {
      // Pre-launch GETs may have no utterance rows yet — that's expected.
      // Let the 2-second settle below handle timing.
    });

  // Let all other async panels (photo, dashboard, navigator overlays) settle.
  await page.waitForTimeout(2_000);
}

for (const mission of Object.keys(SNAPSHOTS) as MissionId[]) {
  for (const snap of SNAPSHOTS[mission]) {
    for (const vp of VIEWPORTS) {
      test(`typed A${mission} ${snap.name} ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await gotoTypedAppAtGet(page, mission, snap.get);
        const buf = await page.screenshot({
          fullPage: false, // viewport only — avoids huge files from overflow:hidden content
          animations: "disabled",
        });
        expect(buf).toMatchSnapshot([`typed`, `a${mission}`, `${snap.name}-${vp.name}.png`]);
      });
    }
  }
}
