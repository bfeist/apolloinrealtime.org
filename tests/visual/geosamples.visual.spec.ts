import { expect, test } from "@playwright/test";

const sampleDetails: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  "72260": {
    SAMPLETYPE: "Soil",
    SAMPLESUBTYPE: "Unsieved",
    BAGNUMBER: null,
    STATION: "2",
    ORIGINALWEIGHT: 100.6,
    LANDMARK: null,
    PRISTINITY: 99.6,
    PRISTINITYDATE: "August, 15 2007 00:00:00",
    GENERICDESCRIPTION: "Fines, Unsieved",
  },
  "72261": { SAMPLETYPE: "Soil", SAMPLESUBTYPE: "<1 mm", STATION: "2" },
  "72262": { SAMPLETYPE: "Soil", SAMPLESUBTYPE: "1-2 mm", STATION: "2" },
  "72263": { SAMPLETYPE: "Soil", SAMPLESUBTYPE: "2-4 mm", STATION: "2" },
  "72264": { SAMPLETYPE: "Soil", SAMPLESUBTYPE: "4-10 mm", STATION: "2" },
};

test("Apollo 17 transcript bag links open the legacy geology overlay", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(
    /curator\.jsc\.nasa\.gov\/rest\/lunarapi\/samples\/sampledetails\/(\d+)$/,
    (route) => {
      const sample = /sampledetails\/(\d+)$/.exec(route.request().url())?.[1] ?? "";
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([sampleDetails[sample] ?? {}]),
      });
    },
  );
  await page.goto("/17/?t=143:06:02");

  const bagLink = page.locator("#uttid1430602").getByRole("button", { name: "498", exact: true });
  await expect(bagLink).toBeVisible();
  await expect(bagLink).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(bagLink).toHaveCSS("text-decoration-line", "underline");
  await bagLink.click();

  const overlay = page.getByTestId("geosample-overlay");
  await expect(overlay).toBeVisible();
  await expect(
    overlay.getByRole("heading", { name: "Geology Sample Information - Bag: 498" }),
  ).toBeVisible();
  await expect(overlay.locator('[data-testid^="geosample-7"]')).toHaveCount(5);
  await expect(overlay.getByText("Sample Information", { exact: true })).toHaveCount(5);
  await expect(overlay.locator('a[href*="moondb.org"]')).toHaveCount(0);
  await expect(overlay.getByText("MoonDB", { exact: true })).toHaveCount(0);
  await expect(
    overlay.getByTestId("geosample-72260").getByTestId("geosample-details"),
  ).toContainText("Fines, Unsieved");
  await expect(
    overlay.getByRole("link", { name: "Lunar Sample Curation Info" }).first(),
  ).toHaveAttribute("href", /sample=72260$/);

  const geometry = await page.locator("[data-testid=right-panel]").evaluate((panel) => {
    const overlayElement = panel.querySelector<HTMLElement>("[data-testid=geosample-overlay]");
    const panelBox = panel.getBoundingClientRect();
    const overlayBox = overlayElement?.getBoundingClientRect();
    return {
      panel: [panelBox.left, panelBox.top, panelBox.right, panelBox.bottom],
      overlay: overlayBox
        ? [overlayBox.left, overlayBox.top, overlayBox.right, overlayBox.bottom]
        : undefined,
    };
  });
  expect(geometry.overlay).toEqual(geometry.panel);
  await expect
    .poll(() =>
      overlay
        .locator("div")
        .first()
        .evaluate((element) => element.scrollHeight > element.clientHeight),
    )
    .toBe(true);

  await page.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0);
  await expect(page.locator("#photodiv")).toBeVisible();
});
