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
const ROUTES = (process.env.ROUTES || "/,/projects,/risk,/sadeed,/sec").split(",").filter(Boolean);
const STRICT_CONSOLE = process.env.STRICT_CONSOLE === "1";
const SETTLE_MS = Number(process.env.SETTLE_MS || 2600);

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
        if (fs < minFont && smallText.length < 8) {
          smallText.push({
            fs: Math.round(fs * 10) / 10,
            tag: el.tagName,
            text: ownText.slice(0, 44),
          });
        }
      }
    }

    const isControl =
      el.matches("button, a[href], [role='button'], [role='tab'], input, select, textarea") &&
      !el.hasAttribute("disabled") &&
      cs.pointerEvents !== "none";
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

  return {
    minFont: min === Infinity ? null : min,
    smallText,
    smallTargets,
    // scrollWidth beyond clientWidth is the definition of a page that scrolls
    // sideways — the single most reported mobile defect.
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
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
      const r = await page.evaluate(collect, { minFont: MIN_FONT, minTarget });
      rows.push({ vp: vp.name, touch: vp.touch, route, minTarget, ...r, errors, webgl });
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
  r.overflow > 0 ||
  r.smallText.length > 0 ||
  r.smallTargets.length > 0 ||
  r.webgl.length > 0 ||
  (STRICT_CONSOLE && r.errors.length > 0);

const broken = rows.filter(fail);

console.log(`\nUI audit — ${BASE}`);
console.log(
  `${VIEWPORTS.length} viewports × ${ROUTES.length} routes = ${rows.length} combinations`,
);
console.log(
  `floors: text ≥${MIN_FONT}px · targets ≥${MIN_TARGET_TOUCH}px touch / ≥${MIN_TARGET_MOUSE}px mouse\n`,
);

const head = ["viewport", "route", "minFont", `<${MIN_FONT}px`, "small", "ovf", "err", "webgl"];
console.log(
  head[0].padEnd(18) +
    head[1].padEnd(12) +
    head[2].padStart(8) +
    head[3].padStart(8) +
    head[4].padStart(7) +
    head[5].padStart(5) +
    head[6].padStart(5) +
    head[7].padStart(7),
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
    if (r.overflow > 0) console.log(`  · horizontal overflow: ${r.overflow}px`);
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
