import { expect, test } from "@playwright/test";

for (const mission of ["11", "13", "17"]) {
  for (const width of [1440, 768, 390]) {
    test(`recovery A${mission} layout and transport at ${String(width)}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 768 ? 1024 : 900 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`/${mission}/?t=000:00:00`);
      const get = page.getByRole("textbox", { name: "Ground Elapsed Time", exact: true });
      await expect(get).toHaveValue("000:00:00");
      await expect(page.locator("#transcriptWrapper tr").first()).toBeAttached();
      await get.fill("001:00:00");
      await page.getByRole("button", { name: "GO", exact: true }).click();
      await expect(get).toHaveValue("001:00:00");
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await expect(get).not.toHaveValue("001:00:00", { timeout: 4000 });
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      const paused = await get.inputValue();
      await page.waitForTimeout(1100);
      await expect(get).toHaveValue(paused);
      await page.getByRole("tab", { name: "Mission Milestones", exact: true }).click();
      await expect(page.locator("#tocWrapper")).toBeVisible();
      await page.getByRole("button", { name: "Share this moment", exact: true }).click();
      await expect(page.locator("#shareUrl")).toHaveValue(new RegExp(`/${mission}/\\?t=`));
      await page.getByRole("button", { name: "Close share dialog", exact: true }).click();
      const geometry = await page.evaluate(() => {
        const box = (selector: string): DOMRect => {
          const element = document.querySelector(selector);
          if (!element) throw new Error(`Missing ${selector}`);
          return element.getBoundingClientRect();
        };
        const video = box(".airt-monitor--top");
        const tabs = box(".airt-tabs-wrapper");
        const text = box(".airt-monitor--text");
        const photo = box(".airt-right");
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          overlap: video.bottom > tabs.top + 1 || tabs.bottom > text.top + 1,
          photoHeight: photo.height,
          textHeight: text.height,
        };
      });
      expect(geometry.overflow).toBe(false);
      expect(geometry.overlap).toBe(false);
      expect(geometry.photoHeight).toBeGreaterThan(250);
      expect(geometry.textHeight).toBeGreaterThan(100);
      expect(errors).toEqual([]);
    });
  }
}

test("recovery A13 seek sources update the same GET", async ({ page }) => {
  await page.goto("/13/?t=055:54:53");
  const get = page.locator("#missionElapsedTime");
  const line = page.locator("#transcriptWrapper tr").filter({ hasText: "As long as he's in P00" });
  await line.click();
  await expect(get).toHaveValue("055:54:44");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.locator("#searchInputField").fill("cryo tanks");
  const result = page.locator("#searchResultsTable tr").filter({ hasText: "cryo tanks" }).first();
  await result.click();
  await expect(get).not.toHaveValue("055:54:44");
  await expect(page.locator("#searchOverlay")).toBeHidden();
  await page.locator('[aria-label="View photo AS13-62-8880 at 068:00:02"]').click();
  await expect(get).toHaveValue("068:00:02");
});

for (const mission of ["11", "13"]) {
  test(`recovery A${mission} native Mission Control`, async ({ page }) => {
    await page.goto(`/${mission}/?t=000:00:00&ch=14`);
    await expect(page.locator(".mocrviz-room-image")).toBeVisible();
    await expect(page.locator(".mocrviz-timeline")).toBeVisible();
    await page.locator("#btn-ch50").click();
    await expect(page.locator(".mocrviz-channel-name")).toContainText("CH 50");
    await expect(page.locator("#btn-ch50")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".mocrviz-audio")).toHaveAttribute(
      "src",
      new RegExp(`media.apolloinrealtime.org/A${mission}/MOCR_audio/`),
    );
    await page.getByRole("button", { name: "Photography", exact: true }).click();
    await expect(page.locator("#mocrviz-host")).toBeHidden();
    await expect(page.locator("#photodiv")).toBeVisible();
  });
}

test("recovery mission-specific panels and photo deep links", async ({ page }) => {
  await page.goto("/13/?img=AS13-62-8880");
  await expect(page.locator("#missionElapsedTime")).toHaveValue("068:00:02");
  await page.getByRole("button", { name: "Spacecraft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The Apollo 13 Spacecraft", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Photography", exact: true }).click();
  await expect(page.locator("#spacecraft-host")).toBeHidden();
  await page.goto("/11/?t=109:34:00");
  await page.getByRole("button", { name: "Astromaterial Samples", exact: true }).click();
  await expect(page.locator(".samples-panel__collection")).toHaveCount(7);
  await page.locator(".samples-panel__collection").first().click();
  await expect(page.locator("#missionElapsedTime")).toHaveValue("109:34:00");
  await expect(page.locator("#samples-host")).toBeVisible();
  await page.getByRole("button", { name: "Photography", exact: true }).click();
  await expect(page.locator("#samples-host")).toBeHidden();
  await page.goto("/17/?t=110:08:50");
  await expect(page.locator(".biometrics-row").first()).toBeAttached();
  if (await page.locator(".airt-dashboard-overlay").isHidden())
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.locator(".airt-dashboard-overlay")).toBeVisible();
  await expect(page.locator(".biometrics-row").first()).toContainText("85 bpm");
  await page.goto("/11/?t=075:31:12");
  await expect(page.locator("#dashMissionDay")).toHaveText("4");
  await expect(page.locator(".airt-dashboard-overlay")).toBeVisible();
});

for (const mission of ["11", "13"]) {
  for (const width of [1440, 768, 390]) {
    test(`recovery MOCR screenshot A${mission} at ${String(width)}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 768 ? 1024 : 900 });
      const waveform = page.waitForResponse((r) => r.url().endsWith(".dat") && r.ok());
      await page.goto(`/${mission}/?t=000:00:00&ch=14`);
      await waveform;
      await expect(page.locator(".mocrviz-room-image")).toBeVisible();
      await expect(page.locator(".mocrviz-utterance").first()).toBeAttached({ timeout: 20000 });
      await page.waitForTimeout(1000);
      await expect(page.locator("#mocrviz-host")).toHaveScreenshot(
        `mocr-a${mission}-${String(width)}.png`,
        { animations: "disabled" },
      );
    });
  }
}

for (const width of [1440, 768, 390]) {
  test(`recovery production landing at ${String(width)}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByText("This website consists entirely of historical mission material", {
        exact: true,
      }),
    ).toBeVisible();
    for (const mission of ["11", "13", "17"])
      await expect(page.locator(`a[href="/${mission}/"]`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`landing-${String(width)}.png`, {
      fullPage: true,
      animations: "disabled",
    });
  });
}
