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
async function decoded(page: Page, id: string, duration: number, muted: boolean) {
  const video = film(page, id).locator("video");
  await expect(video).toBeAttached();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.readyState >= 2))
    .toBe(true);
  const state = await video.evaluate((v: HTMLVideoElement) => ({
    duration: v.duration,
    rate: v.playbackRate,
    muted: v.muted,
    width: v.videoWidth,
    height: v.videoHeight,
    controls: v.controls,
    time: v.currentTime,
    source: new URL(v.currentSrc).pathname,
  }));
  expect(state.duration).toBeCloseTo(duration, 0);
  expect(state.rate).toBe(1);
  expect(state.controls).toBe(true);
  expect(state.muted).toBe(muted);
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

test.beforeAll(async () => {
  await mkdir("/tmp/sadeed-twin-reference-evidence", { recursive: true });
});
test.beforeEach(async ({ page }) => {
  test.setTimeout(150_000);
  // The operational route can be opened by a returning guest. Use local fixture
  // state so the test never submits a staff entry to the server.
  await page.addInitScript(() => localStorage.setItem("sadeed-staff-number", "00000"));
  await guard(page);
});
test.afterEach(async ({ page }, info) => {
  const ledger = ledgers.get(page)!;
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
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/sec/twin?region=central", { waitUntil: "domcontentloaded" });
      const panel = page.locator(".tx-executive");
      const toggle = panel.getByRole("button", {
        name: locale === "ar" ? "فيلم توضيحي" : "Illustrative film",
        exact: true,
      });
      await touch(toggle);
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(panel).toHaveAttribute("data-source", "reference");
      await expect(panel).toHaveAttribute("data-simulation", "true");
      await expect(panel).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.getByRole("dialog", { name: "الرقم الوظيفي مطلوب" })).toHaveCount(0);
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
      await expect(film(page, "reference")).toBeVisible();
      await expect(film(page, "reference").locator("video,source")).toHaveCount(0);
      expect(ledgers.get(page)!.media).toEqual([]);
      await panel
        .getByRole("button", { name: locale === "ar" ? "إغلاق الفيلم" : "Close film", exact: true })
        .click();
      await expect(film(page, "reference")).toHaveCount(0);
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(film(page, "reference")).toBeVisible();
    });
  }

test("visible reference and gallery films autoplay muted one at a time", async ({ page }) => {
  // A narrow, short viewport isolates each frame. In a wide two-column row the
  // first visible film rightly retains playback while its neighbor waits.
  await page.setViewportSize({ width: 760, height: 340 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // The browser's estimated throughput can drop during a parallel dev-server run.
  // This case exercises autoplay on a normal connection, separately from saver tests.
  await page.addInitScript(() => {
    const connection = (navigator as Navigator & { connection?: object }).connection;
    if (connection) {
      Object.defineProperty(connection, "effectiveType", { configurable: true, value: "4g" });
      Object.defineProperty(connection, "saveData", { configurable: true, value: false });
    }
  });
  await page.goto("/sec/twin?region=central", { waitUntil: "domcontentloaded" });
  for (const [id, duration] of [
    ["reference", 15],
    ["twin", 56],
    ["opening", 26],
  ] as const) {
    if (id !== "reference") {
      await page.locator(`[data-gallery-film='${id}']`).scrollIntoViewIfNeeded();
    }
    const frame = film(page, id).locator(".twin-film-frame");
    await frame.evaluate((element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await expect(film(page, id)).toHaveAttribute("data-gate", "open");
    await decoded(page, id, duration, true);
  }
});

test("reduced motion waits for intentional playback, including after closing and reopening", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("locale", "en"));
  await page.goto("/sec/twin?region=central", { waitUntil: "domcontentloaded" });
  const panel = page.locator(".tx-executive");
  const reference = film(page, "reference");
  const play = reference.getByRole("button", { name: "Play film", exact: true });
  await play.scrollIntoViewIfNeeded();
  await expect(reference).toHaveAttribute("data-gate", "reduced");
  await expect(reference.locator("video,source")).toHaveCount(0);
  expect(ledgers.get(page)!.media).toEqual([]);
  await play.click();
  const video = await decoded(page, "reference", 15, false);
  await video.evaluate((v: HTMLVideoElement) => v.pause());
  await expect(reference).toHaveAttribute("data-status", "paused");
  await video.evaluate((v: HTMLVideoElement) => {
    v.currentTime = v.duration - 1;
    return v.play();
  });
  await expect(reference).toHaveAttribute("data-status", "ended");
  await panel.getByRole("button", { name: "Close film", exact: true }).click();
  await expect(reference).toHaveCount(0);
  const toggle = panel.getByRole("button", { name: "Illustrative film", exact: true });
  await expect(toggle).toBeFocused();
  await toggle.click();
  await expect(play).toBeVisible();
  await expect(reference.locator("video,source")).toHaveCount(0);
});
