import { expect, test, type Locator } from "@playwright/test";

async function face(locator: Locator): Promise<Record<string, string>> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(
      [
        "height",
        "padding",
        "fontSize",
        "fontWeight",
        "textAlign",
        "borderRadius",
        "backgroundColor",
        "boxShadow",
        "textShadow",
        "borderRight",
        "borderBottom",
      ].map((key) => [
        key,
        style.getPropertyValue(key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)),
      ]),
    );
  });
}

// Separate live-site audit: npm run test:controls-reference.
// These comparisons cannot be made green by overwriting typed screenshot baselines.
for (const mission of ["11", "13", "17"]) {
  test(`A${mission} button faces agree with live production`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const live = await context.newPage();
    const local = await context.newPage();
    await Promise.all([
      live.goto(`https://apolloinrealtime.org/${mission}/?t=000:00:00`),
      local.goto(`http://localhost:5173/${mission}/?t=000:00:00`),
    ]);
    await expect(live.locator("body")).toHaveClass(/app-ready/, { timeout: 30000 });
    // app-ready precedes the legacy shell's delayed fade-in. A visible bounding
    // box alone can yield a completely blank reference crop.
    await live.bringToFront();
    await expect(live.locator("section.app")).toHaveCSS("opacity", "1");
    for (const page of [live, local]) await page.evaluate(() => document.fonts.ready);
    for (const selector of [
      "#transcriptTab",
      "#tocTab",
      ...(mission === "17" ? [] : ["#photoTab"]),
      "#searchBtn",
      "#shareBtn",
    ]) {
      expect(await face(local.locator(selector)), selector).toEqual(
        await face(live.locator(selector)),
      );
    }
    const liveRow = live.locator("#transcriptTab").locator("..").locator("..");
    if (mission !== "17") {
      expect(await local.locator(".airt-channels__list button").allTextContents()).toEqual(
        await live.locator("#thirtytrack-container button").allTextContents(),
      );
    }
    const captures: [string, Locator][] = [
      ["production-controls", liveRow],
      ["local-controls", local.locator(".airt-tabs-wrapper")],
      ...(mission === "17"
        ? []
        : [["production-app-tabs", live.locator("#photoTab").locator("..")] as [string, Locator]]),
      ["local-app-tabs", local.locator(".airt-right__tabs")],
      ...(mission === "17"
        ? []
        : [
            ["production-channels", live.locator("#thirtytrack-container")] as [string, Locator],
            ["local-channels", local.locator(".airt-channels__list")] as [string, Locator],
          ]),
    ];
    for (const [name, locator] of captures) {
      const path = info.outputPath(`${name}.png`);
      await locator.screenshot({ path, animations: "disabled" });
      await info.attach(name, { path, contentType: "image/png" });
    }
    await local.locator("#tocTab").hover();
    await live.locator("#tocTab").hover();
    await local.waitForTimeout(200);
    expect(await face(local.locator("#tocTab"))).toEqual(await face(live.locator("#tocTab")));
    await context.close();
  });
}
