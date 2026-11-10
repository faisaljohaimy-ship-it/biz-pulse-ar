#!/usr/bin/env node
/**
 * فحص الإنتاج — التحقق الميداني على الموقع الحيّ.
 *
 * لماذا هذا الملف موجود
 * بيئة التطوير محجوبة عن النطاق المنشور بسياسة خروج شبكية، فكل ما يُقال عن
 * الإنتاج كان استنتاجًا من البناء المحلي لا مشاهدةً. خوادم CI شبكتها مفتوحة،
 * فينتقل التحقق إلى حيث يمكن أن يقع فعلًا.
 *
 * ما يفحصه — وكلٌّ منها عطل وقع أو كاد يقع في هذا المشروع:
 *   ① الوصول والحالة: النشر قد ينجح والموقع يردّ 500.
 *   ② سكربت الثيم في HTML المُقدَّم من الخادم: إن غاب، لا يثبت الوضع الداكن
 *     في الإنتاج مهما عمل محليًّا (المادة ٣٢).
 *   ③ لا اسم تجاري متقاعد في الصفحة المُقدَّمة: حارس العلامة يفحص المصدر،
 *     وهذا يفحص ما يراه الزائر فعلًا.
 *   ④ الأصول الحرجة تُقدَّم: صفحة تعمل بأنماط مفقودة ليست صفحة تعمل.
 *
 * الاستعمال
 *   PRODUCTION_URL=https://example.com node scripts/check-production.mjs
 *   ROUTES=/,/sec  PRODUCTION_URL=…  node scripts/check-production.mjs
 *
 * رمز الخروج: 0 إن صمد كل حدّ، 1 إن سقط واحد.
 */
const BASE = (process.env.PRODUCTION_URL || "").replace(/\/$/, "");
const ROUTES = (process.env.ROUTES || "/,/sec,/sec/governance").split(",").filter(Boolean);
const ATTEMPTS = Number(process.env.ATTEMPTS || 5);

if (!BASE) {
  console.error("PRODUCTION_URL غير محدَّد — لا شيء يُفحص.");
  process.exit(1);
}

/** أسماء متقاعدة لا يجوز ظهورها للزائر (المادة ١). */
const RETIRED = [
  /NEXIUOS/i,
  /NEEXIOS/i,
  /\bNexus AI OS\b/i,
  /نكسيوس/,
  /نيكسيوس/,
  /مِرْقَب/,
  /منصة إنجاز الأعمال/,
];

/**
 * النشر ينتشر على الحافة تدريجيًّا؛ محاولة واحدة تقيس التوقيت لا الصحّة.
 * التراجع الأسّي يفرّق بين "لم ينتشر بعد" و"معطوب".
 */
