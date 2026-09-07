import { expect, test } from "@playwright/test";

for (const [mission, coverageStart, firstGet, coverageEnd, years, finalGet] of [
  ["11", "2026-07-15T16:45:52Z", "-20:46:08", "2026-07-24T19:40:31Z", 57, "198:08:30"],
  ["13", "2026-04-10T07:55:32Z", "-35:17:28", "2026-04-18T03:13:00Z", 56, "151:59:59"],
  ["17", "2026-12-07T02:55:38Z", "-02:37:22", "2026-12-19T23:22:40Z", 54, "305:49:39"],
] as const) {
  test(`A${mission} anniversary copy updates at the recording boundaries without reloading`, async ({
    page,
  }) => {
    await page.clock.install({ time: Date.parse(coverageStart) - 2000 });
    await page.clock.pauseAt(Date.parse(coverageStart) - 1000);
    await page.goto(`/${mission}/`);
    const label = page.getByTestId("mission-anniversary");
    await expect(label).toHaveText(`${String(years - 1)} years ago`);
    await page.clock.runFor(1000);
    await expect(label).toHaveText(`Exactly ${String(years)} years ago`);
    await page.clock.setSystemTime(Date.parse(coverageEnd) - 2000);
    await page.clock.runFor(1000);
    await expect(label).toHaveText(`Exactly ${String(years)} years ago`);
    await page.clock.runFor(1000);
    await expect(label).toHaveText(`${String(years)} years ago`);
  });

  test(`A${mission} Now, realtime links, and sync include the first prelaunch recording`, async ({
    page,
  }) => {
    const now = Date.parse(coverageStart);
    await page.clock.install({ time: now });
    await page.clock.pauseAt(now);
    await page.goto(`/${mission}/`);
    await expect(page.getByTestId("mission-anniversary")).toHaveText(
      `Exactly ${String(years)} years ago`,
    );
    await page.locator('[data-enter="now"]').click();
    await expect(page.locator("#missionElapsedTime")).toHaveValue(firstGet);
    await page.goto(`/${mission}/?t=rt`);
    await expect(page.locator("#missionElapsedTime")).toHaveValue(firstGet);
    await page.goto(`/${mission}/?t=001:00:00`);
    await page.getByRole("button", { name: "Sync to today's clock", exact: true }).click();
    await expect(page.locator("#missionElapsedTime")).toHaveValue(firstGet);
  });

  test(`A${mission} Now and realtime links include the final post-splashdown recording`, async ({
    page,
  }) => {
    const now = Date.parse(coverageEnd) - 1000;
    await page.clock.install({ time: now });
    await page.clock.pauseAt(now);
    await page.goto(`/${mission}/`);
    await expect(page.getByTestId("mission-anniversary")).toHaveText(
      `Exactly ${String(years)} years ago`,
    );
    await page.locator('[data-enter="now"]').click();
    await expect(page.locator("#missionElapsedTime")).toHaveValue(finalGet);
    await expect(page.locator("#transcriptWrapper tr").first()).toBeAttached();
    await page.goto(`/${mission}/?t=rt`);
    await expect(page.locator("#missionElapsedTime")).toHaveValue(finalGet);
  });
}

test("anniversary Now enters the same historical calendar day", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-04-14T03:07:53Z") });
  await page.clock.pauseAt(new Date("2026-04-14T03:07:53Z"));
  await page.goto("/13/");
  await expect(page.getByTestId("mission-anniversary")).toHaveText("Exactly 56 years ago");
  await expect(page.locator("[data-historical-date]")).toHaveText("Tue, 14 Apr 1970");
  await page.locator('[data-enter="now"]').click();
  await expect(page.locator("#missionElapsedTime")).toHaveValue("055:54:53");
});
