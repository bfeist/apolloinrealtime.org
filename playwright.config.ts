import { defineConfig, devices } from "@playwright/test";

// Baseline capture targets production (apolloinrealtime.org).
// `visual` project runs against the local dev/preview server later.
const PROD_BASE = process.env["AIRT_PROD_BASE"] ?? "https://apolloinrealtime.org";
const LOCAL_BASE = process.env["AIRT_LOCAL_BASE"] ?? "http://localhost:5173";

// Auto-start the local Vite dev server for the `visual` project only.
// reuseExistingServer:true means if you already ran `npm run dev` it
// won't launch a second one. Set AIRT_NO_WEB_SERVER=1 to skip entirely.
const useWebServer = !process.env["AIRT_NO_WEB_SERVER"];

export default defineConfig({
  testDir: "tests/visual",
  ...(useWebServer && {
    webServer: {
      command: "npm run dev",
      url: LOCAL_BASE,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  }),
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    },
  },
  use: {
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "baseline",
      testMatch: /baseline\.spec\.ts$/,
      use: {
        baseURL: PROD_BASE,
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "visual",
      testMatch: /(?:visual|recovery|controls)\.spec\.ts$/,
      use: {
        baseURL: LOCAL_BASE,
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "controls-reference",
      testMatch: /controls-reference\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
