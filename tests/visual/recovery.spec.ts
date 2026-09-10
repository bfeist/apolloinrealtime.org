import { expect, test } from "@playwright/test";
import { secondsToTimeStr } from "../../src/shell/clock.js";

function silentWaveform(length = 1_000_000): Buffer {
  const buffer = Buffer.alloc(20 + length * 2);
  buffer.writeUInt32LE(1, 0);
  buffer.writeUInt32LE(1, 4);
  buffer.writeUInt32LE(8_000, 8);
  buffer.writeUInt32LE(512, 12);
  buffer.writeUInt32LE(length, 16);
  return buffer;
}

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
        const video = box("[data-testid=mission-monitor]");
        const tabs = box("[data-testid=text-controls]");
        const text = box("[data-testid=text-monitor]");
        const photo = box("[data-testid=right-panel]");
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

test("recovery A13 shared transport advances photography and both play controls agree", async ({
  page,
}) => {
  await page.goto("/13/?t=000:00:00");
  const get = page.locator("#missionElapsedTime");
  const mainPlay = page.locator("#playPauseBtn");
  const videoPlay = page.locator("#videoPlaybackBtn");
  const selectedPhoto = page.locator("#photoGallery [aria-current=true]");

  await expect(selectedPhoto).toHaveAttribute("id", "gallerytimeid0000000");
  await videoPlay.click();
  await expect(mainPlay).toHaveAttribute("aria-pressed", "true");
  await expect(videoPlay).toHaveAttribute("aria-pressed", "true");
  await expect(get).not.toHaveValue("000:00:00", { timeout: 3000 });
  await expect(selectedPhoto).toHaveAttribute("id", "gallerytimeid0000004", { timeout: 6000 });

  await mainPlay.click();
  await expect(mainPlay).toHaveAttribute("aria-pressed", "false");
  await expect(videoPlay).toHaveAttribute("aria-pressed", "false");
  const paused = await get.inputValue();
  await page.waitForTimeout(1100);
  await expect(get).toHaveValue(paused);
});

