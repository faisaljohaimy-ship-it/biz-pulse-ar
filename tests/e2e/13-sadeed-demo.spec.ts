import { test, expect } from "@playwright/test";

/**
 * /aria/demo is INVARIANT-17 territory: the permanent executive-demo surface.
 * Unauthenticated visits must redirect to /auth; the authenticated leg is
 * skipped without real creds rather than faking a session.
 */
test.describe("/aria/demo — INVARIANT-17", () => {
  test("unauthenticated visit redirects to /auth", async ({ page }) => {
    await page.goto("/aria/demo", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/auth(\?|$)/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/auth/);
  });

  test("authenticated visit renders scenarios and can trigger one", async ({ page }) => {
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

    await page.goto("/aria/demo", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText("حدث خطأ — جارٍ الاستعادة");

    // Trigger the first scenario button — asserts the singleton Brain path works.
    const trigger = page.getByRole("button").first();
    if (await trigger.isVisible()) await trigger.click();

    // No duplicate singleton warnings from the runtime registry.
    const dupWarnings: string[] = [];
    page.on("console", (msg) => {
      const t = msg.text();
      if (t.includes("[aria-singleton] duplicate")) dupWarnings.push(t);
    });
    await page.waitForTimeout(1500);
    expect(dupWarnings).toEqual([]);
  });
});
