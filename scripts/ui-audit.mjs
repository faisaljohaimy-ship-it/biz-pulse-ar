#!/usr/bin/env node
/**
 * UI audit — measures the readability, touch and stability floors on a RUNNING
 * app, across the full device matrix.
 *
 * WHY A SCRIPT AND NOT A UNIT TEST
 * These properties only exist after layout: a font size can be overridden by a
 * parent, a button's real hit area depends on padding and flex, and horizontal
 * overflow is a property of the composed page, not of any component. None of it
 * is visible to `tsc`, to eslint, or to jsdom. It has to be measured in a real
 * engine at a real viewport, which is what this does.
 *
 * USAGE
 *   node scripts/ui-audit.mjs                          # against a local dev server
 *   BASE_URL=https://neexios.com node scripts/ui-audit.mjs
 *   ROUTES=/,/risk BASE_URL=… node scripts/ui-audit.mjs
 *   THEME=light node scripts/ui-audit.mjs             # ثم THEME=dark — المادة ٣٣
 *
 * EXIT CODE
 *   0 — every hard floor held
 *   1 — at least one floor broke (the offending rows are printed first)
 *
 * The console check is advisory by default, because a deployment pointed at an
 * unreachable backend produces resource errors that have nothing to do with the
 * UI. Set STRICT_CONSOLE=1 to make it a hard failure once the environment is
 * known-good.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const ROUTES = (process.env.ROUTES || "/,/projects,/sec/governance,/sadeed,/sec")
  .split(",")
  .filter(Boolean);
const STRICT_CONSOLE = process.env.STRICT_CONSOLE === "1";
/**
 * الوضع الذي يُقاس فيه: `dark` · `light` · أو الافتراضي (ما يقرّره النظام).
 * المادتان ٣٢–٣٤: الوضع الثاني سطح صحّة لا قشرة، وكل فحص يُشغَّل مرتين.
 * وهو ذو أثر مقيس على الأرضيات: قواعد `.light` تسبق العامة في نوعية
 * المحدِّد، فقد يختلف حجم نصّ أو ارتفاع هدف بالوضع دون أن يظهر في تشغيل
 * واحد. تُزرع القيمة قبل أول رسم بالمفتاح نفسه الذي يقرأه `__root.tsx`.
 */
const THEME = process.env.THEME || "";
const SETTLE_MS = Number(process.env.SETTLE_MS || 2600);
/** كم مرّة يُعاد القياس على صفحة لم تُرسَم بعد قبل الحكم عليها بالفراغ. */
const EMPTY_RETRIES = Number(process.env.EMPTY_RETRIES || 3);

/** The device matrix from the UI brief. `touch` decides which target floor applies. */
const VIEWPORTS = [
  { name: "iPhone-small", width: 375, height: 667, touch: true },
  { name: "iPhone", width: 390, height: 844, touch: true },
  { name: "iPhone-landscape", width: 844, height: 390, touch: true },
  { name: "tablet-portrait", width: 768, height: 1024, touch: true },
  { name: "tablet-landscape", width: 1024, height: 768, touch: true },
  { name: "laptop", width: 1366, height: 768, touch: false },
  { name: "desktop", width: 1440, height: 900, touch: false },
  { name: "fullhd", width: 1920, height: 1080, touch: false },
];

/** Functional text floor. Anything below this is unreadable in the field. */
const MIN_FONT = 12;
/** Target floors differ by pointer: a cursor is precise, a thumb is not. */
const MIN_TARGET_TOUCH = 44;
const MIN_TARGET_MOUSE = 40;

/**
 * Runs inside the page. Deliberately measures only elements that OWN visible
 * text — walking every node and reading its inherited font size would report
 * the size of a wrapper that renders nothing.
 */
