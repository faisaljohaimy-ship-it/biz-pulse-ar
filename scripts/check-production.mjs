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
// Resolve the release target as an origin, never by appending a path to an
// unchecked URL. A hash, query or subpath can silently make /sec/twin probe
// "/" (or an unrelated location) and falsely certify production readiness.
const requestedBase = (process.env.PRODUCTION_URL ?? "").trim();
let BASE;
try {
  const parsedBase = new URL(requestedBase);
  if (
    !["https:", "http:"].includes(parsedBase.protocol) ||
    parsedBase.username !== "" ||
    parsedBase.password !== "" ||
    parsedBase.pathname !== "/" ||
    parsedBase.search !== "" ||
    parsedBase.hash !== "" ||
    requestedBase.includes("?") ||
    requestedBase.includes("#")
  ) {
    throw new Error("not an origin");
  }
  BASE = parsedBase.origin;
} catch {
  console.error(
    "PRODUCTION_URL must be an HTTP(S) origin without a path, query, fragment or credentials.",
  );
  process.exit(1);
}
// A misconfigured empty route list must never report a successful release
// after probing zero pages. Also reject off-site or malformed path entries.
const ROUTES = (process.env.ROUTES ?? "/,/sec,/sec/governance")
  .split(",")
  .map((route) => route.trim());
