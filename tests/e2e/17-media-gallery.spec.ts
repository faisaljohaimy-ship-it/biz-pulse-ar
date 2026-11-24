import { test, expect, type Locator, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

// Public media QA only. Real approved-account login and physical iPhone Safari
// are separate release criteria; neither is fabricated or silently skipped here.
type Film = "opening" | "twin";
type Locale = "ar" | "en";
type Ledger = {
  media: { path: string; film: Film | "other" }[];
  writes: string[];
  provider: string[];
  health: string[];
  errors: string[];
  playback: { event: string; playing: string[]; film: string }[];
  mockedChat: number;
};
const ledgers = new WeakMap<Page, Ledger>();
const imageFallback = "/home/command-room/command-room-1280.webp";
const imageDigests: Record<string, string> = {
  "/home/command-room/command-room-640.webp":
    "aac28d35a22b0110729dbc2ffa9e2e7d46a8b9827848538a95a0f06ec9fc555b",
  "/home/command-room/command-room-1280.webp":
    "b0d1b960aac5420d5f001f4fd98a5b3326b43539726f9aa244d6a5dc763db605",
};
const words = {
  ar: {
    opening: "فيلم هوية سديد",
    twin: "فيلم التوأم الرقمي",
    play: "تشغيل الفيلم",
  },
  en: {
    opening: "SADEED identity film",
    twin: "Digital twin film",
    play: "Play film",
  },
} as const;
const figure = (page: Page, film: Film) => page.locator(`figure[data-film='${film}']`);
test.use({ serviceWorkers: "block" });
function noEarlyMedia(ledger: Ledger) {
  expect(
    ledger.media,
    "no video bytes may be requested while reduced motion is active and playback has not been requested",
  ).toEqual([]);
}
function exclusive(playing: string[]) {
  expect(playing.length, `simultaneous films: ${playing.join(", ")}`).toBeLessThanOrEqual(1);
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const videos = Array.from(
      document.querySelectorAll<HTMLVideoElement>("figure[data-film] video"),
    );
    return {
      playing: videos
        .filter((video) => !video.paused && !video.ended)
        .map((video) => video.closest<HTMLElement>("figure")!.dataset.film!),
      observations:
        (
          window as Window & {
            __mediaAudit?: { event: string; playing: string[]; film: string }[];
          }
        ).__mediaAudit ?? [],
    };
  });
}
async function frame(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
async function gallery(page: Page, locale: Locale) {
  await page.goto("/sec/twin", { waitUntil: "domcontentloaded" });
  const stage = page.locator(".nx-home-twin-stage");
  await stage.scrollIntoViewIfNeeded();
  await expect(page.locator(".nx-home-twin")).toHaveAttribute(
    "dir",
    locale === "ar" ? "rtl" : "ltr",
  );
  for (const film of ["opening", "twin"] as const) {
    await expect(figure(page, film)).toHaveAccessibleName(words[locale][film]);
    await expect(figure(page, film)).toHaveAttribute("data-controls", "native");
  }
  await frame(page);
}
async function touchSize(control: Locator) {
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
}
async function playing(page: Page, film: Film) {
  const item = figure(page, film);
  const video = item.locator("video");
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute("controls", "");
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.readyState >= 2))
    .toBe(true);
  const state = await video.evaluate((v: HTMLVideoElement) => ({
    rate: v.playbackRate,
    defaultRate: v.defaultPlaybackRate,
    duration: v.duration,
    width: v.videoWidth,
    height: v.videoHeight,
    muted: v.muted,
    volume: v.volume,
    inline: v.playsInline,
    preload: v.preload,
    loop: v.loop,
    source: new URL(v.currentSrc).pathname,
    time: v.currentTime,
  }));
  expect(state.rate).toBe(1);
  expect(state.defaultRate).toBe(state.rate);
  expect(state.duration).toBeCloseTo(film === "opening" ? 26 : 56, 0);
  expect(state.width / state.height).toBeCloseTo(film === "opening" ? 3 : 16 / 9, 1);
  expect(state.inline).toBe(true);
  expect(state.preload).toBe("none");
  expect(state.loop).toBe(false);
  expect(state.volume).toBeGreaterThan(0);
  expect(state.muted).toBe(true);
  expect(state.source).toMatch(
    film === "opening"
      ? /^\/media\/brand\/sadeed-film-(804|1608)\.(mp4|webm)$/
      : /^\/media\/twin\/sadeed-twin-(640|1280)\.(mp4|webm)$/,
  );
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(state.time + 0.15);
  exclusive((await audit(page)).playing);
  return video;
}