async function fetchWithRetry(url) {
  let last;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      // A redirect to login/SSO is not proof the requested production route works.
      // Even a final HTTP 200 with valid CSS/theme could be the login page.
      // Require a direct success for the exact path under test.
      const res = await fetch(url, {
        redirect: "manual",
        headers: { "user-agent": "sadeed-production-check" },
        // A stalled network or response body must not hang the release gate.
        // Node 22 fetch observes this signal during headers and body reads.
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return res;
      last = `HTTP ${res.status}`;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
    if (i < ATTEMPTS - 1) {
      const wait = 2 ** i * 3000;
      console.log(`   … المحاولة ${i + 1} فشلت (${last}) — انتظار ${wait / 1000}ث`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(last);
}

const failures = [];
const rows = [];

for (const route of ROUTES) {
  const url = BASE + route;
  try {
    const res = await fetchWithRetry(url);
    const html = await res.text();
    // An HTTP 200 JSON, plain-text maintenance response, or Vercel SSO wall
    // is not evidence that the requested application HTML rendered.
    const contentType = res.headers.get("content-type") || "";
    const isHtml = /\btext\/html\b/i.test(contentType) && /<html\b/i.test(html);
    const isLoginWall =
      /<title\b[^>]*>\s*(?:Authentication Required|Vercel Authentication)[^<]*<\/title>/i.test(
        html,
      );

    // الاختيار في `sessionStorage` منذ ٢٠٢٦/١٠/٢٤ (الداكن افتراضًا دائمًا): السكربت المانع يقرؤه منه لا من `localStorage`.
    // Only executable script elements count as theme-bootstrap evidence.
    // Comments, templates and textarea content are inert, even when they quote JS.
    const uncommentedHtml = html.replace(/<!--[\s\S]*?-->/g, "");
    const nonInertHtml = uncommentedHtml.replace(
      /<(template|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      "",
    );
    const themeScript = [
      ...nonInertHtml.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script\s*>/gi),
    ].some(([, openingTag, body]) => {
      // A script data block (e.g. JSON-LD, importmap or text/plain) is inert.
      // Requiring a runnable script avoids a false production-ready result.
      const typeMatch = openingTag.match(/\stype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const type = (typeMatch?.[1] ?? typeMatch?.[2] ?? typeMatch?.[3] ?? "").trim().toLowerCase();
      const executable =
        !typeMatch ||
        type === "module" ||
        /^(?:text|application)\/(?:java|ecma)script(?:\s*;.*)?$/.test(type) ||
        type === "text/x-javascript" ||
        type === "application/x-javascript";
      return executable && /sessionStorage\.getItem\(['"]theme['"]\)/.test(body);
    });
    // النطاق `neexios.com` معرّف تقني (رابط · بريد · بيانات منظَّمة) لا اسم
    // معروض، وهو مُستثنى صراحةً في حارس العلامة على المصدر. يُنزع قبل المسح
    // وإلا رسب كل مسار على ذكر رابطه القانوني. أما `NEEXIOS` في نصّ مرئي
    // فيبقى رسوبًا — الاستثناء للنطاق وحده لا للكلمة.
    const scanned = html.replace(/(?:https?:\/\/)?(?:[\w-]+\.)*neexios\.com/gi, "«DOMAIN»");
    const retired = RETIRED.filter((re) => re.test(scanned)).map(String);
    // الصفحة المُقدَّمة يجب أن تشير إلى ورقة أنماط واحدة على الأقل.
    // A textual '.css' mention (e.g. in JSON or a script) is not a stylesheet.
    // Require an actual stylesheet link with a nonempty href.
    // HTML comments and inert containers can quote link markup without loading CSS.
    // Only a live stylesheet element is evidence that the application is styled.
    const activeMarkup = nonInertHtml.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
    const stylesheetLinks = [
      ...activeMarkup.matchAll(
        /<link\b(?=[^>]*\brel\s*=\s*["']stylesheet["'])(?=[^>]*\bhref\s*=\s*["'][^"']+["'])[^>]*>/gi,
      ),
    ].map(([tag]) => tag);
    const hasCss = stylesheetLinks.length > 0;

    if (!isHtml) failures.push(`${route}: الاستجابة ليست مستند HTML صالحًا للتطبيق`);
    if (isLoginWall) failures.push(`${route}: صفحة توثيق Vercel ليست نجاحًا لمسار التطبيق`);
    if (!themeScript) failures.push(`${route}: سكربت الثيم المانع غائب من HTML المُقدَّم`);
    if (retired.length) failures.push(`${route}: اسم متقاعد ظاهر — ${retired.join(" · ")}`);
    if (!hasCss) failures.push(`${route}: لا ورقة أنماط في الصفحة المُقدَّمة`);

    // A link tag is not proof its referenced stylesheet is actually served.
    // Probe the same-origin asset without following redirects or sending credentials.
    let cssLoaded = false;
    if (hasCss) {
      // Font CDNs may precede the application's own CSS. Never count an
      // external link as proof, but do inspect later same-origin stylesheets.
      let reason = "no same-origin stylesheet";
      for (const tag of stylesheetLinks) {
        try {
          const href = tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
          if (!href) continue;
          const stylesheetUrl = new URL(href, url);
          if (stylesheetUrl.origin !== new URL(BASE).origin) continue;
          const stylesheetRes = await fetchWithRetry(stylesheetUrl.href);
          const isCss = /\btext\/css\b/i.test(stylesheetRes.headers.get("content-type") || "");
          await stylesheetRes.body?.cancel();
          if (isCss) {
            cssLoaded = true;
            break;
          }
          reason = "stylesheet response is not text/css";
        } catch (error) {
          reason = error instanceof Error ? error.message : String(error);
        }
      }
      if (!cssLoaded) failures.push(route + ": تعذّر تحميل ملف الأنماط — " + reason);
    }

    rows.push({
      route,
      status: res.status,
      bytes: html.length,
      theme: themeScript ? "✓" : "✗",
      brand: retired.length ? "✗" : "✓",
      css: cssLoaded ? "✓" : "✗",
    });
  } catch (e) {
    failures.push(`${route}: تعذّر الوصول — ${e instanceof Error ? e.message : e}`);
    rows.push({ route, status: "—", bytes: 0, theme: "✗", brand: "✗", css: "✗" });
  }
}

console.log(`\nفحص الإنتاج — ${BASE}\n`);
console.log("المسار".padEnd(14) + "الحالة".padEnd(9) + "بايت".padEnd(10) + "ثيم  علامة  أنماط");
for (const r of rows) {
  console.log(
    String(r.route).padEnd(14) +
      String(r.status).padEnd(9) +
      String(r.bytes).padEnd(10) +
      ` ${r.theme}     ${r.brand}      ${r.css}`,
  );
}

if (failures.length) {
  console.error(`\n✗ سقط ${failures.length} حدّ:`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`\n✓ ${rows.length} مسارًا: كل الحدود صامدة على الموقع الحيّ.`);
