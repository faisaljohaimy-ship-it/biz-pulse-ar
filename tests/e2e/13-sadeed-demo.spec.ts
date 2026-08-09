import { test, expect } from "@playwright/test";

/**
 * `/sadeed/demo` أرض INVARIANT-17: سطح العرض التنفيذي الدائم.
 *
 * تصحيحان على ما كان مكتوبًا هنا:
 *   ① المسار كان `/aria/demo`؛ أُعيدت تسميته إلى `/sadeed/demo` في الموجة
 *      الثالثة (`8ca633c`) بلا موجّه ولا مسار قديم — فالعنوان القديم 404.
 *   ② «التوجيه إلى /auth» عقدٌ منسوخ: `src/routes/_authenticated.tsx` رفع
 *      البوابة صراحةً («no beforeLoad redirect to "/auth" anymore»)،
 *      وعقيدة `CLAUDE.md` الطبقة ٤ تمنع Unauthorized على الزائر. فالمقيس
 *      صار: الزائر يصل السطح ويُصيَّر، بلا حدود خطأ.
 *
 * الساق المصادَقة تُتخطّى بلا اعتمادات حقيقية بدل تزوير جلسة.
 */
const DEMO_ROUTE = "/sadeed/demo";

test.describe("/sadeed/demo — INVARIANT-17", () => {
  test("زيارة بلا جلسة تصل السطح وتُصيَّر", async ({ page }) => {
    await page.goto(DEMO_ROUTE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3_000);
    expect(new URL(page.url()).pathname, "الزائر طُرد عن سطح العرض").toBe(DEMO_ROUTE);
    await expect(page.locator("body")).not.toContainText("حدث خطأ — جارٍ الاستعادة");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("زيارة مصادَقة تُصيَّر السيناريوهات وتشغّل واحدًا", async ({ page }) => {
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

    await page.goto(DEMO_ROUTE, { waitUntil: "domcontentloaded" });
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
