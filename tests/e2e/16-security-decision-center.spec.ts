import { test, expect, type Page } from "@playwright/test";

const writeAttempts = new WeakMap<Page, string[]>();

for (const theme of ["dark", "light"] as const) {
  test.describe(`Security decision center · safe local demonstration · ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      const writes: string[] = [];
      writeAttempts.set(page, writes);
      await page.route("**/*", (route) => {
        const request = route.request();
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
          writes.push(`${request.method()} ${request.url()}`);
          return route.abort();
        }
        return route.continue();
      });
      await page.addInitScript((theme) => {
        sessionStorage.setItem("theme", theme);
        sessionStorage.setItem("nexios-welcome", "complete:v4");
        localStorage.setItem("locale", "ar");
      }, theme);
      await page.goto("/sec/decision-center", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "مركز القرار الأمني الذكي", exact: true }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.getByRole("dialog", { name: "الرقم الوظيفي مطلوب" })).toHaveCount(0);
      expect(await page.evaluate(() => localStorage.getItem("sadeed-staff-number"))).toBeNull();
    });

    test("uses local controls through evidence, languages, both review outcomes and reset without writes", async ({
      page,
    }) => {
      const evidence = page.getByRole("button", { name: "سجل دخول افتراضي", exact: true });
      await evidence.click();
      await expect(evidence).toHaveAttribute("aria-expanded", "true");
      await expect(
        page.getByText("بطاقة غير صالحة في بيانات السيناريو فقط؛ يلزم التحقق من المصدر."),
      ).toBeVisible();
      await page.getByRole("button", { name: "ابدأ السيناريو", exact: true }).click();
      await expect(page.getByText("حرج · تصنيف تجريبي احترازي", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Switch to English", exact: true }).click();
      await expect(page.locator("div[lang='en']")).toHaveAttribute("dir", "ltr");
      await expect(
        page.getByText("Critical · precautionary demo rating", { exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "View recommendations", exact: true }).click();
      await page.getByRole("button", { name: "Continue to human review", exact: true }).click();
      const record = page.getByRole("button", { name: "Record review · simulation", exact: true });
      const verify = page.getByRole("button", {
        name: "Request verification · simulation",
        exact: true,
      });
      await expect(record).toBeDisabled();
      await expect(verify).toBeDisabled();
      await page.getByRole("checkbox").check();
      await record.click();
      await expect(page.getByText("Simulated review recorded", { exact: true })).toBeVisible();
      await expect(
        page.getByText(/Operational approval is still required\. No message was sent/),
      ).toBeVisible();
      await page.getByRole("button", { name: "Reset demo", exact: true }).click();
      await expect(page.getByText("The scenario has not started", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Start scenario", exact: true }).click();
      await page.getByRole("button", { name: "View recommendations", exact: true }).click();
      await page.getByRole("button", { name: "Continue to human review", exact: true }).click();
      await expect(record).toBeDisabled();
      await page.getByRole("checkbox").check();
      await verify.click();
      await expect(
        page.getByText("Simulated verification request recorded", { exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "التبديل إلى العربية", exact: true }).click();
      await expect(page.locator("div[lang='ar']")).toHaveAttribute("dir", "rtl");
      await expect(page.getByText("سُجّل طلب تحقق تجريبي", { exact: true })).toBeVisible();
      expect(writeAttempts.get(page)).toEqual([]);
    });

    test("keeps staff attribution on neighboring operational pages", async ({ page }) => {
      await page.goto("/sec/incidents", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("dialog", { name: "الرقم الوظيفي مطلوب" })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem("sadeed-staff-number"))).toBeNull();
    });

    test("fits certification widths in Arabic and English", async ({ page }) => {
      for (const width of [360, 390, 430, 768, 1280]) {
        await page.setViewportSize({ width, height: 950 });
        for (const lang of ["ar", "en"] as const) {
          if (lang === "en")
            await page.getByRole("button", { name: "Switch to English", exact: true }).click();
          await expect(page.locator(`div[lang='${lang}']`)).toHaveAttribute(
            "dir",
            lang === "ar" ? "rtl" : "ltr",
          );
          const dimensions = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            content: document.documentElement.scrollWidth,
          }));
          expect(
            dimensions.content,
            `${width}px ${lang} page must not overflow horizontally`,
          ).toBeLessThanOrEqual(dimensions.viewport + 1);
          const start = page.getByRole("button", {
            name: lang === "ar" ? "ابدأ السيناريو" : "Start scenario",
            exact: true,
          });
          await expect(start).toBeVisible();
          const box = await start.boundingBox();
          expect(box?.height).toBeGreaterThanOrEqual(44);
          const entry = page.getByRole("link", {
            name:
              lang === "ar" ? "مركز القرار الأمني الذكي" : "Intelligent Security Decision Center",
            exact: true,
          });
          const entryBox = await entry.boundingBox();
          expect(entryBox?.height).toBeGreaterThanOrEqual(44);
          await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
          if (width === 390 || width === 1280) {
            await page.screenshot({
              path: `.audit-tmp/security-decision-${theme}-${lang}-${width}.png`,
              fullPage: true,
            });
          }
          if (lang === "en")
            await page.getByRole("button", { name: "التبديل إلى العربية", exact: true }).click();
        }
      }
    });
  });
}