async function installMediaGuards(page: Page) {
  const ledger: Ledger = {
    media: [],
    writes: [],
    provider: [],
    health: [],
    errors: [],
    playback: [],
    mockedChat: 0,
  };
  ledgers.set(page, ledger);
  page.on("pageerror", (error) => ledger.errors.push(error.message));
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (/\.(mp4|webm|m4v|mov)$/i.test(path)) {
      ledger.media.push({
        path,
        film: path.startsWith("/media/brand/sadeed-film-")
          ? "opening"
          : path.startsWith("/media/twin/sadeed-twin-")
            ? "twin"
            : "other",
      });
    }
  });
  await page.route("**/*", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\/$/, "");
    // Both GET probes mutate rate-counter storage. Never send them to a backend.
    if (path === "/api/public/health" || path === "/api/chat/health") {
      ledger.health.push(path);
      return route.fulfill({
        contentType: "application/json",
        body: '{"ok":true,"mocked":true,"provider":"none","key_present":false,"gate":"closed","status":"unknown","subsystems":{}}',
      });
    }
    if (
      /^\/api\/(?:chat|finn\/chat|sadeed\/(?:tts|transcribe)|public\/sadeed-(?:tts|transcribe))$/.test(
        path,
      )
    ) {
      ledger.provider.push(`${request.method()} ${path}`);
      return route.abort();
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      ledger.writes.push(`${request.method()} ${path}`);
      return route.abort();
    }
    return route.continue();
  });
  await page.addInitScript(() => {
    const observations: { event: string; playing: string[]; film: string }[] = [];
    (window as Window & { __mediaAudit: typeof observations }).__mediaAudit = observations;
    for (const event of ["play", "playing", "pause", "ended"]) {
      document.addEventListener(
        event,
        (e) => {
          const video = e.target;
          if (!(video instanceof HTMLVideoElement) || !video.closest("figure[data-film]")) return;
          observations.push({
            event,
            film: video.closest<HTMLElement>("figure")!.dataset.film!,
            playing: Array.from(
              document.querySelectorAll<HTMLVideoElement>("figure[data-film] video"),
            )
              .filter((v) => !v.paused && !v.ended)
              .map((v) => v.closest<HTMLElement>("figure")!.dataset.film!),
          });
        },
        true,
      );
    }
  });
  return ledger;
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000);
  await installMediaGuards(page);
});

// Compiler readiness only: actual cases still use fresh contexts and expect10s.
test.beforeAll(async ({ browser }, info) => {
  if (process.env.SADEED_E2E_LOCAL_HTTPS !== "1") return;
  test.setTimeout(60_000);
  const started = Date.now();
  const remaining = () => {
    const milliseconds = 55_000 - (Date.now() - started);
    if (milliseconds <= 0) throw new Error("Local client compiler warmup timed out");
    return milliseconds;
  };
  const use = info.project.use;
  const match = /^https:\/\/(?:localhost|127\.0\.0\.1):([1-9]\d{0,4})\/?$/.exec(use.baseURL ?? "");
  if (!match || Number(match[1]) > 65535)
    throw new Error("Warmup requires the guarded loopback origin");
  const context = await browser.newContext({
    baseURL: use.baseURL,
    ignoreHTTPSErrors: use.ignoreHTTPSErrors ?? false,
    serviceWorkers: "block",
    viewport: use.viewport,
    locale: use.locale,
    userAgent: use.userAgent,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
    deviceScaleFactor: use.deviceScaleFactor,
  });
  let ready = false;
  let ledger: Ledger | undefined;
  try {
    const page = await context.newPage();
    ledger = await installMediaGuards(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      sessionStorage.setItem("theme", "dark");
      localStorage.setItem("locale", "ar");
    });
    await page.goto("/?region=central", { waitUntil: "domcontentloaded", timeout: remaining() });
    await page.locator('.nx-home-brand[data-run="true"]').waitFor({ timeout: remaining() });
    await frame(page);
    await page.goto("/sec/twin", { waitUntil: "domcontentloaded", timeout: remaining() });
    const beforeGallery = ledger.media.length;
    await page.locator(".nx-home-twin-stage").scrollIntoViewIfNeeded({ timeout: remaining() });
    await page
      .locator('figure[data-film="twin"]')
      .waitFor({ state: "attached", timeout: remaining() });
    await page
      .locator('figure[data-film="opening"]')
      .waitFor({ state: "attached", timeout: remaining() });
    noEarlyMedia({ ...ledger, media: ledger.media.slice(beforeGallery) });
    expect(ledger.writes).toEqual([]);
    expect(ledger.provider).toEqual([]);
    expect(ledger.errors).toEqual([]);
    ready = true;
  } finally {
    try {
      await writeFile(
        `/tmp/sadeed-media-warmup-${info.project.name}.json`,
        JSON.stringify(
          {
            ready,
            elapsedMs: Date.now() - started,
            mode: "local server compiler warmup; not a cold startup SLO or device acceptance sample",
            ledger,
          },
          null,
          2,
        ),
      );
    } finally {
      await context.close();
    }
  }
});

