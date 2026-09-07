import { expect, test } from "@playwright/test";
import { secondsToTimeId } from "../../src/shell/clock.js";

const slowPhotos = [
  {
    mission: "11",
    page: "/11/?img=AS11-40-5874",
    image: "https://media.apolloinrealtime.org/A11/images/NASA_photos/AS11-40-5874HR.jpg",
  },
  {
    mission: "13",
    page: "/13/?img=AS13-62-8880",
    image: "https://media.apolloinrealtime.org/A13/images/lpi_mirror/medium/AS13/62/8880.jpg",
  },
  {
    mission: "17",
    page: "/17/?t=118:23:37",
    image: "https://media.apolloinrealtime.org/A17/images/flight/4175/AS17-134-20377.jpg",
  },
];

for (const photo of slowPhotos) {
  for (const width of [1440, 390]) {
    test(`review A${photo.mission} photo link stays usable while loading at ${String(width)}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      let releaseImage: () => void = () => undefined;
      const ready = new Promise<void>((resolve) => {
        releaseImage = resolve;
      });
      await page.route(photo.image, async (route) => {
        await ready;
        await route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"/>',
        });
      });
      try {
        await page.goto(photo.page, { waitUntil: "domcontentloaded" });
        const link = page.getByTestId("selected-photo-link");
        const image = page.getByTestId("selected-photo");
        await expect(image).toHaveAttribute("src", photo.image);
        expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(0);
        await expect(link).toBeVisible();
        const box = await link.boundingBox();
        expect(box?.width).toBeGreaterThan(100);
        expect(box?.height).toBeGreaterThan(100);

        releaseImage();
        await expect
          .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
          .toBe(800);
        const geometry = await image.evaluate((element: HTMLImageElement) => {
          const imageBox = element.getBoundingClientRect();
          const linkBox = element.parentElement?.getBoundingClientRect();
          return {
            width: imageBox.width,
            height: imageBox.height,
            linkWidth: linkBox?.width ?? 0,
            linkHeight: linkBox?.height ?? 0,
          };
        });
        expect(geometry.width).toBeLessThanOrEqual(geometry.linkWidth + 1);
        expect(geometry.height).toBeLessThanOrEqual(geometry.linkHeight + 1);
        expect(geometry.width / geometry.height).toBeCloseTo(2 / 3, 2);
      } finally {
        releaseImage();
      }
    });
  }
}

for (const mission of ["11", "13", "17"]) {
  for (const width of [1440, 768, 390]) {
    test(`review A${mission} search styles apply at ${String(width)}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${mission}/?t=001:00:00`);
      await page.getByRole("button", { name: "Search", exact: true }).click();
      const input = page.locator("#searchInputField");
      await expect(input).toHaveCSS("background-color", "rgb(0, 0, 0)");
      await expect(input).toHaveCSS("padding", "6px 10px");
      await input.fill("the");
      const table = page.locator("#searchResultsTable");
      await expect(table.locator("tr").first()).toBeVisible();
      await expect(table).toHaveCSS("border-collapse", "collapse");
      await expect(table.locator("td").first()).toHaveCSS("padding", "4px 6px");
      expect(
        await input.evaluate((element) => {
          const host = document.querySelector("#searchPanelHost");
          return (
            !!host && element.getBoundingClientRect().right <= host.getBoundingClientRect().right
          );
        }),
      ).toBe(true);
      await table.locator("tr").first().click();
      await expect(page.locator("#searchOverlay")).toBeHidden();
    });
  }
}

for (const mission of ["11", "13"]) {
  test(`review A${mission} Mission Control follows GET when seeking and reopening`, async ({
    page,
  }) => {
    const transcript = Array.from(
      { length: 200 },
      (_, index) => `${secondsToTimeId(index * 60)}|Recorded transcript line ${String(index)}`,
    ).join("\n");
    await page.route(/\/MOCR_audio\/transcripts\/CH14_transcript\.txt$/, (route) =>
      route.fulfill({ body: transcript, contentType: "text/plain" }),
    );
    await page.goto(`/${mission}/?t=001:00:00&ch=14`);
    await page.evaluate(() => document.fonts.ready);
    const get = page.locator("#missionElapsedTime");
    const assertActiveRow = async (index: number) => {
      const row = page.locator('[data-testid="mocr-utterance"][aria-current="true"]');
      await expect(row).toHaveAttribute("data-index", String(index));
      await expect
        .poll(() =>
          row.evaluate((element) => {
            const host = element.parentElement;
            if (!host) return -1;
            return Math.round(
              element.getBoundingClientRect().top - host.getBoundingClientRect().top,
            );
          }),
        )
        .toBe(30);
    };
    await get.fill("001:01:00");
    await page.getByRole("button", { name: "GO", exact: true }).click();
    await assertActiveRow(61);

    await page.getByRole("button", { name: "Photography", exact: true }).click();
    await get.fill("002:00:00");
    await page.getByRole("button", { name: "GO", exact: true }).click();
    await page.locator("#btn-ch14").click();
    await assertActiveRow(120);
  });
}
