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
      // GET release evidence must be complete. A 206 Partial Content response
      // can carry a plausible HTML/CSS fragment while omitting critical bytes.
      if (res.status === 200) return res;
      // Failed or partial streaming responses can hold open network sockets.
      // Release their bodies before retrying another request.
      // Do not let an uncooperative stream cancellation stall the release gate.
      // The fetch AbortSignal still bounds the underlying network request.
      try {
        void res.body?.cancel().catch(() => {});
      } catch {
        // A locked/broken stream must not suppress the original HTTP failure.
      }
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

// Inspect actual script attributes, not tokens buried inside quoted metadata.
// Browsers honor the first duplicate attribute; absent/empty type is classic JS.
function tagAttributes(tag, start) {
  const attrs = Object.create(null);
  const attr = /\s+([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gy;
  let pos = start;
  while (pos < tag.length) {
    attr.lastIndex = pos;
    const match = attr.exec(tag);
    if (!match) break;
    const name = match[1].toLowerCase();
    if (!(name in attrs)) attrs[name] = match[2] ?? match[3] ?? match[4] ?? "";
    pos = attr.lastIndex;
  }
  return attrs;
}
function scriptAttributes(tag) {
  return tagAttributes(tag, 7); // Skip "<script".
}

// Read actual link attributes, not lookalike tokens inside quoted values.
// Browsers keep the first instance of a duplicated HTML attribute.
function stylesheetHref(tag) {
  const attrs = tagAttributes(tag, 5); // Skip "<link".
  // A disabled or print-only link may load HTTP 200 text/css but cannot style
  // the interactive screen. Do not count it as production CSS evidence.
  const media = (attrs.media || "").trim().toLowerCase();
  // HTML link relations are ASCII-insensitive whitespace-separated tokens.
  // Alternate stylesheets are opt-in and cannot prove active app styling.
  const relTokens = (attrs.rel || "").toLowerCase().trim().split(/\s+/);
  if (!relTokens.includes("stylesheet") || relTokens.includes("alternate")) return null;
  // A non-CSS type prevents browsers from applying the link as a stylesheet.
  // Missing/empty type remains valid; retain optional MIME parameters.
  const linkType = (attrs.type || "").trim().toLowerCase();
  if (linkType && linkType.split(";")[0].trim() !== "text/css") return null;
  // `not all` never matches a browser media type: its CSS cannot style the UI.
  // Lists are OR-combined. Reject print/speech-only queries and bare
  // `not screen`/`not all`, but NOT `not screen and (color)`: `not` negates
  // the entire feature query, which can match a monochrome screen.
  const nonScreenQuery = (query) =>
    /^(?:(?:only\s+)?(?:print|speech)(?:\s+and\b|$)|not\s+(?:all|screen)$)/.test(query.trim());
  const inactiveMedia = media !== "" && media.split(",").every(nonScreenQuery);
  if ("disabled" in attrs || inactiveMedia) return null;
  // HTML parses character references in href before the browser fetches CSS.
  // Decode one layer of common ampersand references in query strings so the
  // release probe requests the same URL as the browser, not a literal &amp;.
  return attrs.href?.trim() ? attrs.href.replace(/&(?:amp|#0*38|#x0*26);/gi, "&") : null;
}

// A textual theme call in a JS comment or string does not initialize the UI.
// Scan only executable-looking code; preserve quoted URL strings (including //)
// instead of stripping comments with a regex that would hide valid statements.
function hasExecutableThemeBootstrap(body) {
  // Template literal text is inert, but JavaScript evaluates the expressions
  // between interpolation braces. Track nested templates and expression braces
  // so executable theme reads do not become false production-gate failures.
  const contexts = [{ type: "code" }];
  for (let i = 0; i < body.length; i++) {
    const current = contexts[contexts.length - 1];
    const ch = body[i];
    const next = body[i + 1];

    if (current.type === "template") {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === "`") {
        contexts.pop();
        continue;
      }
      if (ch === "$" && next === "{") {
        contexts.push({ type: "expression", depth: 1 });
        i++;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      i = body.indexOf("\n", i + 2);
      if (i === -1) break;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = body.indexOf("*/", i + 2);
      if (end === -1) break;
      i = end + 1;
      continue;
    }
    // Regex literal source is inert just like a quoted string. Without this,
    // /sessionStorage.getItem('theme')/ can falsely certify a broken page.
    // Distinguish regex from division using the preceding token; a genuine
    // sessionStorage call after arithmetic division must still be recognized.
    if (ch === "/" && next !== "/" && next !== "*") {
      const prefix = body.slice(0, i).trimEnd();
      const preceding = prefix.at(-1);
      const startsRegex =
        prefix.length === 0 ||
        (preceding !== undefined && "=(:,[{!?;+*%&|^~<>".includes(preceding)) ||
        /\b(?:return|throw|yield|case|await)$/.test(prefix);
      if (startsRegex) {
        let inCharacterClass = false;
        let regexpEnd = -1;
        for (let end = i + 1; end < body.length; end++) {
          if (body[end] === "\\") {
            end++; // Escape may hide a slash, bracket, or delimiter.
          } else if (body[end] === "[") {
            inCharacterClass = true;
          } else if (body[end] === "]") {
            inCharacterClass = false;
          } else if (body[end] === "/" && !inCharacterClass) {
            regexpEnd = end;
            break;
          } else if (body[end] === "\n") {
            break; // A JavaScript regexp cannot span an unescaped newline.
          }
        }
        if (regexpEnd !== -1) {
          i = regexpEnd;
          continue;
        }
      }
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      while (i < body.length && body[i] !== quote) {
        if (body[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (ch === "`") {
      contexts.push({ type: "template" });
      continue;
    }
    if (current.type === "expression") {
      if (ch === "{") {
        current.depth++;
        continue;
      }
      if (ch === "}") {
        current.depth--;
        if (current.depth === 0) contexts.pop();
        continue;
      }
    }
    if (
      (i === 0 || !/[\w$.]/.test(body[i - 1])) &&
      /^sessionStorage\.getItem\((['"])theme\1\)/.test(body.slice(i))
    ) {
      return true;
    }
  }
  return false;
}

// HTML decodes character references in attribute values before applying
// http-equiv=refresh. Decode one layer to match browser redirect semantics.
function decodeMetaAttribute(value) {
  return value.replace(/&(?:#(x[0-9a-f]+|\d+);?|(?:semi|tab|newline);)/gi, (entity, numeric) => {
    if (!numeric) {
      const names = { semi: ";", tab: "\t", newline: "\n" };
      return names[entity.slice(1, -1).toLowerCase()] ?? entity;
    }
    const hex = numeric[0].toLowerCase() === "x";
    const code = Number.parseInt(hex ? numeric.slice(1) : numeric, hex ? 16 : 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
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
    // A noscript fallback does not style the JavaScript-enabled app.
    // Count only stylesheets that are active when the theme bootstrap runs.
    const nonInertHtml = uncommentedHtml.replace(
      /<(template|textarea|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      "",
    );
    const themeScript = [
      ...nonInertHtml.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script\s*>/gi),
    ].some(([, openingTag, body]) => {
      // A script data block (e.g. JSON-LD, importmap or text/plain) is inert.
      // Requiring a runnable script avoids a false production-ready result.
      const scriptAttrs = scriptAttributes(openingTag);
      // Modern browsers skip nomodule fallbacks; they cannot prove theme initialization.
      if ("nomodule" in scriptAttrs) return false;
      const type = (scriptAttrs.type ?? "").trim().toLowerCase();
      const executable =
        !("type" in scriptAttrs) ||
        type === "" ||
        type === "module" ||
        /^(?:text|application)\/(?:java|ecma)script(?:\s*;.*)?$/.test(type) ||
        type === "text/x-javascript" ||
        type === "application/x-javascript";
      return executable && !("src" in scriptAttrs) && hasExecutableThemeBootstrap(body);
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
    // An attribute must begin after whitespace; data-rel/data-href are inert
    // and must never satisfy the production stylesheet readiness gate.
    // A browser immediately leaves pages containing an active HTML meta refresh.
    // A 200 response from that page does not prove the requested route is usable.
    // Read actual attributes, not lookalikes in metadata or inert containers.
    const immediateMetaRefresh = [...activeMarkup.matchAll(/<meta\b[^>]*>/gi)].some(([tag]) => {
      const attrs = tagAttributes(tag, 5); // Skip "<meta".
      if (
        decodeMetaAttribute(attrs["http-equiv"] || "")
          .trim()
          .toLowerCase() !== "refresh"
      ) {
        return false;
      }
      const delay = /^(\d+(?:\.\d+)?)(?:\s*;|$)/.exec(
        decodeMetaAttribute(attrs.content || "").trim(),
      );
      return delay !== null && Number(delay[1]) <= 5;
    });
    if (immediateMetaRefresh) {
      failures.push(route + ": الصفحة تحوّل أو تعيد التحميل تلقائيًا عبر meta refresh");
    }
    const stylesheetLinks = [...activeMarkup.matchAll(/<link\b[^>]*>/gi)]
      .map(([tag]) => stylesheetHref(tag))
      .filter(Boolean);
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
      for (const href of stylesheetLinks) {
        try {
          const stylesheetUrl = new URL(href, url);
          if (stylesheetUrl.origin !== new URL(BASE).origin) continue;
          const stylesheetRes = await fetchWithRetry(stylesheetUrl.href);
          const isCss = /\btext\/css\b/i.test(stylesheetRes.headers.get("content-type") || "");
          // An empty text/css response is not application styling. Verify the
          // body rather than trusting only status and a Content-Type header.
          const cssText = isCss ? await stylesheetRes.text() : "";
          if (!isCss) await stylesheetRes.body?.cancel();
          // An all-comment CSS file cannot style the app; MIME and bytes alone are insufficient.
          // A CSS encoding declaration cannot style an application by itself.
          // Preserve legitimate style rules that follow that declaration.
          const effectiveCss = cssText
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*@charset\s+(?:"[^"]*"|'[^']*')\s*;\s*/i, "")
            .trim();
          if (isCss && effectiveCss.length > 0) {
            cssLoaded = true;
            break;
          }
          reason = isCss ? "stylesheet response is empty" : "stylesheet response is not text/css";
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