// A route with a fragment or dot-segment traversal can silently probe a
// different pathname (often just "/") while falsely certifying a critical page.
// Require the requested URL path to survive WHATWG URL normalization unchanged.
// Valid query strings remain supported because they are transmitted to the server.
const ROUTE_VALIDATION_ORIGIN = "https://sadeed-route-validation.invalid";
if (
  ROUTES.some((route) => {
    if (!route.startsWith("/") || route.startsWith("//")) return true;
    try {
      const resolved = new URL(route, ROUTE_VALIDATION_ORIGIN);
      return (
        resolved.origin !== ROUTE_VALIDATION_ORIGIN ||
        resolved.hash !== "" ||
        resolved.pathname + resolved.search !== route
      );
    } catch {
      return true;
    }
  })
) {
  console.error(
    "ROUTES must contain nonempty, unambiguous same-site paths without fragments or traversal.",
  );
  process.exit(1);
}
// An invalid or unbounded retry count must not hang production release checks.
// Keep the default of five attempts; cap explicitly configured retries without
// changing per-request deadlines or weakening the production gate.
const ATTEMPTS = Number(process.env.ATTEMPTS ?? 5);
if (!Number.isSafeInteger(ATTEMPTS) || ATTEMPTS < 1 || ATTEMPTS > 10) {
  console.error("ATTEMPTS must be a whole number from 1 to 10.");
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
  // Decode exactly one layer of character references, as HTML does before
  // resolving the URL. Numeric references can encode path separators too.
  return attrs.href?.trim() ? decodeMetaAttribute(attrs.href) : null;
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
  return value.replace(
    // Named HTML character references are case-sensitive. In attributes,
    // legacy names (such as &amp or &copy) also decode without a semicolon
    // unless followed by an ASCII alphanumeric or '='; other names require ';'.
    // Mixed-case unknown &CoPy; remains literal, never a CSS decoy.
    /&(?:#([xX][0-9a-fA-F]+|\d+);?|(?:amp|AMP|quot|QUOT|lt|LT|gt|GT|copy|COPY|reg|REG|nbsp)(?:;|(?![A-Za-z0-9=]))|(?:semi|Tab|NewLine|sol|colon|period|apos);)/g,
    (entity, numeric) => {
      if (!numeric) {
        const names = {
          amp: "&",
          semi: ";",
          tab: "\t",
          newline: "\n",
          sol: "/",
          colon: ":",
          period: ".",
          // Browsers decode these named references inside quoted HTML hrefs.
          // The decoded byte is part of the asset URL, not an attribute delimiter.
          quot: '"',
          apos: "'",
          lt: "<",
          gt: ">",
          // Valid named HTML references in URLs must be fetched as decoded by browsers.
          // Otherwise a decoy /app&copy;.css can pass while /app%C2%A9.css is missing.
          copy: "©",
          reg: "®",
          nbsp: "\u00a0",
        };
        return names[entity.slice(1).replace(/;$/, "").toLowerCase()] ?? entity;
      }
      const hex = numeric[0].toLowerCase() === "x";
      const code = Number.parseInt(hex ? numeric.slice(1) : numeric, hex ? 16 : 10);
      // The HTML tokenizer remaps legacy C1 numeric references to printable
      // Unicode characters; e.g. &#x80; means EURO SIGN, not U+0080.
      // A decoy CSS URL must not certify an asset the browser cannot load.
      const htmlC1Remap = {
        0x80: 0x20ac,
        0x82: 0x201a,
        0x83: 0x0192,
        0x84: 0x201e,
        0x85: 0x2026,
        0x86: 0x2020,
        0x87: 0x2021,
        0x88: 0x02c6,
        0x89: 0x2030,
        0x8a: 0x0160,
        0x8b: 0x2039,
        0x8c: 0x0152,
        0x8e: 0x017d,
        0x91: 0x2018,
        0x92: 0x2019,
        0x93: 0x201c,
        0x94: 0x201d,
        0x95: 0x2022,
        0x96: 0x2013,
        0x97: 0x2014,
        0x98: 0x02dc,
        0x99: 0x2122,
        0x9a: 0x0161,
        0x9b: 0x203a,
        0x9c: 0x0153,
        0x9e: 0x017e,
        0x9f: 0x0178,
      };
      const scalar = htmlC1Remap[code] ?? code;
      // HTML emits U+FFFD for null, surrogates and out-of-range references.
      if (scalar === 0 || scalar > 0x10ffff || (scalar >= 0xd800 && scalar <= 0xdfff)) {
        return "\ufffd";
      }
      return String.fromCodePoint(scalar);
    },
  );
}

// A MIME prefix is not a MIME type: text/css-invalid and text/html-login are
// rejected by browsers despite matching a word-boundary regexp.
function hasMimeType(value, expected) {
  return (value || "").split(";", 1)[0].trim().toLowerCase() === expected;
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
    const isHtml = hasMimeType(contentType, "text/html") && /<html\b/i.test(html);
    // An attachment downloads instead of rendering, even when its HTTP status,
    // HTML markup, theme bootstrap, and stylesheets all look healthy.
    const contentDisposition = res.headers.get("content-disposition") || "";
    const isAttachment = /^\s*attachment\s*(?:;|$)/i.test(contentDisposition);
    const isLoginWall =
      /<title\b[^>]*>\s*(?:Authentication Required|Vercel Authentication)[^<]*<\/title>/i.test(
        html,
      );

    // Browsers block inline scripts under script-src 'self', not just 'none'.
    // Enforced script-src-elem overrides script-src, which overrides default-src.
    // Multiple CSP policies intersect: the inline bootstrap must satisfy each.
    const uncommentedHtml = html.replace(/<!--[\s\S]*?-->/g, "");
    // A noscript fallback does not style the JavaScript-enabled app.
    // Count only stylesheets that are active when the theme bootstrap runs.
    const nonInertHtml = uncommentedHtml.replace(
      /<(template|textarea|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      "",
    );
    // A CSP supplied by an early <meta http-equiv> in the document head
    // is enforced by browsers even without a Content-Security-Policy header.
    // A head-delivered meta CSP applies only to resources parsed after that declaration.
    // Keep source offsets stable while ignoring decoy markup inside scripts/styles.
    const markupWithoutScriptBodies = nonInertHtml.replace(
      /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      (tag) => " ".repeat(tag.length),
    );
    // Script and style text may contain literal </head> or <body tokens. Those
    // strings cannot close the document head or disable a later meta CSP.
    const headBoundary = /<\/head\s*>|<body\b/i.exec(markupWithoutScriptBodies);
    const headMarkup = markupWithoutScriptBodies.slice(
      0,
      headBoundary?.index ?? markupWithoutScriptBodies.length,
    );
    // Unlike HTTP CSP, a meta policy starts applying only after its tag is
    // parsed. A policy between two resources must not retroactively block
    // the first, but must still be enforced on the second.
    // A '>' inside a quoted meta attribute cannot terminate the tag: an
    // early CSP or refresh with a later content attribute still applies.
    const headMetaPolicies = [
      ...headMarkup.matchAll(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi),
    ].flatMap((match) => {
      const attrs = tagAttributes(match[0], 5);
      if (
        decodeMetaAttribute(attrs["http-equiv"] || "")
          .trim()
          .toLowerCase() !== "content-security-policy" ||
        !attrs.content
      )
        return [];
      return [{ position: match.index, policy: decodeMetaAttribute(attrs.content) }];
    });
    const headerPolicies = (res.headers.get("content-security-policy") || "").split(",");
    const scriptSourcesAt = (position) =>
      headerPolicies
        .concat(
          headMetaPolicies.filter((meta) => meta.position < position).map(({ policy }) => policy),
        )
        .map((policy) => {
          const directives = new Map();
          for (const directive of policy.split(";")) {
            const [rawName, ...sources] = directive.trim().split(/\s+/);
            const name = rawName?.toLowerCase();
            if (name && !directives.has(name)) directives.set(name, sources);
          }
          return (
            directives.get("script-src-elem") ??
            directives.get("script-src") ??
            directives.get("default-src") ??
            null
          );
        })
        .filter((sources) => sources !== null);

    // الاختيار في `sessionStorage` منذ ٢٠٢٦/١٠/٢٤ (الداكن افتراضًا دائمًا): السكربت المانع يقرؤه منه لا من `localStorage`.
    // Only executable script elements count as theme-bootstrap evidence.
    // Comments, templates and textarea content are inert, even when they quote JS.
    const inlineBootstrapCandidates = [
      ...nonInertHtml.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script\s*>/gi),
    ].flatMap((match) => {
      const [, openingTag, body] = match;
      // Only executable inline scripts can initialize the theme.
      const scriptAttrs = scriptAttributes(openingTag);
      if ("nomodule" in scriptAttrs) return [];
      const type = (scriptAttrs.type ?? "").trim().toLowerCase();
      const executable =
        !("type" in scriptAttrs) ||
        type === "" ||
        type === "module" ||
        /^(?:text|application)\/(?:java|ecma)script(?:\s*;.*)?$/.test(type) ||
        type === "text/x-javascript" ||
        type === "application/x-javascript";
      return executable && !("src" in scriptAttrs) && hasExecutableThemeBootstrap(body)
        ? [{ attrs: scriptAttrs, position: match.index }]
        : [];
    });
    const themeScript = inlineBootstrapCandidates.length > 0;
    const cspBlocksTheme =
      themeScript &&
      !inlineBootstrapCandidates.some(({ attrs, position }) =>
        scriptSourcesAt(position).every((sources) => {
          // CSP3 ignores 'unsafe-inline' when a nonce/hash source is present.
          // Match a real nonce; fail closed on hash-only policies unless the
          // bootstrap can be proven executable in a future hash-aware check.
          if (attrs.nonce && sources.includes(`'nonce-${attrs.nonce}'`)) return true;
          if (sources.some((source) => /^'(?:nonce-|sha(?:256|384|512)-)/i.test(source))) {
            return false;
          }
          return sources.some((source) => source.toLowerCase() === "'unsafe-inline'");
        }),
      );
    // A real HTTP 200 stylesheet can still be unusable in the browser when
    // enforced CSP blocks all external stylesheets. A source list containing
    // only 'none' (or no sources) is unambiguously blocking. Keep the check
    // conservative: other host/scheme source lists need browser-level evidence.
    // style-src-elem overrides style-src, which overrides default-src; separate
    // policies intersect, so any blocking policy makes the CSS unusable.
    // Respect `>` inside quoted HTML attributes; otherwise a disabled link
    // can be misread as active CSS evidence, or a real href can disappear.
    const stylesheetPositions = [
      ...markupWithoutScriptBodies.matchAll(/<link\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi),
    ]
      .filter(([tag]) => stylesheetHref(tag))
      .map((match) => match.index);
    const cspBlocksStylesheet = stylesheetPositions.some((position) =>
      headerPolicies
        .concat(
          headMetaPolicies.filter((meta) => meta.position < position).map(({ policy }) => policy),
        )
        .some((policy) => {
          const directives = new Map();
          for (const directive of policy.split(";")) {
            const [rawName, ...sources] = directive.trim().split(/\s+/);
            const name = rawName?.toLowerCase();
            if (name && !directives.has(name)) directives.set(name, sources);
          }
          const sources =
            directives.get("style-src-elem") ??
            directives.get("style-src") ??
            directives.get("default-src");
          return (
            sources !== undefined &&
            (sources.length === 0 ||
              (sources.length === 1 && sources[0].toLowerCase() === "'none'"))
          );
        }),
    );
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
    const immediateMetaRefresh = [
      ...activeMarkup.matchAll(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi),
    ].some(([tag]) => {
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
    const stylesheetLinks = [...activeMarkup.matchAll(/<link\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)]
      .map((match) => ({ href: stylesheetHref(match[0]), position: match.index }))
      .filter(({ href }) => href);
    const hasCss = stylesheetLinks.length > 0;
    // Browsers resolve relative link URLs against the first <base href>.
    // Checking them against the route URL could certify a local CSS file that
    // the browser actually fetches from a different origin (or a broken path).
    // The browser resolves each stylesheet when it parses that link.
    // A <base> declared later cannot retroactively change an earlier fetch;
    // otherwise a healthy decoy under the later base can hide broken app CSS.
    const baseLinks = [...activeMarkup.matchAll(/<base\b[^>]*>/gi)]
      .map((match) => ({
        position: match.index,
        attrs: tagAttributes(match[0], 5),
      }))
      .filter(({ attrs }) => "href" in attrs)
      .map(({ position, attrs }) => ({
        position,
        href: decodeMetaAttribute(attrs.href),
      }));

    if (!isHtml) failures.push(`${route}: الاستجابة ليست مستند HTML صالحًا للتطبيق`);
    if (isAttachment) failures.push(`${route}: HTML يُرسَل كمرفق للتنزيل بدل عرض الصفحة`);
    if (isLoginWall) failures.push(`${route}: صفحة توثيق Vercel ليست نجاحًا لمسار التطبيق`);
    if (cspBlocksTheme) {
      failures.push(`${route}: سياسة Content-Security-Policy تمنع تشغيل سكربت الثيم`);
    }
    if (!themeScript) failures.push(`${route}: سكربت الثيم المانع غائب من HTML المُقدَّم`);
    if (retired.length) failures.push(`${route}: اسم متقاعد ظاهر — ${retired.join(" · ")}`);
    if (!hasCss) failures.push(`${route}: لا ورقة أنماط في الصفحة المُقدَّمة`);
    if (hasCss && cspBlocksStylesheet) {
      failures.push(`${route}: سياسة Content-Security-Policy تمنع تحميل ملفات الأنماط`);
    }

    // A link tag is not proof its referenced stylesheet is actually served.
    // Probe the same-origin asset without following redirects or sending credentials.
    let cssLoaded = false;
    if (hasCss) {
      // Font CDNs may precede the application's own CSS. Never count an
      // external link as proof, but do inspect later same-origin stylesheets.
      let reason = "no same-origin stylesheet";
      // One valid vendor stylesheet cannot certify a later broken app stylesheet.
      let brokenCss = false;
      for (const { href, position } of stylesheetLinks) {
        try {
          const firstBase = baseLinks.find((base) => base.position < position);
          const documentBase = firstBase ? new URL(firstBase.href, url).href : url;
          const stylesheetUrl = new URL(href, documentBase);
          if (stylesheetUrl.origin !== new URL(BASE).origin) continue;
          const stylesheetRes = await fetchWithRetry(stylesheetUrl.href);
          const isCss = hasMimeType(stylesheetRes.headers.get("content-type"), "text/css");
          // An empty text/css response is not application styling. Verify the
          // body rather than trusting only status and a Content-Type header.
          const cssText = isCss ? await stylesheetRes.text() : "";
          if (!isCss) await stylesheetRes.body?.cancel();
          // An all-comment CSS file cannot style the app; MIME and bytes alone are insufficient.
          // A CSS encoding declaration cannot style an application by itself.
          // Preserve legitimate style rules that follow that declaration.
          // A CSS comment with no closing */ extends to EOF. Such bytes cannot
          // prove a stylesheet contains rules; preserve any valid rules before it.
          const effectiveCss = cssText
            .replace(/\/\*[\s\S]*?(?:\*\/|$)/g, "")
            .replace(/^\s*@charset\s+(?:"[^"]*"|'[^']*')\s*;\s*/i, "")
            .trim();
          if (isCss && effectiveCss.length > 0) {
            cssLoaded = true;
            continue;
          }
          brokenCss = true;
          reason = isCss ? "stylesheet response is empty" : "stylesheet response is not text/css";
        } catch (error) {
          brokenCss = true;
          reason = error instanceof Error ? error.message : String(error);
        }
      }
      if (!cssLoaded || brokenCss) failures.push(route + ": تعذّر تحميل ملف الأنماط — " + reason);
    }

    rows.push({
      route,
      status: res.status,
      bytes: html.length,
      theme: themeScript ? "✓" : "✗",
      brand: retired.length ? "✗" : "✓",
      css: cssLoaded && !cspBlocksStylesheet ? "✓" : "✗",
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
