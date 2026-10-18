#!/usr/bin/env node
/**
 * لقطةٌ حيّة للموقع المنشور — صورٌ وحقائق DOM من متصفّحٍ حقيقي.
 *
 * فحص الإنتاج (`ui-audit`) يحكم على الحدود (الخطّ · اللمس · القصّ) ولا يقول
 * **ما الذي يُرى**؛ وبيئات العمل الآلية قد لا تبلغ النطاق المخصّص أصلًا. فهذا
 * السكربت يفتح الموقع من مُشغّل CI ويكتب ما رآه فعلًا: لقطاتٌ لكل مسار ومقاس،
 * وحقائق مقيسة من DOM — هل الشريط المتحرّك يتحرّك، وهل اللوحة في رأس الشريط
 * الجانبي، وهل البانر بعرض العمود، وأيّ صورةٍ في بطاقة سَدِيد، وفي أيّ جهةٍ
 * يقع الشريط الجانبي، وأيقونات الرابط، وأخطاء وحدة التحكّم والطلبات الفاشلة.
 *
 * **شاهدٌ لا حَكَم** (مخرجه صفر دائمًا إلا لعطلٍ في السكربت نفسه): الحكم في
 * `ui-audit` وعقد HTML. والقيم تُطبع كما قِيست — لا «نجح» تُستنتج من غياب.
 *
 * الاستعمال:
 *   BASE_URL=https://neexios.com OUT_DIR=live-shots node scripts/live-snapshot.mjs
 *   ROUTES=/,/sec,/files (اختياري)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "").replace(/\/+$/, "");
const OUT = process.env.OUT_DIR || "live-shots";
const ROUTES = (process.env.ROUTES || "/,/sec,/sec/incidents,/files")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

if (!BASE) {
  console.error("BASE_URL مطلوب");
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { tag: "desktop-1536", width: 1536, height: 1024, mobile: false },
  { tag: "phone-390", width: 390, height: 844, mobile: true },
];
const THEMES = ["light", "dark"];

/** ما يُقاس داخل الصفحة — حقائق لا أحكام. */
function collect() {
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };
  const q = (s) => document.querySelector(s);
  const track = q(".nx-ticker-track");
  const ticker = q(".nx-ticker");
  const plateImg = q('img[src*="/brand/sadeed-plate"], img[srcset*="/brand/sadeed-plate"]');
  const plateLink = plateImg ? plateImg.closest("a") : null;
  const persona = q('img[src*="sadeed-portrait"]');
  const banner = q(".nx-brand-poster");
  const kpi = q(".nx-home-kpi-cell");
  const nav = q(".nx-sysnav");
  const icons = [
    ...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]'),
  ].map((l) => l.getAttribute("href"));
  return {
    title: document.title,
    dir: document.documentElement.getAttribute("dir"),
    theme: document.documentElement.className,
    ticker: ticker
      ? {
          rect: rect(ticker),
          paused: ticker.hasAttribute("data-paused"),
          running: track ? track.hasAttribute("data-run") : false,
          transform: track ? getComputedStyle(track).transform : null,
          items: ticker.querySelectorAll(".nx-ticker-copy:not([aria-hidden]) .nx-ticker-item")
            .length,
          toggle: rect(q(".nx-ticker-toggle")),
        }
      : null,
    banner: banner
      ? {
          rect: rect(banner),
          src: banner.currentSrc.split("/").pop(),
          kpiRow: rect(kpi?.parentElement ?? null),
        }
      : null,
    plate: plateImg
      ? {
          rect: rect(plateImg),
          src: plateImg.currentSrc.split("/").pop(),
          linkLabel: plateLink?.getAttribute("aria-label") ?? null,
        }
      : null,
    persona: persona ? { rect: rect(persona), src: persona.currentSrc.split("/").pop() } : null,
    sidebar: nav ? { rect: rect(nav), side: nav.getAttribute("data-side") } : null,
    icons,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  };
}

// في CI يثبّت الفحص متصفّحه؛ ومحلّيًّا يُمرَّر مسارٌ صريح كما في `ui-audit`.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const report = { base: BASE, at: new Date().toISOString(), shots: [] };

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    // الداكن على الرئيسية وحدها: الوضع الثاني سطح صحّة، والمسارات الداخلية
    // تُغطّيها لقطة الفاتح هنا وفحصا الحدود في الوضعين.
    const routes = theme === "dark" ? ["/"] : ROUTES;
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      locale: "ar-SA",
      reducedMotion: "no-preference",
    });
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem("theme", t);
        localStorage.setItem("locale", "ar");
      } catch {
        /* التخزين قد يكون محجوبًا — اللقطة تبقى صادقة بلا تفضيل */
      }
    }, theme);
    for (const route of routes) {
      const page = await ctx.newPage();
      const consoleErrors = [];
      const failed = [];
      page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 200)));
      page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 200)}`));
      page.on("requestfailed", (r) =>
        failed.push(`${r.failure()?.errorText ?? "failed"} ${r.url().slice(0, 160)}`),
      );
      page.on("response", (r) => {
        if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 160)}`);
      });
      const tag = `${vp.tag}-${theme}${route === "/" ? "-home" : route.replace(/\//g, "-")}`;
      let facts = null;
      let moving = null;
      try {
        await page.goto(BASE + route, { waitUntil: "load", timeout: 90_000 });
        await page.waitForTimeout(7_000);
        const a = await page.evaluate(collect);
        await page.waitForTimeout(1_500);
        const b = await page.evaluate(collect);
        facts = b;
        // الحركة مقيسة لا مفترضة: مصفوفة التحويل تغيّرت بين قراءتين.
        if (a.ticker && b.ticker) moving = a.ticker.transform !== b.ticker.transform;
        await page.screenshot({ path: join(OUT, `${tag}.png`) });
      } catch (e) {
        consoleErrors.push(`snapshot: ${String(e).slice(0, 200)}`);
      }
      report.shots.push({
        tag,
        route,
        viewport: vp.tag,
        theme,
        facts,
        tickerMoving: moving,
        consoleErrors,
        failed,
      });
      console.log(
        JSON.stringify({
          tag,
          tickerMoving: moving,
          facts,
          consoleErrors: consoleErrors.length,
          failed: failed.slice(0, 8),
        }),
      );
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
writeFileSync(join(OUT, "facts.json"), JSON.stringify(report, null, 2));
console.log(`لقطات: ${report.shots.length} — ${OUT}/facts.json`);
