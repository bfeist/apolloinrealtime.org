import { expect, test } from "@playwright/test";

for (const mission of ["11", "13", "17"]) {
  for (const width of [1440, 390]) {
    test(`A${mission} controls remain readable at ${String(width)}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${mission}/?t=000:00:00`);
      await expect(page.locator("#transcriptWrapper tr").first()).toBeAttached();
      await page.evaluate(() => document.fonts.ready);
      const transcriptTable = page.locator("#utteranceTable");
      const transcriptCells = transcriptTable.locator("tr").first().locator("td");
      await expect(transcriptTable).toHaveCSS("border-collapse", "collapse");
      await expect(transcriptCells.first()).toHaveCSS("font-size", "13px");
      const transcriptGeometry = await transcriptCells.evaluateAll((cells) =>
        cells.map((cell) => {
          const style = getComputedStyle(cell);
          return {
            width: cell.getBoundingClientRect().width,
            borderLeft: style.borderLeftWidth,
            borderRight: style.borderRightWidth,
          };
        }),
      );
      expect(transcriptGeometry).toHaveLength(3);
      expect(transcriptGeometry[0]?.width).toBeLessThan(82);
      expect(transcriptGeometry[1]?.width).toBeLessThan(82);
      expect(
        transcriptGeometry.every(
          ({ borderLeft, borderRight }) => borderLeft === "0px" && borderRight === "0px",
        ),
      ).toBe(true);
      const controls = page.locator(".airt-tabs-wrapper");
      await expect(controls).toBeVisible();
      await page.locator("#tocTab").hover();
      await expect(page.locator("#tocTab")).toBeVisible();
      await page.locator("#tocTab").click();
      await page.mouse.move(0, 0);
      await expect(page.locator("#tocTab")).toHaveAttribute("aria-selected", "true");
      await expect(page.locator(".airt-right__tabs")).toBeVisible();
      if (mission === "17") return;
      const channels = page.locator(".airt-channels__list");
      await expect(channels.locator(".is-speaking").first()).toBeAttached();
      const clipped = await channels.locator("button").evaluateAll((buttons) =>
        buttons
          .filter((button) => {
            const text = document.createRange();
            text.selectNodeContents(button);
            const label = text.getBoundingClientRect();
            const box = button.getBoundingClientRect();
            return box.height < 18 || label.height > box.height || label.right > box.right;
          })
          .map((button) => button.textContent),
      );
      expect(clipped).toEqual([]);
      await expect(page.locator(".airt-channels")).toBeVisible();
      const last = channels.locator("button").last();
      await last.click();
      await expect(last).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#mocrviz-host")).toBeVisible();
    });
  }
}
