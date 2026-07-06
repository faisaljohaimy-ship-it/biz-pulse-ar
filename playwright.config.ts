import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E — critical executive-demo paths only.
 * Not wired into the deploy pipeline; run on demand with `bun run test:e2e`.
 * Base URL defaults to the local dev server; override with PLAYWRIGHT_BASE_URL
 * to hit preview/published (e.g. https://neexios.com).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ar-SA",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile",  use: { ...devices["iPhone 13"] } },
  ],
});
