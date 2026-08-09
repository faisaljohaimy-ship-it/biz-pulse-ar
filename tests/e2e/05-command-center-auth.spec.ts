import { test, expect } from "@playwright/test";

/**
 * كان هذا الملف يقيس بوابةً على `/command-center`. **الاثنان زالا:**
 *
 *   ① المسار نفسه حُذف كليًّا (`chore: إزالة «مركز القيادة»`, 480aa92) —
 *      وهو اليوم صفحة 404، فالتوجيه الذي كان يُقاس صار يُقاس على العدم.
 *   ② والبوابة نفسها رُفعت بقرارٍ موثَّق في `src/routes/_authenticated.tsx`:
 *      «There is no beforeLoad redirect to "/auth" anymore» — التصفّح
 *      كضيف مفتوح عمدًا، والعقيدة في `CLAUDE.md` (الطبقة ٤) تقول صراحةً
 *      «لا Unauthorized للزائر أبدًا».
 *
 * فالمقيس هنا صار **العقد القائم** لا العقد المنسوخ: مسار تحت
 * `_authenticated` يُصيَّر للزائر بلا جدار ولا حدود خطأ. أمّا حماية
 * البيانات فمكانها الخادم — RLS و`requireSupabaseAuth` — وتقيسها
 * `11-security-gap-closure` و`12-article-26-rate-limit`.
 *
 * الساق المصادَقة تتطلّب E2E_TEST_EMAIL / E2E_TEST_PASSWORD، وتُتخطّى عند
 * غيابها بدل تزوير جلسة.
 */
const GUEST_ROUTE = "/exec";

test.describe("Authenticated layout — التصفّح كضيف", () => {
  test("زيارة بلا جلسة تُصيَّر ولا تُطرد إلى /auth", async ({ page }) => {
    await page.goto(GUEST_ROUTE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3_000);
    expect(new URL(page.url()).pathname, "الزائر طُرد إلى بوابة دخول").toBe(GUEST_ROUTE);
    await expect(page.locator("body")).not.toContainText("حدث خطأ — جارٍ الاستعادة");
  });

  test("زيارة مصادَقة تُصيَّر النطاقات", async ({ page }) => {
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
    await page.goto(GUEST_ROUTE, { waitUntil: "domcontentloaded" });

    // Route rendered without throwing to the error boundary.
    await expect(page.locator("body")).not.toContainText("حدث خطأ — جارٍ الاستعادة");
    expect(page.url()).toContain(GUEST_ROUTE);
  });
});