test.afterEach(async ({ page, browserName, browser }, info) => {
  const ledger = ledgers.get(page)!;
  const state = !page.isClosed() ? await audit(page) : null;
  if (state) ledger.playback.push(...state.observations);
  const safeName = `${browserName}-${info.titlePath.slice(1).join("-")}`
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 190);
  await mkdir(".audit-tmp/media-evidence", { recursive: true });
  const conditions = !page.isClosed()
    ? await page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0] as
          PerformanceNavigationTiming | undefined;
        return {
          viewport: { width: innerWidth, height: innerHeight },
          devicePixelRatio,
          reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
          lastDocumentSample: navigation
            ? {
                ttfbMs: navigation.responseStart - navigation.requestStart,
                domContentLoadedMs: navigation.domContentLoadedEventEnd || null,
              }
            : null,
        };
      })
    : null;
  await writeFile(
    `.audit-tmp/media-evidence/${safeName}.json`,
    JSON.stringify(
      {
        project: info.project.name,
        engineVersion: browser.version(),
        conditions,
        note: "Local development server; one last-document navigation sample, not an SLA or backend API latency. WebKit iPhone emulation is not a physical device.",
        ledger,
        state,
      },
      null,
      2,
    ),
  );
  expect(ledger.writes).toEqual([]);
  expect(ledger.provider).toEqual([]);
  expect(ledger.errors).toEqual([]);
  if (state) {
    exclusive(state.playing);
    for (const observation of ledger.playback) exclusive(observation.playing);
  }
});

async function openHome(page: Page, theme: string, locale: Locale) {
  await page.goto("/?region=central", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("home-opening-image")).toBeVisible({ timeout: 60_000 });
  // Wait for the hydrated home before testing its controls or scrolling.
  await expect(page.locator(".nx-home-brand")).toHaveAttribute("data-run", "true", {
    timeout: 60_000,
  });
  await frame(page);
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  expect(await page.evaluate(() => localStorage.getItem("sadeed-staff-number"))).toBeNull();
}

