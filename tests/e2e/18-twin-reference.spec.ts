import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

type Ledger = { media: string[]; blocked: string[]; errors: string[]; health: string[] };
const ledgers = new WeakMap<Page, Ledger>();
test.use({ serviceWorkers: "block" });
async function guard(page: Page) {
  const ledger: Ledger = { media: [], blocked: [], errors: [], health: [] };
  ledgers.set(page, ledger);
  page.on("pageerror", (error) => ledger.errors.push(error.message));
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (/\.(mp4|webm)$/.test(path)) ledger.media.push(path);
  });
  await page.route("**/*", (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (path === "/api/chat/health" || path === "/api/public/health") {
      ledger.health.push(path);
      return route.fulfill({
        contentType: "application/json",
        body: '{"ok":true,"mocked":true,"gate":"closed","key_present":false,"voice_configured":false}',
      });
    }
    if (
      !["GET", "HEAD", "OPTIONS"].includes(request.method()) ||
      /^\/api\/(chat|finn\/chat|sadeed\/(tts|transcribe)|public\/sadeed-(tts|transcribe))$/.test(
        path,
      )
    ) {
      ledger.blocked.push(`${request.method()} ${path}`);
      return route.abort();
    }
    return route.continue();
  });
  return ledger;
}
async function touch(control: Locator) {
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}
async function noOverflow(page: Page, panel: Locator) {
  const box = await panel.boundingBox();
  const size = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(size.content).toBeLessThanOrEqual(size.viewport + 1);
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(size.viewport + 1);
  for (const button of await panel.getByRole("button").all()) {
    await touch(button);
    const target = await button.boundingBox();
    expect(target!.x).toBeGreaterThanOrEqual(box!.x - 1);
    expect(target!.x + target!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
  }
}
const film = (page: Page, id: string) => page.locator(`figure[data-film='${id}']`);
async function decoded(page: Page, id: string, duration: number, rate: number) {
  const video = film(page, id).locator("video");
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.readyState >= 2))
    .toBe(true);
  const state = await video.evaluate((v: HTMLVideoElement) => ({
    duration: v.duration,
    rate: v.playbackRate,
    muted: v.muted,
    width: v.videoWidth,
    height: v.videoHeight,
    preload: v.preload,
    time: v.currentTime,
    source: new URL(v.currentSrc).pathname,
  }));
  expect(state.duration).toBeCloseTo(duration, 0);
  expect(state.rate).toBe(rate);
  expect(state.preload).toBe("none");
  expect(state.muted).toBe(false);
  expect(state.source).toMatch(
    id === "reference"
      ? /^\/media\/refinery\/refinery-illustrative\.mp4$/
      : id === "opening"
        ? /^\/media\/brand\/sadeed-film-(804|1608)\.(mp4|webm)$/
        : /^\/media\/twin\/sadeed-twin-(640|1280)\.(mp4|webm)$/,
  );
  if (id === "reference") expect([state.width, state.height]).toEqual([1280, 720]);
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(state.time + 0.1);
  const playing = await page
    .locator("figure[data-film] video")
    .evaluateAll(
      (videos: HTMLVideoElement[]) => videos.filter((v) => !v.paused && !v.ended).length,
    );
  expect(playing).toBe(1);
  return video;
}

test.beforeAll(async ({ browser }, info) => {
  test.setTimeout(60_000);
  const started = Date.now(),
    remaining = () => Math.max(1, 55_000 - (Date.now() - started));
  const use = info.project.use;
  const context = await browser.newContext({
    baseURL: use.baseURL,
    ignoreHTTPSErrors: use.ignoreHTTPSErrors,
    serviceWorkers: "block",
  });
  try {
    const page = await context.newPage();
    const ledger = await guard(page);
    await page.goto("/?region=central", { waitUntil: "domcontentloaded", timeout: remaining() });
    await page.locator('.nx-home-brand[data-run="true"]').waitFor({ timeout: remaining() });
    await page.locator(".nx-home-twin-stage").scrollIntoViewIfNeeded({ timeout: remaining() });
    await page
      .locator('figure[data-film="twin"]')
      .waitFor({ state: "attached", timeout: remaining() });
    await page.locator('button[aria-controls="nx-twin-reference"]').click({ timeout: remaining() });
    await page.locator("#nx-twin-reference .tx-executive").waitFor({ timeout: remaining() });
    expect(ledger.media).toEqual([]);
    expect(ledger.blocked).toEqual([]);
    expect(ledger.errors).toEqual([]);
  } finally {
    await context.close();
  }
});
test.beforeEach(async ({ page }) => {
  test.setTimeout(150_000);
  await guard(page);
});
test.afterEach(async ({ page }, info) => {
  const ledger = ledgers.get(page)!;
  await mkdir("/tmp/sadeed-twin-reference-evidence", { recursive: true });
  await writeFile(
    `/tmp/sadeed-twin-reference-evidence/${info.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`,
    JSON.stringify(ledger, null, 2),
  );
  expect(ledger.blocked).toEqual([]);
  expect(ledger.errors).toEqual([]);
});

