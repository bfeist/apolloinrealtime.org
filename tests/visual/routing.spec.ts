import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function seek(page: Page, time: string): Promise<void> {
  await page.locator("#missionElapsedTime").fill(time);
  await page.locator("#GETBtn").click();
  await expect(page.locator("#missionElapsedTime")).toHaveValue(time);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1);
}

test("client mission navigation resets transport and channels without landing style leakage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const documentOrigin = await page.evaluate(() => performance.timeOrigin);
  await expect(page.locator("body")).toHaveCSS("background-image", /landing\/background_/);
  await expectNoHorizontalOverflow(page);
  await page.locator('a[data-mission-link][href="/13/"]').click();
  await expect(page.locator("#missionSplashTitle")).toHaveText("Apollo 13");
  await page.locator('[data-enter="launch"]').click();
  await expect(page.locator("[aria-labelledby=missionSplashTitle]")).toHaveCount(0);
  await expect(page.locator("#playPauseBtn")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#playPauseBtn").click();
  await seek(page, "055:54:53");
  await page.locator("#playPauseBtn").click();
  await expect(page.locator("#missionElapsedTime")).not.toHaveValue("055:54:53");
  await page.locator("#playPauseBtn").click();
  await expect(page.locator("#playPauseBtn")).toHaveAttribute("aria-pressed", "false");
  await page.locator("#btn-ch50").click();
  await expect(page.locator("#btn-ch50")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#soundBtn").click();
  await page.locator("#playPauseBtn").click();

  // Leave with an active clock/channel, then enter another mission in the same document.
  await page.locator("[data-testid=home-link]").click();
  await expect(page.locator("body")).toHaveCSS("background-image", /landing\/background_/);
  await page.locator('a[data-mission-link][href="/17/"]').click();
  await expect(page.locator("#missionSplashTitle")).toHaveText("Apollo 17");
  await expect(page.locator("#missionElapsedTime")).toHaveValue("-00:01:05");
  await expect(page.locator("#playPauseBtn")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#soundBtn")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("[data-testid=mission-channels]")).toBeHidden();
  await expect(page.locator("#mocrviz-host")).toBeHidden();
  await page.locator('[data-enter="launch"]').click();
  await page.locator("#playPauseBtn").click();
  await expect(page.locator("#photodiv")).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-image", "none");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
  }
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentOrigin);
});

test("browser back restores the mission deep link and initializes its channel again", async ({
  page,
}) => {
  await page.goto("/11/?t=075:31:12&ch=50");
  await expect(page.locator("#missionElapsedTime")).toHaveValue("075:31:12");
  await expect(page.locator("#btn-ch50")).toHaveAttribute("aria-pressed", "true");
  await seek(page, "001:00:00");
  await page.locator("#playPauseBtn").click();
  await page.locator("[data-testid=home-link]").click();
  await page.locator('a[data-mission-link][href="/13/"]').click();
  await expect(page.locator("#missionSplashTitle")).toHaveText("Apollo 13");
  await page.goBack();
  await expect(page.locator("[aria-labelledby=mission-selection]")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/11\/\?t=075:31:12&ch=50$/);
  await expect(page.locator("header h1")).toHaveText("Apollo 11");
  await expect(page.locator("[aria-labelledby=missionSplashTitle]")).toHaveCount(0);
  await expect(page.locator("#missionElapsedTime")).toHaveValue("075:31:12");
  await expect(page.locator("#playPauseBtn")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#btn-ch50")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#mocrviz-host")).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-image", "none");
  await expectNoHorizontalOverflow(page);
});

test("navigator, panels, and search share a single immutable mission data request", async ({
  page,
}) => {
  const counts = { photoData: 0, utteranceData: 0 };
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/13/indexes/photoData.csv") counts.photoData++;
    if (path === "/13/indexes/utteranceData.csv") counts.utteranceData++;
  });
  await page.goto("/13/?t=055:54:53");
  await expect(page.locator("#utteranceTable tr").first()).toBeAttached();
  await expect(page.locator("#photoGallery [aria-current=true]")).toHaveCount(1);
  await page.locator("#searchBtn").click();
  await page.locator("#searchInputField").fill("cryo tanks");
  await expect(page.locator("#searchResultsTable tr").first()).toBeVisible();
  await page.locator("#searchClose").click();
  await page.locator("#tocTab").click();
  await expect(page.locator("#tocWrapper li[data-timeid]").first()).toBeAttached();
  await page.locator("#commentaryTab").click();
  await expect(page.locator("#commentaryTable tr").first()).toBeAttached();
  expect(counts).toEqual({ photoData: 1, utteranceData: 1 });

  // Cached mission data also survives unmounting its page and returning through a Link.
  await page.locator("[data-testid=home-link]").click();
  await page.locator('a[data-mission-link][href="/13/"]').click();
  await page.locator('[data-enter="launch"]').click();
  await page.locator("#playPauseBtn").click();
  await expect(page.locator("#utteranceTable tr").first()).toBeAttached();
  await expect(page.locator("#photoGallery [aria-current=true]")).toHaveCount(1);
  expect(counts).toEqual({ photoData: 1, utteranceData: 1 });
});

