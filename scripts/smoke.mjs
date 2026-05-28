import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://localhost:5173/13/";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
const warnings = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
  else if (m.type() === "warning") warnings.push(m.text());
});
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("requestfailed", (r) => {
  // Ignore expected misses (e.g. CDN media not yet routed).
  errors.push("REQFAIL: " + r.url() + " - " + (r.failure()?.errorText ?? ""));
});
try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
} catch (e) {
  console.error("NAV ERROR:", e.message);
}
await page.waitForTimeout(3000);
console.log("URL:    ", page.url());
console.log("TITLE:  ", await page.title());
console.log("ERRORS (" + errors.length + "):");
errors.forEach((e) => console.log("  - " + e));
console.log("WARNINGS:", warnings.length);
await browser.close();
