import { test, expect } from "@playwright/test";

/**
 * Genesis cinematic intro should mount once per browser session. The app
 * marks it seen via sessionStorage; a second visit in the same context
 * must not re-trigger the intro.
 */
/**
 * **معطَّل: لا سطح يُختبر.** المقدّمة السينمائية أُزيلت بأمر المالك ٢٠٢٦/٠٨/٢٨ (‏a42c89d02
 * «revert(intro)»)، فهذا الملف يُسقط كل تشغيلٍ شامل على ميزةٍ غير موجودة (اكتُشف ٢٠٢٦/١٠/١٨ قبل
 * أول تشغيل لـweekly-regression.yml). لا يُحذف: وثيقتا الحوكمة
 * `docs/SADEED_INTRO_CONSTITUTION.md` و`docs/SADEED_ENGINEERING_CONSTITUTION.md` تسمّيانه،
 * وتحديثهما قرار المالك. يعود بإزالة `.skip` إن عادت المقدّمة.
 */
test.describe.skip("Genesis intro — once per session", () => {
  test("first visit shows intro, second visit skips it", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // The intro exposes a skip control; look for common Arabic labels.
    const skip = page.getByRole("button", { name: /تخطي|تجاوز|Skip/i }).first();

    // Intro is not guaranteed on every viewport; if visible, skip it.
    if (await skip.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await skip.click();
    }

    await page.waitForTimeout(800);

    // Read the canonical session flag set only after the intro is completed.
    const flag = await page.evaluate(() => {
      return sessionStorage.getItem("nexios-welcome");
    });
    expect(flag, "expected the intro completion flag in sessionStorage").toBe("complete:v4");

    // Second navigation in the same session must not re-mount the intro.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const skipStill = page.getByRole("button", { name: /تخطي|تجاوز|Skip/i }).first();
    await expect(skipStill).toBeHidden({ timeout: 3_000 });
  });
});
