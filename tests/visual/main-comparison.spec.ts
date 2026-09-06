import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { test, expect, type Page } from "@playwright/test";

// Run two servers: an unchanged checkout of main on 5174 and this branch on 5173.
// Each expected image comes from main in this run, never from the migrated app.
const mainBase = process.env.AIRT_MAIN_BASE ?? "http://localhost:5174";
const gets = {
  "11": ["-002:00:00", "000:00:00", "004:06:54", "075:31:12", "195:03:00", "195:18:35"],
  "13": ["-002:00:00", "000:00:00", "055:54:53", "087:58:00", "141:00:00", "142:54:41"],
  "17": ["-002:00:00", "000:00:00", "022:00:00", "118:00:00", "295:00:00", "301:51:59"],
};
const viewports = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

async function settle(page: Page, mission: boolean, mocr: boolean): Promise<void> {
  if (mission) {
    await expect(page.locator("#transcriptWrapper tr").first()).toBeAttached();
    await expect(page.locator("#photoGallery button").first()).toBeAttached();
    if (mocr) {
      await expect(page.locator(".mocrviz-utterance").first()).toBeAttached({ timeout: 20_000 });
      await expect(page.locator(".mocrviz-status")).not.toContainText("Loading");
    } else {
      await expect
        .poll(
          () =>
            page
              .locator(".selectedPhoto")
              .evaluate((node) => (node as HTMLImageElement).naturalWidth),
          { timeout: 20_000 },
        )
        .toBeGreaterThan(0);
    }
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
}

interface ComparisonCase {
  name: string;
  path: string;
  mission: boolean;
  mocr: boolean;
  panel?: string;
}
const cases: ComparisonCase[] = [
  { name: "landing", path: "/", mission: false, mocr: false },
  ...Object.entries(gets).flatMap(([mission, times]) =>
    times.map((get, index) => ({
      name: `a${mission}-${String(index)}`,
      path: `/${mission}/?t=${encodeURIComponent(get)}`,
      mission: true,
      mocr: false,
    })),
  ),
  ...["11", "13"].map((mission) => ({
    name: `a${mission}-mocr`,
    path: `/${mission}/?t=000:00:00&ch=14`,
    mission: true,
    mocr: true,
  })),
];

// Exercise changed JSX beyond the default transcript/photography composition.
for (const mission of ["11", "13", "17"]) {
  for (const panel of ["toc", "commentary"])
    cases.push({
      name: `a${mission}-${panel}`,
      path: `/${mission}/?t=075:31:12`,
      mission: true,
      mocr: false,
      panel,
    });
}
cases.push(
  { name: "a11-samples", path: "/11/?t=109:34:00", mission: true, mocr: false, panel: "samples" },
  {
    name: "a13-spacecraft",
    path: "/13/?t=055:54:53",
    mission: true,
    mocr: false,
    panel: "spacecraft",
  },
);

async function selectPanel(page: Page, panel?: string): Promise<void> {
  if (!panel) return;
  await page.locator(`#${panel}Tab`).click();
  if (panel === "toc" || panel === "commentary") {
    // Main only scrolls on a changed active entry, whereas React also follows
    // when opening a tab. Seek away/back so both images show the same rows.
    const input = page.locator("#missionElapsedTime");
    const get = await input.inputValue();
    await input.fill("000:00:00");
    await page.locator("#GETBtn").click();
    await input.fill(get);
    await page.locator("#GETBtn").click();
  }
  if (panel === "samples")
    await expect(page.locator(".samples-panel__collections-table tr").first()).toBeVisible();
  if (panel === "spacecraft") {
    const video = page.locator(".spacecraft-panel__video");
    await expect(video).toBeAttached();
    await video.evaluate((node) => {
      const media = node as HTMLVideoElement;
      media.pause();
      media.currentTime = 0;
    });
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

for (const item of cases)
  for (const viewport of viewports) {
    test(`main comparison ${item.name} ${String(viewport.width)}`, async ({
      page,
      context,
    }, testInfo) => {
      test.setTimeout(60_000);
      const baseline = await context.newPage();
      await page.setViewportSize(viewport);
      await baseline.setViewportSize(viewport);
      await baseline.goto(`${mainBase}${item.path}`);
      await settle(baseline, item.mission, item.mocr);
      await selectPanel(baseline, item.panel);
      const options = {
        fullPage: true,
        animations: "disabled" as const,
        stylePath: "tests/visual/screenshot.css",
      };
      const expected = await baseline.screenshot({
        fullPage: true,
        animations: "disabled",
        style: await readFile("tests/visual/screenshot.css", "utf8"),
      });
      const name = `${item.name}-${String(viewport.width)}.png`;
      const path = testInfo.snapshotPath(name);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, expected);
      await testInfo.attach("main", { body: expected, contentType: "image/png" });
      await baseline.close();
      await page.goto(item.path);
      await settle(page, item.mission, item.mocr);
      await selectPanel(page, item.panel);
      await expect(page).toHaveScreenshot(name, options);
    });
  }
