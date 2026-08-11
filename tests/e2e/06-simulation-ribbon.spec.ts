import { test, expect } from "@playwright/test";

/**
 * **انقلب هذا الملفّ ٢٠٢٦/٠٨/١١ بأمر المالك: حُذف شريط المحاكاة من النظام.**
 *
 * كان يؤكّد **ظهور** الشريط على كل مسار مصادَق (كان مركَّبًا في تخطيط
 * `_authenticated`). وقد رُفع الشريط ومعه كل شارة محاكاة على الشاشة، فصار
 * التأكيد القديم يحرس ما أُمر بحذفه.
 *
 * ولم يُحذف الملفّ: قُلب ليحرس **الحذف** نفسه. فالشريط كان مركَّبًا في
 * التخطيط لا في الصفحات، وإعادته سطرٌ واحد في ملفٍّ واحد يعيده إلى عشرات
 * الشاشات دفعةً واحدة — وهو بالضبط نوع الارتداد الذي لا يلاحظه أحد.
 *
 * ويبقى مُتخطًّى كلّه حين لا تتوفّر اعتمادات مستخدم الاختبار.
 */
/**
 * مساران من هذه القائمة لم يعودا موجودين: `/command-center` حُذف كليًّا
 * (480aa92) و`/intelligence` لا مقابل له في شجرة المسيّر. ومسارٌ غير موجود
 * يُصيَّر صفحة 404 — والشريط غائب عنها بحقّ، فيُقرأ الفشل عطلًا في الشريط
 * وهو عطلٌ في القائمة. أُبدلا بسطحين قائمين يقرآن `client_*`:
 * `/situation-room` و`/fabric`.
 */
const ROUTES = [
  "/situation-room",
  "/urgent-ops",
  "/fabric",
  "/exec",
  "/executive-map",
  "/executive-reports",
];

test.describe("Simulation ribbon — stays removed", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    if (!email || !password) test.skip(true, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set");

    await page.goto("/auth");
    await page
      .getByLabel(/بريد|Email/i)
      .first()
      .fill(email!);
    await page
      .getByLabel(/كلمة|Password/i)
      .first()
      .fill(password!);
    await page
      .getByRole("button", { name: /دخول|تسجيل|Sign in|Log in/i })
      .first()
      .click();
    await page.waitForURL((u) => !/\/auth/.test(u.pathname), { timeout: 15_000 });
  });

  for (const route of ROUTES) {
    test(`no simulation ribbon on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      // تُنتظر الشاشة حتى تستقرّ قبل الحكم بالغياب: تأكيدُ عدمٍ على صفحةٍ لم
      // تُصيَّر بعد يمرّ دائمًا ولا يُثبت شيئًا.
      await expect(page.locator("main, [role='main']").first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/بيئة محاكاة/)).toHaveCount(0);
    });
  }
});
