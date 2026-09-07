import { expect, test, type Page } from "@playwright/test";
import { a11Config } from "../../src/missions/11.config.js";
import { a13Config } from "../../src/missions/13.config.js";
import { a17Config } from "../../src/missions/17.config.js";

async function expectMetadata(page: Page, config?: MissionConfig) {
  const title = config?.meta.title ?? "Apollo in Real Time";
  const description =
    config?.meta.description ??
    "A real-time interactive journey through the Apollo missions. Relive every moment as it occurred.";
  const canonical = config?.meta.ogUrl ?? "https://apolloinrealtime.org/";
  const image = config?.meta.ogImage ?? "https://apolloinrealtime.org/img/screenshot.jpg";
  await expect(page).toHaveTitle(title);
  await expect(page.locator("head title")).toHaveCount(1);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", description);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    description,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    config ? `${config.name} in Real Time` : title,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", image);
  await expect(page.locator('meta[property="fb:app_id"]')).toHaveAttribute(
    "content",
    config?.meta.fbAppId ?? "2942541712463314",
  );
  await expect(page.locator('link[rel="icon"]')).toHaveCount(config ? 1 : 0);
  if (config) {
    const icon = page.locator('link[rel="icon"]');
    await expect(icon).toHaveAttribute("href", `/${config.id}/favicons/favicon-32x32.png`);
    const response = await page.request.get(`/${config.id}/favicons/favicon-32x32.png`);
    expect(response.headers()["content-type"]).toContain("image/");
  }
}

test.describe("static metadata for crawlers without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  for (const config of [undefined, a11Config, a13Config, a17Config]) {
    test(`${config?.name ?? "landing"} serves mission metadata in both static entry URLs`, async ({
      page,
    }) => {
      const route = config ? `/${config.id}/` : "/";
      for (const suffix of ["", "index.html?t=001:00:00"]) {
        await page.goto(`${route}${suffix}`);
        await expectMetadata(page, config);
      }
    });
  }
});

test("client navigation replaces mission metadata and favicons without duplicating static tags", async ({
  page,
}) => {
  // Start in a static mission entry to catch an icon left behind on the landing page.
  await page.goto("/13/?t=001:00:00");
  const documentOrigin = await page.evaluate(() => performance.timeOrigin);
  await expectMetadata(page, a13Config);
  await page.locator("[data-testid=home-link]").click();
  await expectMetadata(page);
  for (const config of [a11Config, a17Config, a13Config]) {
    await page.locator(`a[data-mission-link][href="/${config.id}/"]`).click();
    await expectMetadata(page, config);
    await page.locator('[data-enter="launch"]').click();
    await page.locator("[data-testid=home-link]").click();
    await expectMetadata(page);
  }
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentOrigin);
});
