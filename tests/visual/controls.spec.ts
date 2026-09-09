import { expect, test } from "@playwright/test";

const commanderNames = { "11": "Armstrong", "13": "Lovell", "17": "Cernan" } as const;

for (const mission of ["11", "13", "17"] as const) {
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
      const visibleSpeakers = await transcriptTable
        .locator("[data-testid=transcript-speaker]")
        .allTextContents();
      expect(visibleSpeakers).toContain(commanderNames[mission]);
      expect(visibleSpeakers).toContain("Public Affairs");
      if (mission !== "13") expect(visibleSpeakers).toContain("Mission Control");
      expect(visibleSpeakers).not.toContain("CDR");
      expect(visibleSpeakers).not.toContain("CMP");
      expect(visibleSpeakers).not.toContain("LMP");
      expect(visibleSpeakers).not.toContain("PAO");
      expect(visibleSpeakers).not.toContain("CC");
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
      const controls = page.locator("[data-testid=text-controls]");
      await expect(controls).toBeVisible();
      const positions = await page
        .locator("#searchBtn, #dashboardBtn, #shareBtn, #playPauseBtn")
        .evaluateAll((buttons) =>
          Object.fromEntries(
            buttons.map((button) => {
              const box = button.getBoundingClientRect();
              return [button.id, { top: box.top, bottom: box.bottom, left: box.left }];
            }),
          ),
        );
      if (
        !positions.searchBtn ||
        !positions.dashboardBtn ||
        !positions.shareBtn ||
        !positions.playPauseBtn
      )
        throw new Error("Missing action control");
      expect(positions.searchBtn.left).toBe(positions.dashboardBtn.left);
      expect(positions.searchBtn.bottom).toBeLessThan(positions.dashboardBtn.top);
      expect(positions.shareBtn.top).toBe(positions.searchBtn.top);
      expect(positions.shareBtn.bottom).toBe(positions.dashboardBtn.bottom);
      expect(positions.playPauseBtn.bottom).toBe(positions.dashboardBtn.bottom);
      for (const id of ["share", "playPause"]) {
        const labeledControl = page.locator(`#${id}Btn`);
        await expect(labeledControl).toHaveCSS("font-family", /Oswald/);
        await expect(labeledControl).toHaveCSS("font-size", "12px");
        await expect(labeledControl).toHaveCSS("font-weight", "400");
        await expect(labeledControl).toHaveCSS("line-height", "normal");
      }
      for (const id of [
        "search",
        "realtime",
        "about",
        "dashboard",
        "sound",
        "fullscreen",
        "share",
        "playPause",
      ]) {
        await expect(page.locator(`#${id}Btn`)).toHaveCSS(
          "background-image",
          /data:image\/svg\+xml/,
        );
      }
      const playPause = page.locator("#playPauseBtn");
      await expect(playPause).toHaveAttribute("aria-pressed", "false");
      await expect(playPause).toHaveCSS("animation-duration", "0.2s");
      await expect(playPause).toHaveCSS("animation-timing-function", "steps(1, start)");
      await expect(playPause).toHaveCSS("animation-iteration-count", "infinite");
      await playPause.click();
      await expect(playPause).toHaveAttribute("aria-pressed", "true");
      await expect(playPause).toHaveCSS("animation-name", "none");
      await playPause.click();
      await expect(playPause).toHaveAttribute("aria-pressed", "false");
      await expect(playPause).toHaveCSS("animation-duration", "0.2s");
      await page.locator("#tocTab").hover();
      await expect(page.locator("#tocTab")).toBeVisible();
      await page.locator("#tocTab").click();
      await page.mouse.move(0, 0);
      await expect(page.locator("#tocTab")).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("[data-testid=right-tabs]")).toBeVisible();
      if (mission === "17") return;
      const channels = page.locator("#thirtytrack-container");
      await expect(channels.locator("[data-speaking=true]").first()).toBeAttached();
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
      await expect(page.locator("[data-testid=mission-channels]")).toBeVisible();
      const last = channels.locator("button").last();
      await last.click();
      await expect(last).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#mocrviz-host")).toBeVisible();
    });
  }
}