for (const mission of ["11", "13"]) {
  test(`recovery A${mission} native Mission Control`, async ({ page }) => {
    await page.goto(`/${mission}/?t=000:00:00&ch=14`);
    await expect(page.locator("[data-testid=mocr-room-image]")).toBeVisible();
    await expect(page.locator("[data-testid=mocr-timeline]")).toBeVisible();
    await page.locator("#btn-ch50").click();
    await expect(page.locator("[data-testid=mocr-channel-name]")).toHaveText("FLIGHT");
    await expect(page.locator("#btn-ch50")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-testid=mocr-audio]")).toHaveAttribute(
      "src",
      new RegExp(`media.apolloinrealtime.org/A${mission}/MOCR_audio/`),
    );
    await page.getByRole("button", { name: "ABOUT", exact: true }).click();
    await expect(page.locator("[data-testid=mocr-about]")).toContainText(
      mission === "11" ? "11,000 hours" : "7,200 hours",
    );
    await expect(page.locator("[data-testid=mocr-about-images] img")).toHaveCount(
      mission === "11" ? 5 : 6,
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
  await expect(
    page.getByRole("heading", { name: "Astromaterial Sample Information", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-testid=samples-collections] tr[role=button]")).toHaveCount(5);
  await page.getByRole("button", { name: "View Contingency Bag samples at 109:34:00" }).click();
  await expect(page.locator("#missionElapsedTime")).toHaveValue("109:34:00");
  await expect(page.locator("#samples-host")).toBeVisible();
  await page.getByRole("button", { name: "Photography", exact: true }).click();
  await expect(page.locator("#samples-host")).toBeHidden();
  await page.goto("/17/?t=110:08:50");
  await expect(page.locator("[data-testid=biometrics-row]").first()).toBeAttached();
  if (await page.locator("[data-overlay=dashboard]").isHidden())
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.locator("[data-overlay=dashboard]")).toBeVisible();
  await expect(page.locator("[data-testid=biometrics-row]").first()).toContainText("85 bpm");
  await page.goto("/11/?t=075:31:12");
  await expect(page.locator("#dashMissionDay")).toHaveText("4");
  await expect(page.locator("[data-overlay=dashboard]")).toBeVisible();
});

test("recovery selected photos link to each mission's highest-resolution image", async ({
  page,
}) => {
  const cases = [
    {
      url: "/11/?img=AS11-40-5874",
      expected: /\/A11\/images\/NASA_photos\/AS11-40-5874HR\.jpg$/,
    },
    {
      url: "/13/?img=AS13-62-8880",
      expected: /\/A13\/images\/lpi_mirror\/print\/AS13\/62\/8880\.jpg$/,
    },
    {
      url: "/17/?t=118:23:37",
      expected: /\/A17\/images\/flight\/4175\/AS17-134-20377\.jpg$/,
    },
  ];

  for (const photoCase of cases) {
    await page.goto(photoCase.url);
    const link = page.locator("[data-testid=selected-photo-link]");
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", photoCase.expected);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }

  await page.goto("/13/?img=AS13-62-8880");
  const link = page.locator("[data-testid=selected-photo-link]");
  const expectedUrl = await link.getAttribute("href");
  const popupPromise = page.waitForEvent("popup");
  await link.click();
  const popup = await popupPromise;
  expect(popup.url()).toBe(expectedUrl);
  await popup.close();
});

test("recovery historical photo caption markup is rendered safely", async ({ page }) => {
  await page.goto("/11/?t=001:06:59");
  const a11Caption = page.getByTestId("photo-caption");
  await expect(a11Caption).toContainText('writes, "We were listening');
  await expect(a11Caption).not.toContainText("&quot;");
  await expect(a11Caption.getByRole("link")).toHaveCount(2);
  await expect(a11Caption.getByRole("link", { name: "Morgan", exact: true })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );

  await page.goto("/13/?t=078:02:15");
  const a13Caption = page.getByTestId("photo-caption");
  await expect(a13Caption).not.toContainText("</a>");
  await expect(a13Caption.getByRole("link")).toHaveCount(2);
  await expect(
    a13Caption.getByRole("link", { name: "read about SIVB impacts on the Moon", exact: true }),
  ).toHaveAttribute("href", "http://lroc.sese.asu.edu/posts/364");
});

for (const mission of ["11", "13"]) {
  for (const width of [1440, 768, 390]) {
    test(`recovery MOCR screenshot A${mission} at ${String(width)}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 768 ? 1024 : 900 });
      const waveform = page.waitForResponse((r) => r.url().endsWith(".dat") && r.ok());
      await page.goto(`/${mission}/?t=000:00:00&ch=14`);
      await waveform;
      await expect(page.locator("[data-testid=mocr-room-image]")).toBeVisible();
      await expect(page.locator("[data-testid=mocr-utterance]").first()).toBeAttached({
        timeout: 20000,
      });
      await page.waitForTimeout(1000);
      await expect(page.locator("#mocrviz-host")).toHaveScreenshot(
        `mocr-a${mission}-${String(width)}.png`,
        { animations: "disabled" },
      );
    });
  }
}

test("recovery MOCR silent waveform retains the legacy blue baseline", async ({ page }) => {
  await page.route(/audiowaveform_512\/.*\.dat$/, async (route) => {
    await route.fulfill({
      body: silentWaveform(),
      contentType: "application/octet-stream",
    });
  });
  await page.goto("/13/?t=000:00:00&ch=14");
  const canvas = page.locator("[data-testid=mocr-timeline]");
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () =>
      canvas.evaluate((element) => {
        const timeline = element as HTMLCanvasElement;
        const context = timeline.getContext("2d");
        if (!context) return "";
        const scale = timeline.width / timeline.clientWidth;
        const x = Math.round((timeline.clientWidth / 2 - 50) * scale);
        // 48 activity rows × 5 px + 10 px gap + half of the 60 px waveform.
        const y = Math.round(280 * scale);
        return [...context.getImageData(x, y, 1, 1).data].join(",");
      }),
    )
    .toBe("124,183,224,255");
});

for (const mission of ["11", "13"]) {
  for (const width of [1440, 390]) {
    test(`recovery MOCR About screenshot A${mission} at ${String(width)}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${mission}/?t=000:00:00&ch=14`);
      await page.getByRole("button", { name: "ABOUT", exact: true }).click();
      const about = page.locator("[data-testid=mocr-about]");
      await expect(about.locator("img").first()).toBeVisible();
      await expect(about).toHaveScreenshot(`mocr-about-a${mission}-${String(width)}.png`, {
        animations: "disabled",
      });
    });
  }
}

test("recovery MOCR timeline previews channel and GET before seeking smoothly", async ({
  page,
}) => {
  await page.goto("/13/?t=055:54:53&ch=14");
  const canvas = page.locator("[data-testid=mocr-timeline]");
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "ABOUT", exact: true }).click();
  const about = page.locator("[data-testid=mocr-about]");
  await expect(about.locator("[data-testid=mocr-about-title]")).toHaveText(
    "About This Mission Control Audio",
  );
  await expect(about).toContainText("7,200 hours");
  await expect(about).toContainText("3,936,510 utterances");
  await expect(about.locator("[data-testid=mocr-about-images] img")).toHaveCount(6);
  await expect(page.locator(".mocrviz-transcript-note")).toHaveCount(0);
  await page.getByRole("button", { name: "SEARCH", exact: true }).click();
  const channelSearch = page.getByRole("searchbox", { name: "Search this channel transcript" });
  await expect(channelSearch).toBeVisible();
  await channelSearch.fill("Doesn't matter");
  await expect(page.locator("[data-testid=mocr-utterance]").first()).toContainText(
    "Doesn't matter",
  );
  await page.getByRole("button", { name: "TRANSCRIPT", exact: true }).click();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("MOCR timeline has no layout box");

  // Channel 21 is row 17 in the original sorted activity-channel order.
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + 17 * 5 + 2);
  await expect(canvas).toHaveAttribute("data-hover-channel", "21");
  await expect(canvas).toHaveAttribute("data-hover-get", "055:55:53");
  await expect(page.locator("#btn-ch21")).toHaveAttribute("data-hovered", "true");
  await expect(page.locator('[data-testid=mocr-console][data-channel-id="21"]')).toHaveAttribute(
    "data-hovered",
    "true",
  );
  await expect(page.locator("#missionElapsedTime")).toHaveValue("055:54:53");

  const initialFrame = Number(await canvas.getAttribute("data-current-seconds"));
  await page.locator("#playPauseBtn").click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-current-seconds")), { timeout: 700 })
    .toBeGreaterThan(initialFrame + 0.1);
  await page.locator("#playPauseBtn").click();

  const expectedSeek = secondsToTimeStr(
    Math.round(Number(await canvas.getAttribute("data-current-seconds")) + 60),
  );
  await page.mouse.click(box.x + box.width / 2 + 60, box.y + 17 * 5 + 2);
  await expect(page.locator("#missionElapsedTime")).toHaveValue(expectedSeek);
  await expect(page.locator("#btn-ch21")).toHaveAttribute("aria-pressed", "true");
});

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

const splashCopy = {
  "11": ["the first landing on the Moon", "11,000 hours of Mission Control audio"],
  "13": ["the third lunar landing attempt", "All Mission Control audio (7,200 hours)"],
  "17": ["last landing on the Moon", "302 hours of space-to-ground audio"],
} as const;

for (const mission of ["11", "13", "17"] as const) {
  test(`recovery A${mission} mission entry and deep-link bypass`, async ({ page }) => {
    await page.goto(`/${mission}/`);
    const splash = page.locator("[aria-labelledby=missionSplashTitle]");
    await expect(splash).toBeVisible();
    await expect(splash).toContainText(splashCopy[mission][0]);
    await expect(splash).toContainText(splashCopy[mission][1]);
    await expect(page.getByRole("button", { name: "T-Minus 1m", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Now", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "forum.apolloinrealtime.org" })).toHaveAttribute(
      "href",
      "https://forum.apolloinrealtime.org",
    );
    await page.getByRole("button", { name: "Instructions / Credits", exact: true }).click();
    await expect(page.locator("#aboutDialog h2").first()).toBeVisible();
    await page.getByRole("button", { name: "Close instructions and credits", exact: true }).click();
    // A17 opens help beneath the mission header and dismisses its splash.
    if (mission === "17") await page.locator("#playPauseBtn").click();
    else await page.getByRole("button", { name: "T-Minus 1m", exact: true }).click();
    await expect(splash).toBeHidden();
    await expect(page.locator("#playPauseBtn")).toHaveAttribute("aria-pressed", "true");

    await page.goto(`/${mission}/?t=000:00:00`);
    await expect(page.locator("[aria-labelledby=missionSplashTitle]")).toHaveCount(0);
    await expect(page.locator("#missionElapsedTime")).toHaveValue("000:00:00");
  });

  test(`recovery A${mission} mission entry remains usable on a phone`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${mission}/`);
    const splash = page.locator("[aria-labelledby=missionSplashTitle]");
    await expect(splash).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
    await page.getByRole("link", { name: "forum.apolloinrealtime.org" }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("link", { name: "forum.apolloinrealtime.org" })).toBeVisible();
    await page.getByRole("button", { name: "Now", exact: true }).click();
    await expect(splash).toBeHidden();
    await expect(page.locator("#playPauseBtn")).toHaveAttribute("aria-pressed", "true");
  });
}
