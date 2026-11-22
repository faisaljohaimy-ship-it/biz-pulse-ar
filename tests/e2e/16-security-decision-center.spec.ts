import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const networkEvidence = new WeakMap<Page, { writes: string[]; mockedHealth: string[] }>();
const scenarios = [
  {
    id: "access",
    reference: "SADEED-DEMO-ACCESS-001",
    minutes: 15,
    ar: {
      event: "محاولة دخول غير مصرح بها إلى محطة كهربائية (سيناريو افتراضي)",
      owner: "مشرف الأمن المناوب · دور افتراضي",
      evidence: "سجل دخول افتراضي",
    },
    en: {
      event: "Unauthorized access attempt at an electrical substation (fictional scenario)",
      owner: "Duty security supervisor · fictional role",
      evidence: "Synthetic access log",
    },
  },
  {
    id: "camera",
    reference: "SADEED-DEMO-CAMERA-002",
    minutes: 30,
    ar: {
      event: "انقطاع كاميرا في نقطة دخول افتراضية (سيناريو افتراضي)",
      owner: "مشرف أنظمة المراقبة · دور افتراضي",
      evidence: "إشارة انقطاع افتراضية",
    },
    en: {
      event: "Camera unavailable at a fictional entry point (fictional scenario)",
      owner: "Surveillance supervisor · fictional role",
      evidence: "Synthetic outage signal",
    },
  },
  {
    id: "patrol",
    reference: "SADEED-DEMO-PATROL-003",
    minutes: 20,
    ar: {
      event: "تأخر نقطة تحقق لدورية افتراضية (سيناريو افتراضي)",
      owner: "مشرف الدوريات · دور افتراضي",
      evidence: "سجل نقطة افتراضي غير مكتمل",
    },
    en: {
      event: "Missed checkpoint for a fictional patrol (fictional scenario)",
      owner: "Patrol supervisor · fictional role",
      evidence: "Incomplete synthetic checkpoint record",
    },
  },
] as const;
type Scenario = (typeof scenarios)[number];
type Locale = "ar" | "en";

async function setLocale(page: Page, locale: Locale) {
  if ((await page.locator("html").getAttribute("lang")) !== locale) {
    await page
      .getByRole("button", {
        name: locale === "en" ? "Switch to English" : "التبديل إلى العربية",
        exact: true,
      })
      .click();
  }
  await expect(page.locator(`div[lang='${locale}']`)).toHaveAttribute(
    "dir",
    locale === "ar" ? "rtl" : "ltr",
  );
}

function exportButton(page: Page, locale: Locale) {
  return page.getByRole("button", {
    name: locale === "ar" ? "تصدير التقرير · محاكاة" : "Export report · simulation",
    exact: true,
  });
}

