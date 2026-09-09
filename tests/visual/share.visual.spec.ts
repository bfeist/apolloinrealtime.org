import { expect, test } from "@playwright/test";

for (const mission of ["11", "13", "17"] as const) {
  test(`A${mission} share dialog preserves the original content and copy behavior`, async ({
    context,
    page,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/${mission}/?t=143:06:02`);
    await page.getByRole("button", { name: "Share this moment", exact: true }).click();

    const dialog = page.locator("#shareDialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Share Website" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Share this Mission Moment" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Join our Forum" })).toBeVisible();
    await expect(page.locator("#shareUrl")).toHaveValue(new RegExp(`/${mission}/\\?t=143:06:02$`));
    await expect(page.locator("#shareUrl")).not.toHaveValue(/%3A/i);

    const websiteCopy = page.locator("#shareModalCopyWebsiteLinkAction");
    await websiteCopy.click();
    await expect(websiteCopy).toHaveText("LINK COPIED");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`https://apolloinrealtime.org/${mission}${mission === "17" ? "/" : ""}`);

    const momentCopy = page.locator("#shareModalCopyLinkAction");
    await momentCopy.click();
    await expect(momentCopy).toHaveText("LINK COPIED");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toMatch(new RegExp(`/${mission}/\\?t=143:06:02$`));

    if (mission === "17") {
      await expect(page.locator("#shareModelChannel")).toHaveCount(0);
    } else {
      await expect(page.locator("#shareModelChannel")).toHaveText("Main space-to-ground");
    }

    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Share this moment", exact: true }).click();
    await expect(websiteCopy).toHaveText("COPY LINK");
    await expect(momentCopy).toHaveText("COPY LINK");
  });
}

test("share dialog includes the selected Mission Control channel", async ({ page }) => {
  await page.goto("/13/?t=055:54:53");
  await page.locator("#btn-ch50").click();
  await page.getByRole("button", { name: "Share this moment", exact: true }).click();

  await expect(page.locator("#shareModelChannel")).toHaveText("FLIGHT");
  await expect(page.locator("#shareUrl")).toHaveValue(/\/13\/\?t=055:54:53&ch=50$/);
});