for (const theme of ["dark", "light"] as const) {
  for (const locale of ["ar", "en"] as const) {
    test.describe(`Owner media · ${theme} · ${locale}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.addInitScript(
          ({ theme, locale }) => {
            sessionStorage.setItem("theme", theme);
            localStorage.setItem("locale", locale);
            // Exercise autoplay on a known fast link even when the dev server is under load.
            Object.defineProperty(navigator, "connection", {
              configurable: true,
              value: { effectiveType: "4g", saveData: false },
            });
          },
          { theme, locale },
        );
      });

      test("shows the exact image and both posters at all certification widths without eager video", async ({
        page,
        browserName,
      }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await openHome(page, theme, locale);
        const hero = page.getByTestId("home-opening-image");
        await expect(hero.locator("video, audio")).toHaveCount(0);
        await expect(hero.locator("img")).toHaveAttribute("src", imageFallback);
        for (const width of [360, 390, 430, 768, 1280]) {
          await page.setViewportSize({ width, height: 950 });
          await expect
            .poll(() =>
              hero
                .locator("img")
                .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
            )
            .toBe(true);
          const image = await hero.locator("img").evaluate(async (img: HTMLImageElement) => {
            // A w-descriptor srcset density-corrects naturalWidth. Decode the
            // selected delivered file separately to inspect its actual pixels.
            const decoded = new Image();
            decoded.src = img.currentSrc;
            await decoded.decode();
            return {
              current: new URL(img.currentSrc).pathname,
              width: decoded.naturalWidth,
              height: decoded.naturalHeight,
              fit: getComputedStyle(img).objectFit,
              bottom: img.getBoundingClientRect().bottom,
              caption: img.closest("figure")!.querySelector("figcaption")!.getBoundingClientRect()
                .top,
            };
          });
          expect(image.current).toMatch(/^\/home\/command-room\/command-room-(640|1280)\.webp$/);
          expect([
            [640, 349],
            [1280, 698],
          ]).toContainEqual([image.width, image.height]);
          if (theme === "dark" && locale === "ar") {
            const sha = await page.evaluate(async (path) => {
              const response = await fetch(path);
              if (!response.ok) throw new Error("Opening image is unavailable");
              const digest = await crypto.subtle.digest("SHA-256", await response.arrayBuffer());
              return Array.from(new Uint8Array(digest), (value) =>
                value.toString(16).padStart(2, "0"),
              ).join("");
            }, image.current);
            expect(sha).toBe(imageDigests[image.current]);
          }
          expect(image.fit).toBe("contain");
          expect(image.caption).toBeGreaterThanOrEqual(image.bottom - 1);
        }
        const beforeGallery = ledgers.get(page)!.media.length;
        await gallery(page, locale);
        for (const width of [360, 390, 430, 768, 1280]) {
          await page.setViewportSize({ width, height: 950 });
          for (const film of ["opening", "twin"] as const) {
            await touchSize(
              figure(page, film).getByRole("button", { name: words[locale].play, exact: true }),
            );
            await expect(figure(page, film).locator("video,source")).toHaveCount(0);
            await expect(figure(page, film).locator("figcaption")).toContainText(
              film === "opening" ? "26" : "56",
            );
            const poster = figure(page, film).locator("img");
            await expect
              .poll(() =>
                poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
              )
              .toBe(true);
            const bounds = await figure(page, film).locator(".twin-film-frame").boundingBox();
            expect(bounds!.width / bounds!.height).toBeCloseTo(film === "opening" ? 3 : 16 / 9, 1);
          }
          const dimensions = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            content: document.documentElement.scrollWidth,
          }));
          expect(dimensions.content, `${width}px ${theme} ${locale}`).toBeLessThanOrEqual(
            dimensions.viewport + 1,
          );
          noEarlyMedia({
            ...ledgers.get(page)!,
            media: ledgers.get(page)!.media.slice(beforeGallery),
          });
          if (width === 390 || width === 1280) {
            await page.screenshot({
              path: `.audit-tmp/media-evidence/${browserName}-${theme}-${locale}-${width}-posters.png`,
              fullPage: true,
            });
          }
        }
      });

      test("autoplays visible films muted, transfers playback, and preserves manual controls and reduced motion", async ({
        page,
      }) => {
        await page.addInitScript(() => localStorage.setItem("sadeed-staff-number", "00000"));
        await page.setViewportSize({ width: 390, height: 460 });
        // Land at the first film rather than scrolling through the gallery's lower players.
        await page.goto("/sec/twin", { waitUntil: "domcontentloaded" });
        const stage = page.locator(".nx-home-twin-stage");
        await stage.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
        const twin = figure(page, "twin");
        await twin
          .locator(".twin-film-frame")
          .evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
        const video = await playing(page, "twin");
        const track = video.locator("track");
        await expect(track).toHaveAttribute("srclang", locale);
        await expect
          .poll(() =>
            video.evaluate((v: HTMLVideoElement) =>
              Array.from(v.textTracks).some(
                (t) => t.mode === "showing" && (t.cues?.length ?? 0) > 0,
              ),
            ),
          )
          .toBe(true);
        await video.evaluate((v: HTMLVideoElement) => v.pause());
        await expect(twin).toHaveAttribute("data-status", "paused");
        await video.focus();
        await video.evaluate((v: HTMLVideoElement) => v.play());
        await playing(page, "twin");

        const opening = figure(page, "opening");
        await opening
          .locator(".twin-film-frame")
          .evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
        const openingVideo = opening.locator("video");
        await expect(openingVideo).toBeVisible();
        await openingVideo.evaluate((v: HTMLVideoElement) => v.play());
        await playing(page, "opening");
        await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
        const media = ledgers.get(page)!.media;
        expect(media.some((r) => r.film === "twin")).toBe(true);
        expect(media.some((r) => r.film === "opening")).toBe(true);

        await page.locator(".nx-home-twin a[href='/cinematic']").click();
        await expect(page).toHaveURL(/\/cinematic$/);
        await expect(page.locator("figure[data-film='opening']")).toHaveCount(0);
        ledgers.get(page)!.playback.push(...(await audit(page)).observations);
        await page.goto("/sec/decision-center", { waitUntil: "domcontentloaded" });
        await expect(
          page.getByRole("heading", {
            name:
              locale === "ar" ? "مركز القرار الأمني الذكي" : "Intelligent Security Decision Center",
            exact: true,
          }),
        ).toBeVisible({ timeout: 60_000 });
        await expect(
          page.getByRole("region", {
            name: locale === "ar" ? "مختبر السياق والافتراضات" : "Context & assumptions lab",
            exact: true,
          }),
        ).toBeVisible();
        await expect(page.locator("figure[data-film] video")).toHaveCount(0);
        await expect(
          page.getByRole("button", {
            name: locale === "ar" ? "تصدير التقرير · محاكاة" : "Export report · simulation",
            exact: true,
          }),
        ).toBeDisabled();

        await page.emulateMedia({ reducedMotion: "reduce" });
        const beforeReduced = media.length;
        await gallery(page, locale);
        await expect(figure(page, "opening")).toHaveAttribute("data-gate", "reduced");
        noEarlyMedia({ ...ledgers.get(page)!, media: media.slice(beforeReduced) });
        await figure(page, "opening")
          .getByRole("button", { name: words[locale].play, exact: true })
          .click();
        const requested = figure(page, "opening").locator("video");
        await expect
          .poll(() => requested.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0))
          .toBe(true);
        await requested.evaluate((v: HTMLVideoElement) => v.pause());
        await expect.poll(async () => (await audit(page)).playing).toEqual([]);
      });

      test("renders source provenance from an explicitly mocked SDK stream without provider calls", async ({
        page,
        browserName,
      }) => {
        await openHome(page, theme, locale);
        const metadata = {
          citations: [
            { title: "Permit policy", tag: "[KB:Permit policy]" },
            { title: "Patrol guide", tag: "[DOC:Patrol guide]" },
          ],
          ragCounts: { unverified: 1 },
          coverage: { score: 0.99 },
        };
        const chunks = [
          { type: "start", messageId: "mock-source-answer" },
          { type: "text-start", id: "mock-source-text" },
          {
            type: "text-delta",
            id: "mock-source-text",
            delta: "Local QA fixture: consult [KB:Permit policy].",
          },
          { type: "text-end", id: "mock-source-text" },
          { type: "message-metadata", messageMetadata: metadata },
          { type: "finish", finishReason: "stop" },
        ];
        const stream =
          chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n";
        await page.route("**/api/chat/health", (route) => {
          ledgers.get(page)!.health.push("/api/chat/health");
          return route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              mocked: true,
              gate: "verified",
              key_present: true,
              zero_cost_ready: true,
              rag_ready: true,
              voice_configured: false,
              retrieval: { lexical_ready: true, vector_ready: false, embedding_provider: "none" },
            }),
          });
        });
        await page.route("**/api/chat", (route) => {
          expect(route.request().method()).toBe("POST");
          ledgers.get(page)!.mockedChat += 1;
          return route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            headers: {
              "x-vercel-ai-ui-message-stream": "v1",
              "X-SADEED-Reply-Source": "local-qa-mock",
            },
            body: stream,
          });
        });
        await page.setViewportSize({ width: 390, height: 950 });
        await page.getByRole("button", { name: /فتح.*سديد.*المخاطبة/ }).click();
        const mute = page
          .getByRole("complementary", { name: "سديد — المساعد التنفيذي", exact: true })
          .getByRole("button", { name: "كتم صوت سديد", exact: true });
        await mute.click();
        await expect(mute).toHaveCount(0);
        await expect(
          page
            .getByRole("complementary", { name: "سديد — المساعد التنفيذي", exact: true })
            .getByRole("button", { name: "إلغاء كتم صوت سديد", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await page
          .getByPlaceholder(/اسأل/)
          .fill("اعرض مرجع سياسة التصاريح في هذا الاختبار المحلي.");
        await page.getByRole("button", { name: "إرسال", exact: true }).click();
        const sources = page
          .locator("details")
          .filter({ has: page.getByText("[KB:Permit policy]", { exact: true }) });
        await expect(sources).toHaveCount(1);
        await expect(sources).toHaveAttribute("lang", locale);
        await expect(sources).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        const summary = sources.locator("summary");
        await expect(summary).toHaveText(
          locale === "ar" ? "مصادر الإجابة وكيف أُعدّت" : "Answer sources and preparation",
        );
        await touchSize(summary);
        await summary.focus();
        await summary.press("Enter");
        await expect(sources).toHaveAttribute("open", "");
        await expect(
          sources
            .getByRole("region", {
              name: locale === "ar" ? "مستشهَد بها — الوسم في الإجابة" : "Cited — tag in answer",
              exact: true,
            })
            .getByText("Permit policy", { exact: true }),
        ).toBeVisible();
        await expect(
          sources
            .getByRole("region", {
              name: locale === "ar" ? "مسترجعة — دون وسم في الإجابة" : "Retrieved — tag absent",
              exact: true,
            })
            .getByText("Patrol guide", { exact: true }),
        ).toBeVisible();
        await expect(
          sources.getByText(locale === "ar" ? "غير مرفق" : "Not provided", { exact: true }),
        ).toHaveCount(5);
        await expect(
          sources.getByText(
            locale === "ar"
              ? "الإيصال غير مرفق؛ الأدوات قد تكون عملت."
              : "No receipt; tools may have run.",
            { exact: true },
          ),
        ).toBeVisible();
        await expect(sources).not.toContainText("99%");
        const geometry = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        expect(geometry.content).toBeLessThanOrEqual(geometry.viewport + 1);
        expect(ledgers.get(page)!.mockedChat).toBe(1);
        const panelGeometry = [];
        await mkdir(".audit-tmp/media-evidence", { recursive: true });
        for (const width of [360, 390]) {
          await page.setViewportSize({ width, height: 950 });
          const bounds = await sources.evaluate((element) => {
            const root = element.getBoundingClientRect();
            const clipped = Array.from(element.querySelectorAll("*")).flatMap((child) =>
              Array.from(child.getClientRects())
                .filter(
                  (rect) =>
                    rect.width > 0 && (rect.left < root.left - 1 || rect.right > root.right + 1),
                )
                .map((rect) => ({ tag: child.tagName, left: rect.left, right: rect.right })),
            );
            const ancestors = [];
            let parent = element.parentElement;
            for (let depth = 0; parent && depth < 5; depth++, parent = parent.parentElement) {
              const box = parent.getBoundingClientRect();
              ancestors.push({
                tag: parent.tagName,
                left: box.left,
                right: box.right,
                client: parent.clientWidth,
                scroll: parent.scrollWidth,
              });
            }
            return {
              viewport: document.documentElement.clientWidth,
              left: root.left,
              right: root.right,
              client: element.clientWidth,
              scroll: element.scrollWidth,
              clipped,
              ancestors,
            };
          });
          panelGeometry.push({ width, ...bounds });
          await writeFile(
            `.audit-tmp/media-evidence/${browserName}-${theme}-${locale}-mocked-source-geometry.json`,
            JSON.stringify(panelGeometry, null, 2),
          );
          expect(bounds.client).toBeGreaterThan(0);
          expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
          expect(bounds.left).toBeGreaterThanOrEqual(-1);
          expect(bounds.right).toBeLessThanOrEqual(bounds.viewport + 1);
          expect(bounds.clipped, `${width}px details descendants`).toEqual([]);
          for (const ancestor of bounds.ancestors) {
            expect(bounds.left).toBeGreaterThanOrEqual(ancestor.left - 1);
            expect(bounds.right).toBeLessThanOrEqual(ancestor.right + 1);
          }
        }
        await sources.screenshot({
          path: `.audit-tmp/media-evidence/${browserName}-${theme}-${locale}-mocked-source-panel.png`,
        });
      });
    });
  }
}

test("media audit guards reject deliberately injected eager requests and overlap", async ({
  page,
  baseURL,
}) => {
  const ledger = ledgers.get(page)!;
  await page.route("**/media/brand/sadeed-film-804.mp4?audit-eager=1", (route) =>
    route.fulfill({ status: 204 }),
  );
  const requested = page.waitForRequest((request) => request.url().includes("audit-eager=1"));
  await page.setContent(
    `<img alt="audit fixture" src="${new URL("/media/brand/sadeed-film-804.mp4?audit-eager=1", baseURL).href}">`,
  );
  await requested;
  expect(() => noEarlyMedia(ledger)).toThrow();
  ledger.media = [];
  expect(() => exclusive(["opening", "twin"])).toThrow();
});
