import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  fixtureOnly,
  fixturePolicyFromEnvironment,
  installFixtureBrowserGuard,
} from "./support/fixture-network.mjs";

if (fixtureOnly) test.use({ serviceWorkers: "block" });

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
    await expect(
      artifact.locator("dl").getByText(scenario[locale].owner, { exact: false }),
    ).toBeVisible();
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
      locale === "ar" ? "تحسن الزمن والعائد غير مقيسين" : "Time savings and ROI are unmeasured",
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
    test.beforeEach(async ({ page, baseURL }) => {
      test.setTimeout(180_000);
      const evidence = { writes: [] as string[], mockedHealth: [] as string[] };
      networkEvidence.set(page, evidence);
      const fixturePolicy = fixturePolicyFromEnvironment(baseURL);
      await installFixtureBrowserGuard(page.context(), fixturePolicy);
      // iOS may offer Add to Home Screen after the user has started a review.
      // Close the optional prompt through its real accessible control whenever
      // it appears, so the tested workflow stays the same as a user's flow.
      const installPrompt = page.getByRole("region", { name: "تثبيت التطبيق", exact: true });
      await page.addLocatorHandler(installPrompt, async () => {
        await installPrompt.getByRole("button", { name: "إغلاق", exact: true }).click();
        await expect(installPrompt).toHaveCount(0);
      });
      await page.route("**/*", (route) => {
        const request = route.request();
        if (fixturePolicy && !fixturePolicy.allows(request.url())) {
          return route.abort("blockedbyclient");
        }
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
        // A page route's continue() bypasses context guards. In fixture mode,
        // fall through so the context checks the actual response for redirects.
        return fixtureOnly ? route.fallback() : route.continue();
      });
      await page.addInitScript((theme) => {
        sessionStorage.setItem("theme", theme);
        sessionStorage.setItem("nexios-welcome", "complete:v4");
        localStorage.setItem("locale", "ar");
      }, theme);
      await page.goto("/sec/decision-center", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "مركز القرار الأمني الذكي", exact: true }),
      ).toBeVisible({ timeout: 60_000 });
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

    test("keeps What-if changes isolated, traces context, invalidates old review and exports the same assumptions", async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await setLocale(page, "en");
      const cameraNode = page.getByRole("button", { name: "3. Assumed camera", exact: true });
      await cameraNode.focus();
      await cameraNode.press("Enter");
      await expect(cameraNode).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.getByText("Dependency trace: Assumed connectivity", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(/^Selected entity evidence: demo-access-log · demo-camera-reference/),
      ).toBeVisible();
      await page.getByRole("button", { name: "Start scenario", exact: true }).click();
      await page.getByRole("button", { name: "View recommendations", exact: true }).click();
      await page.getByRole("button", { name: "Continue to human review", exact: true }).click();
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Record review · simulation", exact: true }).click();
      await expect(exportButton(page, "en")).toBeEnabled();
      await page.getByRole("button", { name: "Camera available", exact: true }).click();
      await expect(exportButton(page, "en")).toBeDisabled();
      await expect(page.getByText("The scenario has not started", { exact: true })).toBeVisible();
      await expect(cameraNode).toHaveAttribute("aria-pressed", "true");
      const patrol = page.getByRole("slider", { name: "Patrol count", exact: true });
      await patrol.focus();
      await patrol.press("Home");
      await expect(patrol).toHaveValue("0");
      const response = page.getByRole("slider", { name: "Verification time (min)", exact: true });
      await response.focus();
      await response.press("End");
      await expect(response).toHaveValue("120");
      await page.getByRole("button", { name: "Route open", exact: true }).click();
      await page.getByRole("button", { name: "Connectivity available", exact: true }).click();
      await expect(page.getByText("Baseline: Low · Proposed: High", { exact: true })).toBeVisible();
      await page.getByText("visibility-gap · Visibility-gap hypothesis", { exact: true }).click();
      await expect(page.getByText(/Assumed visibility gaps.*causation is unproven/)).toBeVisible();
      await expect(
        page
          .locator("details")
          .filter({
            has: page.getByText("visibility-gap · Visibility-gap hypothesis", { exact: true }),
          })
          .getByText(/Verification needed: Actual barriers.*unverified/),
      ).toBeVisible();
      await page.getByText("Unknowns & measurement plan", { exact: true }).click();
      await expect(
        page.getByText("Event and barriers are unverified; event severity is unchanged", {
          exact: true,
        }),
      ).toBeVisible();
      await setLocale(page, "ar");
      await expect(page.getByRole("slider", { name: "عدد الدوريات", exact: true })).toHaveValue(
        "0",
      );
      await expect(
        page.getByRole("slider", { name: "زمن التحقق (دقيقة)", exact: true }),
      ).toHaveValue("120");
      await expect(
        page.getByRole("button", { name: "3. الكاميرا المفترضة", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 950 });
        for (const lang of ["ar", "en"] as const) {
          await setLocale(page, lang);
          const bounds = await page.evaluate(() => ({
            content: document.documentElement.scrollWidth,
            viewport: document.documentElement.clientWidth,
          }));
          expect(
            bounds.content,
            `Changed assumptions ${width}px ${lang} must fit`,
          ).toBeLessThanOrEqual(bounds.viewport + 1);
          await page.screenshot({
            path: `.audit-tmp/omega-${theme}-changed-app-${lang}-${width}.png`,
            fullPage: true,
          });
          await page
            .getByRole("region", {
              name: lang === "ar" ? "مختبر السياق والافتراضات" : "Context & assumptions lab",
              exact: true,
            })
            .screenshot({ path: `.audit-tmp/omega-${theme}-changed-lab-${lang}-${width}.png` });
        }
      }
      await setLocale(page, "en");
      await page.getByRole("button", { name: "Start scenario", exact: true }).click();
      await expect(
        page.getByText("Critical · precautionary demo rating", { exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "View recommendations", exact: true }).click();
      await page.getByRole("button", { name: "Continue to human review", exact: true }).click();
      await expect(page.getByRole("checkbox")).not.toBeChecked();
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Record review · simulation", exact: true }).click();
      for (const locale of ["en", "ar"] as const) {
        await setLocale(page, locale);
        const downloadEvent = page.waitForEvent("download");
        await exportButton(page, locale).click();
        const download = await downloadEvent;
        const path = `.audit-tmp/omega-${theme}-changed-${locale}.html`;
        await download.saveAs(path);
        const html = await readFile(path, "utf8");
        expect(html).toContain("omega-policy-v1");
        expect(html).toContain("SADEED-DEMO-ACCESS-001");
        expect(html).not.toMatch(
          /<\s*(?:script|iframe|object|embed|base)\b|\bon[a-z]+\s*=|javascript\s*:|\b(?:src|href)\s*=\s*["']\s*(?:https?:|\/\/)|@import\b|url\s*\(/i,
        );
        const artifact = await page.context().newPage();
        const externalAssets: string[] = [];
        await artifact.route("**/*", (route) => {
          externalAssets.push(route.request().url());
          return route.abort();
        });
        try {
          await artifact.setContent(html);
          await expect(artifact.locator("html")).toHaveAttribute("lang", locale);
          await expect(artifact.locator("html")).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          const yes = locale === "ar" ? "نعم" : "Yes";
          const no = locale === "ar" ? "لا" : "No";
          const assumptions = [
            [locale === "ar" ? "توفر الكاميرا" : "Camera available", yes, no],
            [locale === "ar" ? "عدد الدوريات" : "Patrol count", "2", "0"],
            [locale === "ar" ? "زمن التحقق (دقيقة)" : "Verification time (min)", "15", "120"],
            [locale === "ar" ? "المسار مفتوح" : "Route open", yes, no],
            [locale === "ar" ? "توفر الاتصال" : "Connectivity available", yes, no],
          ];
          for (const [name, baseline, proposed] of assumptions) {
            await expect(
              artifact
                .getByRole("row")
                .filter({ has: artifact.getByRole("rowheader", { name, exact: true }) })
                .getByRole("cell"),
            ).toHaveText([baseline, proposed]);
          }
          await expect(
            artifact.getByText(
              locale === "ar"
                ? /ليست تنبؤًا علميًا أو سببية مثبتة أو اعتمادًا/
                : /not a scientific forecast, causal proof or approval/,
            ),
          ).toBeVisible();
          await expect(
            artifact.getByText(
              locale === "ar" ? /الاعتماد التشغيلي غير ممنوح/ : /Operational approval not granted/,
            ),
          ).toBeVisible();
          expect(externalAssets).toEqual([]);
          await artifact.screenshot({
            path: `.audit-tmp/omega-${theme}-changed-report-${locale}.png`,
            fullPage: true,
          });
        } finally {
          await artifact.close();
        }
      }
      await setLocale(page, "en");
      await page.getByRole("button", { name: "Reset demo", exact: true }).click();
      await expect(patrol).toHaveValue("2");
      await expect(response).toHaveValue("15");
      await expect(
        page.getByRole("button", { name: "Camera available", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.getByRole("button", { name: "1. Synthetic event", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(exportButton(page, "en")).toBeDisabled();
      await page
        .getByRole("combobox", { name: "Choose a demo scenario", exact: true })
        .selectOption("camera");
      await expect(
        page.getByRole("button", { name: "Camera available", exact: true }),
      ).toHaveAttribute("aria-pressed", "false");
      await expect(response).toHaveValue("30");
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
              page.getByRole("slider", {
                name: lang === "ar" ? "عدد الدوريات" : "Patrol count",
                exact: true,
              }),
              page.getByRole("slider", {
                name: lang === "ar" ? "زمن التحقق (دقيقة)" : "Verification time (min)",
                exact: true,
              }),
              page.getByRole("button", {
                name: lang === "ar" ? "توفر الكاميرا" : "Camera available",
                exact: true,
              }),
              page.getByRole("button", {
                name: lang === "ar" ? "المسار مفتوح" : "Route open",
                exact: true,
              }),
              page.getByRole("button", {
                name: lang === "ar" ? "توفر الاتصال" : "Connectivity available",
                exact: true,
              }),
              page.getByRole("button", {
                name: lang === "ar" ? "3. الكاميرا المفترضة" : "3. Assumed camera",
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
