import { test, expect } from "@playwright/test";

/**
 * The SimulationRibbon is mounted globally at the _authenticated layout,
 * so every authenticated route inherits it. This test exercises a set of
 * screens that render client_* data. Skipped as a whole when test-user
 * credentials aren't available.
 */
const ROUTES = [
  "/command-center",
  "/urgent-ops",
  "/intelligence",
  "/exec",
  "/executive-map",
  "/executive-reports",
];

test.describe("Simulation ribbon — coverage", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    if (!email || !password) test.skip(true, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set");

    await page.goto("/auth");
    await page.getByLabel(/بريد|Email/i).first().fill(email!);
    await page.getByLabel(/كلمة|Password/i).first().fill(password!);
    await page.getByRole("button", { name: /دخول|تسجيل|Sign in|Log in/i }).first().click();
    await page.waitForURL((u) => !/\/auth/.test(u.pathname), { timeout: 15_000 });
  });

  for (const route of ROUTES) {
    test(`ribbon visible on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const ribbon = page.getByText(/بيئة محاكاة/);
      await expect(ribbon).toBeVisible({ timeout: 8_000 });
    });
  }
});