// NOTE: Playwright's page.evaluate passes exactly ONE argument through to
// the page context. Two positional params throw "Too many arguments" at
// runtime — they must travel as a single object.
const collect = ({ minFont, minTarget }) => {
  const smallText = [];
  const smallTargets = [];
  let min = Infinity;

  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;

    const ownText = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join("");
    if (ownText) {
      // النصّ داخل SVG لا يُقرأ بحجمه المصرَّح: وحدات viewBox تُقاس ثم
      // تُمدَّد بمقياس الرسم. وردة المناطق على الرئيسية viewBox 260 تُرسم
      // في 343–430px، فـ 10.5px مصرَّحة تظهر 13.85–17.37px مقيسة — فوق
      // الأرضية لا تحتها. كان هذا الفحص يقرأ المصرَّح وحده فيُسقط أربع
      // لافتات سليمة في كل مقاس (٨ من ٣٢ تركيبة)، ويُخفي في الوقت نفسه
      // نصًّا صغيرًا حقيقيًّا داخل SVG مصغَّر — العطل في الاتجاهين.
      // مقياس الرسم يؤخذ من محدِّد الشاشة: جذر المحدِّد التربيعي لقيمته
      // يعطي المقياس المتماثل ولو صاحبه دوران.
      let scale = 1;
      if (el.ownerSVGElement && typeof el.getScreenCTM === "function") {
        const m = el.getScreenCTM();
        if (m) {
          const s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
          if (s > 0 && Number.isFinite(s)) scale = s;
        }
      }
      const fs = parseFloat(cs.fontSize) * scale;
      if (fs) {
        if (fs < min) min = fs;
        // **هامش الكسر دون البكسل — والأرضية لم تُمسّ.**
        // Recharts يكتب على الـSVG عرضًا صحيحًا (‎width="301"‎ وviewBox بالعرض
        // نفسه) بينما التخطيط يضعه في ٣٠٠٫٦٥٦px، فيصير مقياس الرسم ٠٫٩٩٨٨٦
        // ويظهر نصٌّ مصرَّح ١٢px بـ‎١١٫٩٨٦px. قُيس هذا فعلًا على /live-dashboard.
        // لا قيمة يكتبها مؤلّف تنجو منه، ولا فرق يراه بشر في ٠٫٠١٤px.
        // فالمقارنة تحتمل ٠٫١px — وهي أقلّ بخمس مرّات من أصغر خطوة يكتبها
        // مؤلّف (نصف بكسل)، فلا تستر خرقًا حقيقيًّا: ١١٫٥px تبقى ساقطة.
        if (fs + 0.1 < minFont && smallText.length < 8) {
          smallText.push({
            fs: Math.round(fs * 10) / 10,
            tag: el.tagName,
            text: ownText.slice(0, 44),
          });
        }
      }
    }

    // **استثناء «داخل النصّ» (WCAG 2.2 §2.5.8).** الرابط الجاري داخل جملة —
    // «…تواصل مع security@neexios.com.» — لا يُعطى صندوقًا ٤٤px إلا بتمزيق
    // الفقرة التي يجري فيها، ولهذا استثناه المعيار نصًّا. وكان الفحص يُسقطه
    // ١٧٦×١٦ في كل مقاس على /security، وهو سليم.
    //
    // والاستثناء مشروط بشرطين معًا لئلّا يتسرّب منه زرّ حقيقي:
    //   ① `display: inline` — فالزرّ المتنكّر رابطًا يكون `inline-flex` أو
    //      `block`، فلا يناله الاستثناء (نحو `.nx-op-cta`).
    //   ② أبوه يحمل نصًّا خاصًّا به حول الرابط — فرابط تنقّل وحيدٌ في `<li>`
    //      ليس «داخل جملة» ويبقى محكومًا بالأرضية.
    const inlineTextLink =
      el.tagName === "A" &&
      cs.display === "inline" &&
      !!el.parentElement &&
      [...el.parentElement.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

    const isControl =
      el.matches("button, a[href], [role='button'], [role='tab'], input, select, textarea") &&
      !el.hasAttribute("disabled") &&
      cs.pointerEvents !== "none" &&
      !inlineTextLink;
    // Measure the UNTRANSFORMED layout box. getBoundingClientRect() folds in
    // CSS transforms, so an entrance animation that opens at scale(0.6) — the
    // orb's `orb-wake` — reports a compliant 44px button as 31px and fails the
    // run on a purely decorative effect. offsetWidth/offsetHeight are the hit
    // area at rest, which is what the touch-target floor is actually about.
    const tw = el.offsetWidth || box.width;
    const th = el.offsetHeight || box.height;
    if (isControl && (tw < minTarget || th < minTarget)) {
      if (smallTargets.length < 8) {
        smallTargets.push({
          tag: el.tagName,
          w: Math.round(tw),
          h: Math.round(th),
          label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 34),
        });
      }
    }
  }

  // ① الصفحة تُمرَّر أفقيًّا: `scrollWidth` يتجاوز `clientWidth`.
  const de = document.documentElement;
  const overflow = de.scrollWidth - de.clientWidth;

  // ② المحتوى مقصوص خارج الشاشة — وهذا ما كان يفلت.
  //
  // القياس الأول وحده يمسك «الصفحة تُمرَّر»، ولا يمسك «الصفحة لا تُمرَّر
  // والمحتوى مقطوع». في RTL يخرج الفائض **يسارًا** فيقع في المنطقة السالبة،
  // وإن كان له سلفٌ بـ`overflow: hidden` فلا يزيد `scrollWidth` أصلًا: لا
  // شريط تمرير ولا رقم — والنصف الأيسر من الصفحة غير موجود على الشاشة.
  // قِيس على هذا السطح فعلًا ٥٣١px مقطوعة على ٣٩٠px والفحص يعطي «✓».
  //
  // **الصياغة الأولى كانت بلا قيمة، وكُشفت بقياس سلبي.** كانت تتجاهل كل
  // عنصر له سلفٌ `overflow` غير `visible` — و`<main>` على هذا السطح يحمل
  // `overflow-hidden`، فأُلغي الفحص كلّه على الصفحة التي وُضع لها: حُقن كسرٌ
  // عرضه 1600px على شاشة 390px فمرّ الفحص أخضر.
  //
  // القاعدة الصحيحة تفرّق بين قاصٍّ وقاصّ:
  //   · `auto`/`scroll` — تمريرٌ مقصود، والمحتوى **يمكن بلوغه**. يُتجاهل.
  //     (حاوية جدول المخاطر منه.)
  //   · `hidden`/`clip` — قصٌّ بلا مخرج: ما خرج **لا يُبلَغ أبدًا**. يُقاس
  //     على صندوق القاصّ نفسه لا على نافذة العرض.
  //
  // وتُقاس **العناصر التي تحمل نصًّا مرئيًّا أو تكون عناصر تحكّم** وحدها:
  // توهّج زخرفيّ يتجاوز بطاقته ليس عطلًا، وفقدُ سطرٍ أو زرٍّ هو العطل.
  const clipperOf = (el) => {
    for (let p = el.parentElement; p && p !== de; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === "auto" || o === "scroll") return { kind: "scroll" };
      if (o === "hidden" || o === "clip") return { kind: "clip", rect: p.getBoundingClientRect() };
    }
    return { kind: "viewport" };
  };

  let clipped = 0;
  let clippedTag = "";
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    const carriesMeaning =
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) ||
      el.matches("button, a[href], input, select, textarea, [role='button'], [role='tab']");
    if (!carriesMeaning) continue;

    // **المتحرّك لا يُحاكَم بلقطة.** شريط القرارات اللافّ يضع عناصره خارج
    // قاصّها في كل لحظة، والحركة هي ما يُدخلها — فقياسها في إطار واحد يعطي
    // آلاف البكسلات «مقصوصة» وهي سليمة. كُشفت هذه بالتشغيل: الحارس أسقط ٧ من
    // ٨ على `.nx-op-decision-agent` وحده. فيُتجاهل ما موضعه دالّة في الزمن —
    // له أو لسلفٍ بينه وبين قاصّه حركةٌ مسمّاة.
    let animated = getComputedStyle(el).animationName !== "none";
    for (let p = el.parentElement; p && !animated && p !== de; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (pcs.animationName !== "none") animated = true;
      if (pcs.overflowX !== "visible") break; // بلغنا القاصّ
    }
    if (animated) continue;

    const c = clipperOf(el);
    if (c.kind === "scroll") continue; // يُبلَغ بالتمرير — تصميم لا عطل
    const left = c.kind === "clip" ? c.rect.left : 0;
    const right = c.kind === "clip" ? c.rect.right : de.clientWidth;
    // عتبة ٤px: كسور التقريب في تخطيط الشبكة ليست عطلًا.
    const past = Math.max(0, r.right - right, left - r.left);
    if (past > 4 && past > clipped) {
      clipped = past;
      clippedTag = `${el.tagName}.${(el.className || "").toString().split(" ")[0]}`;
    }
  }

  return {
    minFont: min === Infinity ? null : min,
    smallText,
    smallTargets,
    overflow,
    clipped: Math.round(clipped),
    clippedTag,
  };
};

