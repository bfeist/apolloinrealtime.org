import { test, expect } from "@playwright/test";

/**
 * Phase 0 placeholder: the local app is an empty shell, so this just
 * smoke-tests that the dev server serves each mission route. Real visual
 * diffs vs. the Phase-0 baselines kick in once the lift phases land.
 */
const ROUTES = ["/", "/11/", "/13/", "/17/"] as const;

for (const route of ROUTES) {
  test(`local route ${route} responds`, async ({ page }) => {
    const res = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBe(true);
    await expect(page.locator("body")).toBeVisible();
  });
}
