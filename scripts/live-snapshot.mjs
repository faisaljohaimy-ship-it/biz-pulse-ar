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
 *   SHARE_URL=<رابط مشاركة Vercel لمعاينةٍ محميّة> (اختياري — يُفتح أوّلًا فيضع ملفّ الدخول)
 *   RECORD=1 (اختياري — تسجيلٌ للرئيسية دورةً كاملة من فيلم البانر)
 *
 * **وفيلم البانر يُقاس حيث وُجد** (٢٠٢٦/١٠/١٨): المصدر المختار، وتقدّم الزمن، وفصل النصّ
 * (`data-film-act`)، وما يحدث بعد نهايته — ولقطةٌ للبانر عند كل مشهد بالقفز إليه. ومنذ R4 يُعرض
 * الفيلم مرّةً ثم يقف على اللوحة في فصل «الجوهرة»، فالنهاية تُقرأ `ended` و`act` لا التفافًا.
 *
 * **وعلامات الإصدار** (`markers`): بناء Lovable بلا معرّف (`build=unknown`)، فلا يقول الفحص أيّ
 * إصدارٍ يُخدَم إلا بما يُرى منه — رابط «دخول الموظفين» (R3)، واتّجاه لمعة اللوحة ودورتها، و`loop`
 * الفيلم، ومصادر موسيقاه وزرّها، وطبقة الجوهرة (R4). شواهد تُطبع كما قِيست، لا أحكام.
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
const SHARE_URL = process.env.SHARE_URL || "";
/**
 * مشاهد فيلم البانر (ث) — من `remotion/brand/film/timeline.ts`: اشتعال · مونتاج (أربع لقطات) ·
 * تقارب · ليزر · مسحٌ يبني الرمز · إشعاع · تثبيت اللوحة · لمعانٌ ختاميّ. **وآخرها قبل 23.2:** بين
 * قفزةٍ والتي تليها 0.8 ث انتظارًا ثم قراءةٌ ثم لقطة (واللقطة قد تتجاوز نصف ثانية على CI)، والفيلم
 * منذ R4 يُعرض مرّةً — فقد يبلغ نهايته قبل فحصها. لذا لا يُقفز بفيلمٍ انتهى، ويُقرأ `end` من حدث
 * `ended` لا من نومٍ ثابت: قفزٌ إلى 23.4 بعد النهاية يترك فيلمًا متوقّفًا لا ينتهي فيكذب `end`
 * (أمسكته المراجعة مرّتين).
 */
const FILM_SCENES = [0.3, 2, 6, 10, 14, 16.2, 17.6, 19, 19.8, 21.8, 22.8];

/** يفتح رابط المشاركة مرّةً في السياق فيحمل كل طلبٍ بعده ملفّ الدخول — لا شيء بدونه. */
async function admit(ctx) {
  if (!SHARE_URL) return;
  const page = await ctx.newPage();
  try {
    await page.goto(SHARE_URL, { waitUntil: "load", timeout: 90_000 });
  } finally {
    await page.close();
  }
}

