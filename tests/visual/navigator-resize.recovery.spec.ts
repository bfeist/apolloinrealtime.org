import { expect, test } from "@playwright/test";
import { a11Config } from "../../src/missions/11.config.js";
import { a13Config } from "../../src/missions/13.config.js";
import { a17Config } from "../../src/missions/17.config.js";
import { timeStrToSeconds } from "../../src/shell/clock.js";

for (const config of [a11Config, a13Config, a17Config]) {
  test(`${config.name} navigator resizes its drawing and preserves accurate GET clicks`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${config.id}/?t=000:00:00`);
    const canvas = page.locator("#navCanvas");
    await expect(page.locator("#missionElapsedTime")).toHaveValue("000:00:00");

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await expect
        .poll(() =>
          canvas.evaluate((element: HTMLCanvasElement) => {
            const bounds = element.getBoundingClientRect();
            const paper = (window as unknown as { paper?: PaperScopeLike }).paper;
            if (!paper?.view) return Number.POSITIVE_INFINITY;
            return Math.max(
              Math.abs(paper.view.size.width - bounds.width),
              Math.abs(paper.view.size.height - bounds.height),
              Math.abs(element.width / devicePixelRatio - bounds.width),
              Math.abs(element.height / devicePixelRatio - bounds.height),
            );
          }),
        )
        .toBeLessThanOrEqual(1);

      const bounds = await canvas.boundingBox();
      if (!bounds) throw new Error("Navigator canvas is not visible");
      // Use the actual integer browser coordinate to avoid a rounding error
      // of hundreds of GET seconds per pixel on narrow whole-mission tiers.
      const clickX = Math.round(bounds.x + bounds.width * 0.6);
      const localX = clickX - bounds.x;
      const expectedGet =
        -config.countdownSeconds +
        ((localX - bounds.width * 0.03) / (bounds.width * 0.94)) *
          (config.countdownSeconds + config.missionDurationSeconds);
      await page.mouse.click(clickX, Math.round(bounds.y + 5));
      await expect
        .poll(async () =>
          Math.abs(
            timeStrToSeconds(await page.locator("#missionElapsedTime").inputValue()) - expectedGet,
          ),
        )
        .toBeLessThan(2);
    }
  });
}