test("a delayed photo deep link cannot replace a newer manual GET seek", async ({ page }) => {
  let releasePhoto = (): void => {
    /* Installed synchronously by the Promise constructor below. */
  };
  let markPhotoFetched = (): void => {
    /* Installed synchronously by the Promise constructor below. */
  };
  const photoGate = new Promise<void>((resolve) => {
    releasePhoto = resolve;
  });
  const photoFetched = new Promise<void>((resolve) => {
    markPhotoFetched = resolve;
  });
  await page.route("**/13/indexes/photoData.csv*", async (route) => {
    const response = await route.fetch();
    markPhotoFetched();
    await photoGate;
    await route.fulfill({ response });
  });
  try {
    await page.goto("/13/?img=AS13-62-8880");
    await photoFetched;
    await seek(page, "055:54:53");
    releasePhoto();
    await expect(page.locator("#photoGallery [aria-current=true]")).toHaveCount(1);
    // Wait through the render/effect cycle that applies resolved photo links.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );
    await expect(page.locator("#missionElapsedTime")).toHaveValue("055:54:53");
    await expect(page.locator("#photodiv [data-testid=selected-photo]")).toBeAttached();
    await expect(page.locator("#photodiv [data-testid=selected-photo]")).not.toHaveAttribute(
      "alt",
      "AS13-62-8880",
    );
  } finally {
    releasePhoto();
  }
});

test("navigator mouse seeks still work after a mission page remount", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/13/?t=000:00:00");
  await expect(page.locator("#missionElapsedTime")).toHaveValue("000:00:00");
  await expect(async () => {
    await page.locator("#navCanvas").click({ position: { x: 300, y: 20 } });
    await expect(page.locator("#missionElapsedTime")).not.toHaveValue("000:00:00");
  }).toPass();

  await page.locator("[data-testid=home-link]").click();
  await page.locator('a[data-mission-link][href="/17/"]').click();
  await page.locator('[data-enter="launch"]').click();
  await page.locator("#playPauseBtn").click();
  await expect(page.locator("#playPauseBtn")).toHaveAttribute("aria-pressed", "false");
  await seek(page, "000:00:00");
  await expect(async () => {
    await page.locator("#navCanvas").click({ position: { x: 420, y: 20 } });
    await expect(page.locator("#missionElapsedTime")).not.toHaveValue("000:00:00");
  }).toPass();
});

test("explicit index.html URLs preserve mission and GET routing", async ({ page }) => {
  await page.goto("/index.html");
  await expect(page.locator("[aria-labelledby=mission-selection]")).toBeVisible();
  for (const mission of ["11", "13", "17"]) {
    await page.goto(`/${mission}/index.html?t=001:00:00`);
    await expect(page.locator("header h1")).toHaveText(`Apollo ${mission}`);
    await expect(page.locator("#missionElapsedTime")).toHaveValue("001:00:00");
  }
});