for (const theme of ["dark", "light"] as const)
  for (const locale of ["ar", "en"] as const) {
    test(`reference panel ${theme} ${locale} five widths`, async ({ page }) => {
      await page.addInitScript(
        ({ theme, locale }) => {
          sessionStorage.setItem("theme", theme);
          localStorage.setItem("locale", locale);
        },
        { theme, locale },
      );
      await page.goto("/?region=central", { waitUntil: "domcontentloaded" });
      await page.locator('.nx-home-brand[data-run="true"]').waitFor();
      const toggle = page.getByRole("button", {
        name: locale === "ar" ? "التوأم التفاعلي" : "Interactive twin",
        exact: true,
      });
      await touch(toggle);
      await toggle.click();
      const panel = page.locator("#nx-twin-reference .tx-executive");
      await expect(panel).toHaveAttribute("data-source", "reference");
      await expect(panel).toHaveAttribute("data-simulation", "true");
      await expect(panel).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.getByRole("dialog", { name: "الرقم الوظيفي مطلوب" })).toHaveCount(0);
      expect(await page.evaluate(() => localStorage.getItem("sadeed-staff-number"))).toBeNull();
      const regions = panel.locator(".tx-region-list button");
      const departments = panel.locator(".tx-department");
      await expect(regions).toHaveCount(4);
      await expect(departments).toHaveCount(5);
      for (const [index, width] of [360, 390, 430, 768, 1280].entries()) {
        await page.setViewportSize({ width, height: 950 });
        await regions.nth(index % 4).focus();
        await regions.nth(index % 4).press("Enter");
        await expect(regions.nth(index % 4)).toHaveAttribute("aria-pressed", "true");
        await departments.nth(index).focus();
        await departments.nth(index).press("Space");
        await expect(departments.nth(index)).toHaveAttribute("aria-pressed", "true");
        const map = panel.getByRole("button", {
          name: locale === "ar" ? "خريطة المناطق" : "Region map",
          exact: true,
        });
        const markers = panel.getByRole("button", {
          name: locale === "ar" ? "علامات الأقسام" : "Department markers",
          exact: true,
        });
        await map.click();
        await expect(panel.locator(".tx-orbit")).toHaveCount(0);
        await map.click();
        await markers.click();
        await expect(panel.locator(".tx-assets")).toHaveCount(0);
        await markers.click();
        await noOverflow(page, panel);
        expect(ledgers.get(page)!.media).toEqual([]);
        await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
        if (width === 390 || width === 1280)
          await panel.screenshot({
            path: `/tmp/sadeed-twin-reference-evidence/${theme}-${locale}-${width}.png`,
          });
      }
      await panel
        .getByRole("button", {
          name: locale === "ar" ? "فيلم توضيحي" : "Illustrative film",
          exact: true,
        })
        .click();
      await expect(film(page, "reference")).toBeVisible();
      await expect(film(page, "reference").locator("video,source")).toHaveCount(0);
      expect(ledgers.get(page)!.media).toEqual([]);
      await panel
        .getByRole("button", { name: locale === "ar" ? "إغلاق الفيلم" : "Close film", exact: true })
        .click();
      await expect(film(page, "reference")).toHaveCount(0);
      await expect(panel.locator(".tx-film-button")).toBeFocused();
      await toggle.click();
      await expect(page.locator("#nx-twin-reference")).toHaveCount(0);
      await toggle.click();
      await expect(page.locator("#nx-twin-reference .tx-executive")).toBeVisible();
    });
  }

test("reference real decode controls and three profile exclusivity", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    sessionStorage.setItem("theme", "dark");
    localStorage.setItem("locale", "en");
  });
  await page.goto("/?region=central", { waitUntil: "domcontentloaded" });
  await page.locator('.nx-home-brand[data-run="true"]').waitFor();
  await page.getByRole("button", { name: "Interactive twin", exact: true }).click();
  const panel = page.locator("#nx-twin-reference .tx-executive");
  await panel.getByRole("button", { name: "Illustrative film", exact: true }).click();
  await expect(film(page, "reference").locator("video,source")).toHaveCount(0);
  expect(ledgers.get(page)!.media).toEqual([]);
  await film(page, "reference").getByRole("button", { name: "Play film", exact: true }).click();
  const video = await decoded(page, "reference", 15, 1);
  await film(page, "reference").getByRole("button", { name: "Pause film", exact: true }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await film(page, "reference").getByRole("button", { name: "Resume film", exact: true }).click();
  await decoded(page, "reference", 15, 1);
  await video.evaluate((v: HTMLVideoElement) => {
    v.currentTime = 0;
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.ended), { timeout: 20000 })
    .toBe(true);
  await film(page, "reference").locator("button[data-action='reset']").click();
  await expect(film(page, "reference").locator("video")).toHaveCount(0);
  for (const [id, duration, rate] of [
    ["twin", 56, 1],
    ["opening", 26, 0.5],
    ["reference", 15, 1],
  ] as const) {
    await film(page, id).locator(".twin-film-toggle").click();
    await decoded(page, id, duration, rate);
  }
  await page.getByRole("button", { name: "Interactive twin", exact: true }).click();
  await expect(film(page, "reference")).toHaveCount(0);
  expect(
    await page
      .locator("figure[data-film] video")
      .evaluateAll(
        (videos: HTMLVideoElement[]) => videos.filter((v) => !v.paused && !v.ended).length,
      ),
  ).toBe(0);
  const recorded = page.video();
  await page.close();
  if (recorded)
    await recorded.saveAs("/tmp/sadeed-twin-reference-evidence/normal-speed-chromium.webm");
});
