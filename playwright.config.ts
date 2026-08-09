import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E — critical executive-demo paths only.
 * The security subset is wired into CI; run the full suite with `npm run test:e2e`.
 * Base URL defaults to the local dev server; override with PLAYWRIGHT_BASE_URL
 * to hit preview/published (e.g. https://neexios.com).
 *
 *   npx vite dev --port 8085 --host 127.0.0.1
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:8085 npx playwright test --project=desktop
 *
 * **مشروع `mobile` يحتاج webkit.** `devices["iPhone 13"]` محرّكه webkit، وما
 * على القرص في حاويات العمل كروميوم وحده — فيسقط المشروع كلّه بـ
 * «Executable doesn't exist at …/webkit-‹بناء›/pw_run.sh» قبل فتح صفحة واحدة.
 * وهو فشل **تركيب** لا فشل منتج: لا يُقرأ ارتدادًا، ولا يُداوى بتبديل
 * المحرّك إلى كروميوم — ذاك يمحو تغطية سفاري بصمت ويُبقي التقرير أخضر.
 * الدواء تركيب webkit، أو حصر التشغيل بـ`--project=desktop`.
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
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
