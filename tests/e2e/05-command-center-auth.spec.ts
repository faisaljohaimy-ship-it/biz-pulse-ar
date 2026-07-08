import { test, expect } from "@playwright/test";

/**
 * /command-center is under the _authenticated layout with an integration-managed
 * gate. Unauthenticated visits must redirect to /auth. The authenticated leg
 * requires E2E_TEST_EMAIL / E2E_TEST_PASSWORD; it is skipped when those are
 * not provided rather than faking a session.
 */
test.describe("Command Center — auth gate", () => {
  test("unauthenticated visit redirects to /auth", async ({ page }) => {
    await page.goto("/command-center", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/auth(\?|$)/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/auth/);
  });

  test("authenticated visit renders zones", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    if (!email || !password) {
      test.skip(true, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set");
      return;
    }

    await page.goto("/auth");
    await page
      .getByLabel(/بريد|Email/i)
      .first()
      .fill(email);
    await page
      .getByLabel(/كلمة|Password/i)
      .first()
      .fill(password);
    await page
      .getByRole("button", { name: /دخول|تسجيل|Sign in|Log in/i })
      .first()
      .click();

    await page.waitForURL((u) => !/\/auth/.test(u.pathname), { timeout: 15_000 });
    await page.goto("/command-center", { waitUntil: "domcontentloaded" });

    // Route rendered without throwing to the error boundary.
    await expect(page.locator("body")).not.toContainText("حدث خطأ — جارٍ الاستعادة");
    expect(page.url()).toContain("/command-center");
  });
});