/**
 * Playwright resolves its browser by the version it was BUILT against. When the
 * npm package moves ahead of the browsers on disk — a routine drift in CI images
 * and in this container — `launch()` dies with "Executable doesn't exist" and the
 * whole audit is skipped. A quality gate that silently stops running is worse
 * than no gate, so the launcher falls back to any chromium actually present
 * before giving up.
 */
function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers"].filter(Boolean);
  for (const root of roots) {
    let entries;
    try {
      entries = readdirSync(root);
    } catch {
      continue;
    }
    // الأحدث أولًا: chromium-1194 يسبق chromium-1105 بالترتيب العددي لا النصّي.
    const dirs = entries
      .filter((d) => d.startsWith("chromium"))
      .sort((a, b) => (Number(b.split("-")[1]) || 0) - (Number(a.split("-")[1]) || 0));
    for (const d of dirs) {
      for (const rel of ["chrome-linux/chrome", "chrome-linux/headless_shell"]) {
        const candidate = join(root, d, rel);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return undefined; // اترك Playwright يحاول بمساره الافتراضي
}

const browser = await chromium.launch({ executablePath: resolveChromium() });

const rows = [];
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch,
    locale: "ar-SA",
  });
  if (THEME) {
    // يُكتب المفتاح قبل تنفيذ أي سكربت للصفحة، فيلتقطه السكربت المانع في
    // `__root.tsx` ويضع الحالة قبل أول رسم — لا وميض ولا قياس على وضع خاطئ.
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem("theme", t);
      } catch {
        /* التخزين محجوب — يبقى الوضع الافتراضي */
      }
    }, THEME);
  }
  for (const route of ROUTES) {
    const page = await ctx.newPage();
    const errors = [];
    const webgl = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      (/webgl|three\.js|THREE\.|context lost/i.test(t) ? webgl : errors).push(t.slice(0, 150));
    });
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 150)));

    const minTarget = vp.touch ? MIN_TARGET_TOUCH : MIN_TARGET_MOUSE;
    try {
      await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(SETTLE_MS);

      // **الصفحة الفارغة كانت تُعطي ✓.** كل أرضية هنا شرطٌ على ما وُجد: لا
      // نصّ ⇒ لا نصّ تحت ١٢px، لا زرّ ⇒ لا هدف صغير، لا محتوى ⇒ لا قصّ. فحين
      // لا تُرسَم الصفحة أصلًا تمرّ الأربع «سليمة» ويقرأ الجدول `minFont -`
      // بلا علامة. وهذا هو عين العمى الذي كُشف في RTL، في موضع آخر: الفحص
      // يصمت حيث يجب أن يصرخ.
      //
      // ولها في dev سببٌ حميد يجب ألّا يُحسب عطلًا: خادم التطوير يترجم
      // المسار عند أول طلب ثم يعيد التحميل كاملًا (`full-reload`)، فقياسٌ عند
      // ٢٦٠٠ms يقع داخل النافذة الميتة. قِيس على /guide: 63 عقدة عند ٤ ثوانٍ،
      // و٧٢٣ عند ٨.
      //
      // فالتمييز بالإعادة لا بالتراخي: يُعاد القياس ما دامت الصفحة بلا نصّ،
      // فإن نهضت قِيست حقًّا، وإن بقيت فارغة بعد المهل كلّها فهي **عطل
      // معلن** لا نجاح صامت. وضياع سياق التنفيذ أثناء إعادة التحميل يُعاد
      // كذلك بدل أن يُسجَّل FATAL على تنقّلٍ عابر.
      let r = null;
      for (let attempt = 0; attempt <= EMPTY_RETRIES; attempt++) {
        try {
          r = await page.evaluate(collect, { minFont: MIN_FONT, minTarget });
        } catch (e) {
          if (attempt === EMPTY_RETRIES || !/destroyed|navigat/i.test(String(e))) throw e;
          r = null;
        }
        if (r && r.minFont !== null) break;
        if (attempt < EMPTY_RETRIES) await page.waitForTimeout(SETTLE_MS);
      }
      rows.push({
        vp: vp.name,
        touch: vp.touch,
        route,
        minTarget,
        // قيم محايدة تحفظ شكل الصف حين تبقى الصفحة فارغة؛ `minFont` الفارغة
        // وحدها هي ما يُسقط الصف، لا انهيار في الطباعة.
        minFont: null,
        smallText: [],
        smallTargets: [],
        overflow: 0,
        clipped: 0,
        clippedTag: "",
        ...r,
        errors,
        webgl,
      });
    } catch (e) {
      rows.push({ vp: vp.name, route, fatal: String(e).slice(0, 110) });
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();

// ── Report ────────────────────────────────────────────────────────────────
const fail = (r) =>
  r.fatal ||
  // صفحة بلا نصّ مقيس: كل أرضية أخرى فارغة الشرط، فالنجاح هنا نجاح صامت.
  r.minFont == null ||
  r.overflow > 0 ||
  r.clipped > 0 ||
  r.smallText.length > 0 ||
  r.smallTargets.length > 0 ||
  r.webgl.length > 0 ||
  (STRICT_CONSOLE && r.errors.length > 0);

const broken = rows.filter(fail);

console.log(`\nUI audit — ${BASE}${THEME ? ` · theme=${THEME}` : ""}`);
console.log(
  `${VIEWPORTS.length} viewports × ${ROUTES.length} routes = ${rows.length} combinations`,
);
console.log(
  `floors: text ≥${MIN_FONT}px · targets ≥${MIN_TARGET_TOUCH}px touch / ≥${MIN_TARGET_MOUSE}px mouse\n`,
);

const head = [
  "viewport",
  "route",
  "minFont",
  `<${MIN_FONT}px`,
  "small",
  "ovf",
  "clip",
  "err",
  "webgl",
];
console.log(
  head[0].padEnd(18) +
    head[1].padEnd(12) +
    head[2].padStart(8) +
    head[3].padStart(8) +
    head[4].padStart(7) +
    head[5].padStart(5) +
    head[6].padStart(6) +
    head[7].padStart(5) +
    head[8].padStart(7),
);

for (const r of rows) {
  if (r.fatal) {
    console.log(`${r.vp.padEnd(18)}${r.route.padEnd(12)}  FATAL: ${r.fatal}`);
    continue;
  }
  const mark = fail(r) ? " ✗" : "";
  console.log(
    r.vp.padEnd(18) +
      r.route.padEnd(12) +
      String(r.minFont ?? "-").padStart(8) +
      String(r.smallText.length).padStart(8) +
      String(r.smallTargets.length).padStart(7) +
      String(r.overflow).padStart(5) +
      String(r.clipped).padStart(6) +
      String(r.errors.length).padStart(5) +
      String(r.webgl.length).padStart(7) +
      mark,
  );
}

if (broken.length) {
  console.log("\n── failures in detail ──");
  for (const r of broken) {
    if (r.fatal) {
      console.log(`\n${r.vp} ${r.route}: FATAL ${r.fatal}`);
      continue;
    }
    console.log(`\n${r.vp} ${r.route}:`);
    if (r.minFont == null)
      console.log(
        `  · the page rendered no measurable text — every other floor is vacuously true here`,
      );
    if (r.overflow > 0) console.log(`  · horizontal overflow: ${r.overflow}px`);
    if (r.clipped > 0)
      console.log(`  · clipped outside the viewport: ${r.clipped}px — ${r.clippedTag}`);
    for (const s of r.smallText) console.log(`  · text ${s.fs}px <${s.tag}> "${s.text}"`);
    for (const s of r.smallTargets)
      console.log(`  · target ${s.w}×${s.h} (min ${r.minTarget}) <${s.tag}> "${s.label}"`);
    for (const w of r.webgl.slice(0, 2)) console.log(`  · webgl: ${w}`);
    if (STRICT_CONSOLE) for (const e of r.errors.slice(0, 3)) console.log(`  · console: ${e}`);
  }
}

const consoleTotal = rows.reduce((n, r) => n + (r.errors?.length || 0), 0);
if (!STRICT_CONSOLE && consoleTotal > 0) {
  console.log(
    `\nnote: ${consoleTotal} console error(s) observed but NOT failing the run.` +
      ` Re-run with STRICT_CONSOLE=1 once the environment's backend is reachable.`,
  );
}

console.log(
  broken.length
    ? `\n✗ ${broken.length}/${rows.length} combinations broke a floor`
    : `\n✓ all ${rows.length} combinations held every floor`,
);
process.exit(broken.length ? 1 : 0);
