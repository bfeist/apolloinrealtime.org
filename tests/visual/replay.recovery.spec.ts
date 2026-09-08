import { expect, test } from "@playwright/test";

for (const [mission, startIso, firstGet, nextGet, replayEndIso, finalGet, repeatedGet] of [
  [
    "11",
    "2026-07-15T16:45:52Z",
    "-20:46:08",
    "-20:46:07",
    "2026-07-14T19:40:31Z",
    "198:08:30",
    "174:08:31",
  ],
  [
    "13",
    "2026-04-10T07:55:32Z",
    "-35:17:28",
    "-35:17:27",
    "2026-04-10T03:13:00Z",
    "151:59:59",
    "128:00:00",
  ],
  [
    "17",
    "2026-12-07T02:55:38Z",
    "-02:37:22",
    "-02:37:21",
    "2026-12-06T20:42:40Z",
    "305:49:39",
    "281:49:40",
  ],
] as const) {
  test(`A${mission} running Now resets at anniversary start and respects manual playback`, async ({
    page,
  }) => {
    const before = Date.parse(startIso) - 1000;
    await page.clock.install({ time: before });
    await page.clock.pauseAt(before);
    await page.goto(`/${mission}/`);
    await expect(page.locator("[data-historical-time]")).toHaveText(
      `${new Date(before).toISOString().slice(11, 19)} UTC`,
    );
    await page.locator('[data-enter="now"]').click();
    const get = page.locator("#missionElapsedTime");
    const sync = page.locator("#realtimeBtn");
    await expect(sync).toHaveAttribute("aria-pressed", "true");
    await expect(get).not.toHaveValue(firstGet);
    await page.clock.runFor(1000);
    await expect(get).toHaveValue(firstGet);
    await expect(page.locator("#playPauseBtn")).toHaveText("Pause");
    await page.clock.runFor(1000);
    await expect(get).toHaveValue(nextGet);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(sync).toHaveAttribute("aria-pressed", "false");
    await page.clock.runFor(2000);
    await expect(get).toHaveValue(nextGet);
    await sync.click();
    await get.fill("001:00:00");
    await page.getByRole("button", { name: "GO", exact: true }).click();
    await expect(sync).toHaveAttribute("aria-pressed", "false");
    await page.clock.runFor(1000);
    await expect(get).toHaveValue("001:00:01");
    await sync.click();
    await expect(sync).toHaveAttribute("aria-pressed", "true");
    await expect(get).not.toHaveValue("001:00:01");
  });

  test(`A${mission} realtime link preserves UTC and repeats the last day without stopping`, async ({
    page,
  }) => {
    const before = Date.parse(replayEndIso) - 1000;
    await page.clock.install({ time: before });
    await page.clock.pauseAt(before);
    await page.goto(`/${mission}/?t=rt`);
    await expect(page.locator("#missionElapsedTime")).toHaveValue(finalGet);
    await expect(page.locator("#historicalTime")).toHaveText(
      `${new Date(before).toISOString().slice(11, 19)} UTC`,
    );
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.clock.runFor(1000);
    await expect(page.locator("#missionElapsedTime")).toHaveValue(repeatedGet);
    await expect(page.locator("#historicalTime")).toHaveText(
      `${new Date(before + 1000).toISOString().slice(11, 19)} UTC`,
    );
    await expect(page.locator("#playPauseBtn")).toHaveText("Pause");
    await expect(page.locator("#realtimeBtn")).toHaveAttribute("aria-pressed", "true");
  });
}

test("A17 historical GET reset preserves continuous UTC and the recording offset", async ({
  page,
}) => {
  // Observe integration offsets without relying on third-party streaming availability.
  await page.route("https://www.youtube.com/iframe_api", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.YT = {
      PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
      Player: class {
        constructor(id, options) {
          this.state = -1; this.offset = 0;
          Promise.resolve().then(() => options.events.onReady({ target: this }));
        }
        cueVideoById(id, offset) { this.state = 5; this.record(offset); }
        loadVideoById(id, offset) { this.state = 1; this.record(offset); }
        seekTo(offset) { this.record(offset); }
        record(offset) { this.offset = offset; document.body.dataset.videoOffset = String(offset); }
        getCurrentTime() { return this.offset; }
        getPlayerState() { return this.state; }
        playVideo() { this.state = 1; }
        pauseVideo() { this.state = 2; }
        mute() {} unMute() {} destroy() {}
      }
    }; window.onYouTubeIframeAPIReady();`,
    }),
  );
  const now = Date.parse("2026-12-09T22:32:59Z");
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.goto("/17/?t=rt");
  await expect(page.locator("#missionElapsedTime")).toHaveValue("064:59:59");
  // Flush query notifications while the mission itself remains paused.
  await expect
    .poll(async () => {
      await page.clock.runFor(10);
      return page.locator("body").getAttribute("data-video-offset");
    })
    .toBe("3599");
  await page.clock.setSystemTime(now);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.clock.runFor(1100);
  await expect(page.locator("#missionElapsedTime")).toHaveValue("067:40:00");
  await expect(page.locator("#historicalTime")).toHaveText("22:33:00 UTC");
  await page.locator("#missionElapsedTime").fill("067:40:10");
  await page.getByRole("button", { name: "GO", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-video-offset", "3610");
});