async function inspectDownloadedReport(
  page: Page,
  scenario: Scenario,
  locale: Locale,
  theme: string,
) {
  const downloadPromise = page.waitForEvent("download");
  await exportButton(page, locale).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`${scenario.reference}-${locale}.html`);
  const path = `.audit-tmp/executive-reports/${theme}-${scenario.id}-${locale}.html`;
  await download.saveAs(path);
  const html = await readFile(path, "utf8");
  expect(html.length).toBeGreaterThan(2500);
  expect(html).toContain(`${scenario.reference} · demo_fixture · simulated=true`);
  // Inspect the real exported artifact before rendering it. These guards also
  // prove they reject deliberately injected active markup and network assets.
  const activeMarkup = /<\s*(?:script|iframe|object|embed|base)\b|\bon[a-z]+\s*=|javascript\s*:/i;
  const networkAsset = /\b(?:src|href)\s*=\s*["']\s*(?:https?:|\/\/)|@import\b|url\s*\(/i;
  expect(activeMarkup.test(html)).toBe(false);
  expect(networkAsset.test(html)).toBe(false);
  expect(
    activeMarkup.test(
      html.replace("</body>", '<svg onload="window.__reportXss=true"></svg></body>'),
    ),
  ).toBe(true);
  expect(
    networkAsset.test(
      html.replace(
        "</head>",
        '<link rel="stylesheet" href="https://example.invalid/report.css"></head>',
      ),
    ),
  ).toBe(true);

  const artifact = await page.context().newPage();
  const assetRequests: string[] = [];
  await artifact.route("**/*", (route) => {
    assetRequests.push(route.request().url());
    return route.abort();
  });
  try {
    await artifact.setContent(html, { waitUntil: "domcontentloaded" });
    await expect(artifact.locator("html")).toHaveAttribute("lang", locale);
    await expect(artifact.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(artifact.getByRole("heading", { level: 1 })).toHaveText(
      locale === "ar" ? "تقرير سديد التنفيذي" : "SADEED executive report",
    );
    await expect(
      artifact.getByText(
        locale === "ar"
          ? "محاكاة افتراضية بالكامل · ليس سجل تدقيق تشغيليًا"
          : "Entirely synthetic simulation · not an operational audit record",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(artifact.getByText(scenario[locale].owner, { exact: false })).toBeVisible();
    await expect(artifact.getByText(scenario[locale].event, { exact: false })).toBeVisible();
    await expect(
      artifact.getByRole("heading", {
        name: locale === "ar" ? "التوصيات والبدائل" : "Recommendations and alternatives",
        exact: true,
      }),
    ).toBeVisible();
    const body = await artifact.locator("body").innerText();
    expect(body).toContain(
      locale === "ar" ? "الاعتماد التشغيلي غير ممنوح" : "Operational approval not granted",
    );
    expect(body).toContain(locale === "ar" ? "إجراءات منفذة: 0" : "Executed actions: 0");
    expect(body).toContain(
      locale === "ar"
        ? `${scenario.minutes} دقيقة من بدء المحاكاة`
        : `${scenario.minutes} minutes from simulation start`,
    );
    expect(body).toContain(
      locale === "ar"
        ? "زمن الاستجابة والعائد التشغيلي لم يُقاسا"
        : "Response-time improvement and operational ROI have not been measured",
    );
    expect(body).toContain(
      scenario.id === "patrol"
        ? locale === "ar"
          ? "طلب تحقق في المحاكاة"
          : "Simulated verification requested"
        : locale === "ar"
          ? "مراجعة محاكاة مكتملة"
          : "Simulated review completed",
    );
    const listItems = artifact.locator("li");
    expect(await listItems.count()).toBeGreaterThan(4);
    await expect(artifact.locator("script,iframe,object,embed,base,link,img,form")).toHaveCount(0);
    expect(assetRequests).toEqual([]);
    if (scenario.id === "patrol") {
      await artifact.screenshot({
        path: `.audit-tmp/executive-reports/${theme}-${locale}-report.png`,
        fullPage: true,
      });
    }
  } finally {
    await artifact.close();
  }
}

for (const theme of ["dark", "light"] as const) {
  test.describe(`Security decision center · safe local demonstration · ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      const evidence = { writes: [] as string[], mockedHealth: [] as string[] };
      networkEvidence.set(page, evidence);
      await page.route("**/*", (route) => {
        const request = route.request();
        const pathname = new URL(request.url()).pathname.replace(/\/$/, "");
        // These GET probes increment database rate counters. Mock them before
        // navigation in every environment; HTTP method alone is not read-only.
        if (pathname === "/api/chat/health" || pathname === "/api/public/health") {
          evidence.mockedHealth.push(pathname);
          return route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              mocked: true,
              provider: "none",
              key_present: false,
              gate: "closed",
              status: "unknown",
              subsystems: {},
            }),
          });
        }
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
          evidence.writes.push(`${request.method()} ${request.url()}`);
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

    test("reviews all synthetic scenarios, resets state and downloads standalone reports in both languages without writes", async ({
      page,
    }) => {
      test.setTimeout(180_000);
      for (const scenario of scenarios) {
        await setLocale(page, "ar");
        await page
          .getByRole("combobox", { name: "اختر سيناريو العرض", exact: true })
          .selectOption(scenario.id);
        await expect(page.getByText("لم يبدأ السيناريو بعد", { exact: true })).toBeVisible();
        await expect(
          page.getByRole("heading", { name: scenario.ar.event, exact: true }),
        ).toBeVisible();
        await expect(page.getByText(scenario.ar.owner, { exact: true })).toBeVisible();
        await expect(
          page.getByText(`${scenario.minutes} دقيقة · ليست مهلة تشغيلية`, { exact: true }),
        ).toBeVisible();
        await expect(exportButton(page, "ar")).toBeDisabled();
        const evidence = page.getByRole("button", { name: scenario.ar.evidence, exact: true });
        await expect(evidence).toHaveAttribute("aria-expanded", "false");
        await evidence.click();
        await expect(evidence).toHaveAttribute("aria-expanded", "true");
        await page.getByRole("button", { name: "ابدأ السيناريو", exact: true }).click();
        await expect(
          page.getByText(
            scenario.id === "access"
              ? "حرج · تصنيف تجريبي احترازي"
              : "مرتفع · تصنيف تجريبي احترازي",
            { exact: true },
          ),
        ).toBeVisible();
        await page.getByRole("button", { name: "استعرض التوصيات", exact: true }).click();
        await expect(
          page.getByRole("heading", { name: "بدائل القرار ومفاضلاتها", exact: true }),
        ).toBeVisible();
        await expect(page.getByText("التحقق قبل التصعيد", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "انتقل للمراجعة البشرية", exact: true }).click();
        await expect(page.getByRole("checkbox")).not.toBeChecked();
        const review = page.getByRole("button", {
          name: scenario.id === "patrol" ? "طلب تحقق إضافي · محاكاة" : "تسجيل المراجعة · محاكاة",
          exact: true,
        });
        await expect(review).toBeDisabled();
        await expect(exportButton(page, "ar")).toBeDisabled();
        await page.getByRole("checkbox").check();
        await review.click();
        await expect(exportButton(page, "ar")).toBeEnabled();
        await inspectDownloadedReport(page, scenario, "ar", theme);
        await setLocale(page, "en");
        await expect(
          page.getByRole("heading", { name: scenario.en.event, exact: true }),
        ).toBeVisible();
        await expect(page.getByText(scenario.en.owner, { exact: true })).toBeVisible();
        await expect(exportButton(page, "en")).toBeEnabled();
        await inspectDownloadedReport(page, scenario, "en", theme);
      }
      await page.getByRole("button", { name: "Reset demo", exact: true }).click();
      await expect(
        page.getByRole("combobox", { name: "Choose a demo scenario", exact: true }),
      ).toHaveValue("patrol");
      await expect(page.getByText("The scenario has not started", { exact: true })).toBeVisible();
      await expect(exportButton(page, "en")).toBeDisabled();
      await expect(page.getByText(/Report prepared locally without sending data/)).toHaveCount(0);
      await page.getByRole("button", { name: "Start scenario", exact: true }).click();
      await page.getByRole("button", { name: "View recommendations", exact: true }).click();
      await page.getByRole("button", { name: "Continue to human review", exact: true }).click();
      await expect(page.getByRole("checkbox")).not.toBeChecked();
      await expect(
        page.getByRole("button", { name: "Record review · simulation", exact: true }),
      ).toBeDisabled();
      expect(networkEvidence.get(page)?.writes).toEqual([]);
    });

    test("keeps staff attribution on neighboring operational pages", async ({ page }) => {
      await page.goto("/sec/incidents", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("dialog", { name: "الرقم الوظيفي مطلوب" })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem("sadeed-staff-number"))).toBeNull();
    });

    test("fits all three scenarios at certification widths in Arabic and English", async ({
      page,
    }) => {
      test.setTimeout(180_000);
      for (const width of [360, 390, 430, 768, 1280]) {
        await page.setViewportSize({ width, height: 950 });
        for (const lang of ["ar", "en"] as const) {
          await setLocale(page, lang);
          for (const scenario of scenarios) {
            const select = page.getByRole("combobox", {
              name: lang === "ar" ? "اختر سيناريو العرض" : "Choose a demo scenario",
              exact: true,
            });
            await select.selectOption(scenario.id);
            await expect(
              page.getByRole("heading", { name: scenario[lang].event, exact: true }),
            ).toBeVisible();
            const dimensions = await page.evaluate(() => ({
              viewport: document.documentElement.clientWidth,
              content: document.documentElement.scrollWidth,
            }));
            expect(
              dimensions.content,
              `${scenario.id} ${width}px ${lang} must not overflow`,
            ).toBeLessThanOrEqual(dimensions.viewport + 1);
            const controls = [
              select,
              exportButton(page, lang),
              page.getByRole("button", {
                name: lang === "ar" ? "ابدأ السيناريو" : "Start scenario",
                exact: true,
              }),
              page.getByRole("link", {
                name:
                  lang === "ar"
                    ? "مركز القرار الأمني الذكي"
                    : "Intelligent Security Decision Center",
                exact: true,
              }),
            ];
            for (const control of controls) {
              await expect(control).toBeVisible();
              expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
            }
            await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
            if (width === 390 || width === 1280) {
              await page.evaluate(() => window.scrollTo(0, 0));
              await page.screenshot({
                path: `.audit-tmp/enterprise-${theme}-${lang}-${scenario.id}-${width}.png`,
                fullPage: true,
              });
            }
          }
        }
      }
      expect(networkEvidence.get(page)?.writes).toEqual([]);
    });
  });
}