/** فيلم البانر في الصفحة الحيّة: يُشغَّل؟ يتقدّم؟ يلتفّ؟ ويُصوَّر كل مشهد. */
async function probeFilm(page, tag) {
  if (!(await page.$(".nx-brand-film"))) return null;
  const ready = await page
    .waitForSelector(".nx-brand-film[data-ready]", { timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  const read = () =>
    page.evaluate(() => {
      const v = document.querySelector(".nx-brand-film");
      const copy = document.querySelector(".nx-brand-copy");
      return v
        ? {
            src: (v.currentSrc || "").split("/").pop(),
            t: Math.round(v.currentTime * 100) / 100,
            paused: v.paused,
            act: document.querySelector(".nx-brand-art")?.getAttribute("data-film-act") ?? null,
            copyOpacity: copy ? Number(getComputedStyle(copy).opacity) : null,
          }
        : null;
    });
  const first = await read();
  await page.waitForTimeout(1_500);
  const second = await read();
  const scenes = [];
  const stage = page.locator(".nx-brand-stage");
  for (const at of FILM_SCENES) {
    await page.evaluate((s) => {
      const v = document.querySelector(".nx-brand-film");
      if (v) v.currentTime = s;
    }, at);
    await page.waitForTimeout(800);
    const st = await read();
    await stage.screenshot({ path: join(OUT, `${tag}-film-${String(at).replace(".", "_")}s.png`) });
    scenes.push({ at, ...st });
  }
  // بعد النهاية: الفيلم يقف (`ended`) والفصل «الجوهرة» — أو يلتفّ إن كان الإصدار المخدوم أقدم
  // (فلا `ended` له، ويُقرأ بعد 1.6 ث من القفز كما كان).
  const end = await page.evaluate(
    () =>
      new Promise((done) => {
        const v = document.querySelector(".nx-brand-film");
        if (!v) return done(null);
        const report = () => done({ ended: v.ended, loop: v.loop });
        if (v.ended) return report();
        v.addEventListener("ended", report, { once: true });
        v.currentTime = 23.4;
        setTimeout(report, v.loop ? 1_600 : 3_000);
      }),
  );
  const wrap = await read();
  return {
    ready,
    first,
    advancing: first && second ? second.t > first.t : null,
    scenes,
    looped: wrap ? wrap.t < 3 && !wrap.paused : null,
    wrap,
    end,
  };
}

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
  const firstItem = track ? track.querySelector(".nx-ticker-item") : null;
  const plateImg = q('img[src*="/brand/sadeed-plate"], img[srcset*="/brand/sadeed-plate"]');
  const plateLink = plateImg ? plateImg.closest("a") : null;
  // صورة البطاقة لا العلامة المائية الخلفية (الصورة نفسها، مكبّرةً وخافتة خلف كل صفحة).
  const persona = [...document.querySelectorAll('img[src*="sadeed-portrait"]')].find(
    (img) => !img.closest(".aria-watermark"),
  );
  const banner = q(".nx-brand-poster");
  const kpi = q(".nx-home-kpi-cell");
  const nav = q(".nx-sysnav");
  const icons = [
    ...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]'),
  ].map((l) => l.getAttribute("href"));
  // علامات الإصدار — ما يميّز R3 وR4 مرئيًّا (انظر رأس الملف).
  const login = q('a[href^="/auth"]');
  const sheen = q(".nx-plate-sheen");
  const sheenStyle = sheen ? getComputedStyle(sheen, "::after") : null;
  const film = q(".nx-brand-film");
  const audio = q(".nx-brand audio");
  const sound = [...document.querySelectorAll(".nx-brand button")].find((b) =>
    /الموسيقى|music/i.test(b.getAttribute("aria-label") ?? b.textContent ?? ""),
  );
  const jewel = q('.nx-brand-art [class*="jewel"]');
  const markers = {
    login: login ? { text: login.textContent.trim(), href: login.getAttribute("href") } : null,
    plateSheen: sheenStyle
      ? {
          name: sheenStyle.animationName,
          duration: sheenStyle.animationDuration,
          direction: sheenStyle.animationDirection,
          iterations: sheenStyle.animationIterationCount,
        }
      : null,
    filmLoop: film ? film.loop : null,
    audio: audio
      ? {
          sources: [...audio.querySelectorAll("source")].map((s) =>
            (s.getAttribute("src") ?? "").split("/").pop(),
          ),
          paused: audio.paused,
        }
      : null,
    sound: sound
      ? { label: sound.getAttribute("aria-label"), pressed: sound.getAttribute("aria-pressed") }
      : null,
    jewel: jewel ? { className: jewel.className, rect: rect(jewel) } : null,
  };
  return {
    markers,
    title: document.title,
    dir: document.documentElement.getAttribute("dir"),
    theme: document.documentElement.className,
    ticker: ticker
      ? {
          rect: rect(ticker),
          paused: ticker.hasAttribute("data-paused"),
          running: track ? track.hasAttribute("data-run") : false,
          // الحركة على خاصيّة `translate` المستقلّة لا `transform` — هذه تبقى "none" وإن
          // جرى الشريط (قِيس ٢٠٢٦/١٠/١٨: قراءتها أعطت «ساكن» لشريطٍ يتحرّك). فالحكم
          // بموضع أوّل عنصرٍ مرسومًا، والقيمة المحسوبة شاهدٌ معه.
          translate: track ? getComputedStyle(track).translate : null,
          firstX: firstItem ? Math.round(firstItem.getBoundingClientRect().x * 10) / 10 : null,
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
    await admit(ctx);
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
      let film = null;
      try {
        await page.goto(BASE + route, { waitUntil: "load", timeout: 90_000 });
        await page.waitForTimeout(7_000);
        // الشريط لا يبدأ قبل الترطيب والقياس (`[data-run]`)؛ فالقراءة قبله تقيس سرعة
        // الترطيب لا الحركة. يُنتظر حتى 20 ث حيث يوجد الشريط، ويبقى الغياب حقيقةً تُطبع.
        if (await page.$(".nx-ticker-track")) {
          await page
            .waitForSelector(".nx-ticker-track[data-run]", { timeout: 20_000 })
            .catch(() => {});
        }
        const a = await page.evaluate(collect);
        await page.waitForTimeout(1_500);
        const b = await page.evaluate(collect);
        facts = b;
        // الحركة مقيسة لا مفترضة: موضع أوّل عنصرٍ تغيّر بين قراءتين.
        if (a.ticker && b.ticker && a.ticker.firstX !== null && b.ticker.firstX !== null) {
          moving = a.ticker.firstX !== b.ticker.firstX;
        }
        await page.screenshot({ path: join(OUT, `${tag}.png`) });
        if (route === "/" && theme === "light") film = await probeFilm(page, tag);
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
        film,
        consoleErrors,
        failed,
      });
      console.log(
        JSON.stringify({
          tag,
          tickerMoving: moving,
          film,
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
// تسجيلٌ لدورةٍ كاملة من فيلم البانر على الرئيسية — شاهدٌ للعين لا رقم.
if (process.env.RECORD === "1") {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: "ar-SA",
    reducedMotion: "no-preference",
    recordVideo: { dir: join(OUT, "recording"), size: { width: 1280, height: 720 } },
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("theme", "light");
      localStorage.setItem("locale", "ar");
    } catch {
      /* بلا تفضيل */
    }
  });
  await admit(ctx);
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 90_000 });
    await page.waitForSelector(".nx-brand-film[data-ready]", { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(26_000);
    report.recording = true;
  } catch (e) {
    report.recording = `failed: ${String(e).slice(0, 160)}`;
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, "facts.json"), JSON.stringify(report, null, 2));
console.log(`لقطات: ${report.shots.length} — ${OUT}/facts.json`);
