/**
 * merge-rank: يصنّف ردود المزوّدين ثم يدمجها ويرتّبها في قائمة واحدة.
 *
 * نقية: لا شبكة ولا ساعة (الوقت يُمرَّر). تعمل على نصوص ردود المزوّدين كما
 * وصلت، فلا تثق بشكلها: JSON مشوَّه، مصفوفات ضخمة، HTML داخل المقتطف، روابط
 * غير https أو بعنوان IP أو بمعرّف مستخدم، كلها تُحيَّد هنا ولا ترمي أبدًا.
 *
 * الدمج:
 *   1) إسقاط الروابط غير الصالحة (غير https، IP، userinfo، أطول من 300 حرف).
 *   2) إزالة التكرار بمفتاح رابط موحَّد (مضيف بلا www، بلا شظية، بلا معاملات
 *      تتبّع، مسار بلا شرطة أخيرة).
 *   3) الترتيب: الطبقة (رسمي ثم حكومي ثم مرجعي ثم الباقي) ثم ترتيب المزوّد ثم
 *      ترتيبه داخل ردّه.
 *   4) القصّ إلى min(6، maxResults)، وكل حقل إلى حدّ العقد (العنوان 120، الرابط
 *      300، المقتطف 300).
 *
 * المقتطف نصّ غير موثوق: تُحذف الوسوم وأحرف التحكم وكل أحرف التنسيق غير المرئية
 * (فئة Cf كاملةً: الاتجاه، وعرض الصفر، والوسوم U+E0000-E007F، وعلامة الحرف
 * العربي U+061C، والواصلة اللينة) ومحدّدات الصيغة، ولا يدّعي هذا الملف أنه يبطل
 * حقن التعليمات. التطبيق يعيد التنظيف ولا يثق بشيء.
 *
 * وضع regulatory (المادة ٩: المصادر غير الرسمية للوائح محظورة): تُسقط هذه الوحدة
 * كل نتيجة مضيفها ليس من نطاقات الوضع الرسمية ولا نطاقًا حكوميًا سعوديًا
 * (.gov.sa)، قبل العدّ والترتيب. التطبيق يعيد الحكم من جدوله ولا يثق بهذا.
 *
 * شكل ناتج عقدة HTTP كما يسلّمه n8n الحقيقي لـ responseFormat=text مع fullResponse:
 * {statusCode, statusMessage, headers, data}، والمتن في الحقل data (الاسم الافتراضي
 * outputPropertyName)، لا في body. المولّد يثبّت الاسم صراحةً والحارس يتحقق منه.
 */

const PROVIDER_ORDER = [
  "google",
  "brave",
  "tavily",
  "github",
  "mdn",
  "osv",
  "npm",
  "nvd",
  "wikipedia",
  "wikidata",
  "openalex",
];
const RESULT_CAP = 6;
const TITLE_MAX = 120;
const URL_MAX = 300;
const SNIPPET_MAX = 300;
const MAX_ITEMS_PER_PROVIDER = 10;
const MAX_TEXT_CHARS = 262144;

const OFFICIAL_BY_MODE = {
  regulatory: [
    "hcis.gov.sa",
    "uqn.gov.sa",
    "laws.boe.gov.sa",
    "moi.gov.sa",
    "my.gov.sa",
    "sdaia.gov.sa",
    "nca.gov.sa",
    "zatca.gov.sa",
    "saso.gov.sa",
  ],
  docs: [
    "developer.mozilla.org",
    "nodejs.org",
    "react.dev",
    "typescriptlang.org",
    "tanstack.com",
    "supabase.com",
    "vite.dev",
    "postgresql.org",
    "docs.n8n.io",
    "web.dev",
  ],
  security: ["nvd.nist.gov", "osv.dev", "github.com", "npmjs.com"],
  code: ["github.com"],
};
const GOV_SUFFIXES = [".gov.sa", ".edu.sa", ".gov", ".edu"];
const REFERENCE_HOSTS = [
  "wikipedia.org",
  "wikidata.org",
  "doi.org",
  "openalex.org",
  "developer.mozilla.org",
  "npmjs.com",
];
const TRACKING_PARAM = /^(utm_[a-z0-9_]*|gclid|fbclid|msclkid|mc_cid|mc_eid|ref_src|igshid)$/i;
const CREDENTIAL_RE = /credential/i;
const TIMEOUT_RE = /timeout|timed out|etimedout|esockettimedout|econnaborted/i;

function clampInt(value, min, max) {
  const n = Math.floor(Number(value));
  if (!isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function codePointSlice(text, max) {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return (
    chars
      .slice(0, max - 1)
      .join("")
      .trimEnd() + "…"
  );
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]{1,6});/gi, (m, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]{1,7});/g, (m, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/gi, "&");
}

function safeFromCodePoint(code) {
  if (!isFinite(code) || code < 32 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
    return " ";
  }
  return String.fromCodePoint(code);
}

// الوسم بلا < داخله: كل < يمسح حتى أقرب < أو > فقط، فالكلفة خطّية. النمط القديم
// /<[^>]*>/ تربيعي على نصّ مليء بـ< بلا > (كل < يمسح إلى آخر النصّ).
const TAG_RE = /<[^<>]*>/g;
// أحرف غير مرئية: فئة Cf كاملة (اتجاه، عرض صفري، وسوم U+E0000-E007F، U+061C، U+00AD، U+180E،
// U+206A-206F، U+FFF9-FFFB) + محدّدات الصيغة (U+FE00-FE0F وU+E0100-E01EF) وهي Mn لا Cf + كل
// Default_Ignorable_Code_Point (U+034F، U+115F، U+1160، U+17B4-17B5، U+180B-180D، U+3164، U+FFA0 ...)
// كي لا يُخفي محرفٌ خفي حرفًا داخل عبارة حقن فيفلت من معقِّم التطبيق (حدّ الثقة لا يكون أضعف منه).
const INVISIBLE_RE =
  /[\p{Cf}\p{Default_Ignorable_Code_Point}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu;
// سقف مدخل الحقل الخام قبل التنظيف: العنوان 120 والمقتطف 300 حرفًا بعد التنظيف.
const RAW_FIELD_CAP = 4000;

/** نصّ عرض آمن: بلا وسوم ولا أحرف تحكم ولا أحرف تنسيق خفية، ومقصوص. */
function sanitizeText(value, max) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string" && typeof value !== "number") return "";
  let text = String(value);
  if (text.length > RAW_FIELD_CAP) text = text.slice(0, RAW_FIELD_CAP);
  text = text.replace(TAG_RE, " ");
  text = decodeEntities(text);
  text = text.replace(TAG_RE, " ").replace(/[<>]/g, " ");
  text = text
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(INVISIBLE_RE, "")
    .replace(/\s+/g, " ")
    .trim();
  return codePointSlice(text, max);
}

function toIso(value, nowMs) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const ms = typeof value === "number" ? value : Date.parse(value);
  if (!isFinite(ms)) return null;
  if (ms < Date.parse("1990-01-01T00:00:00Z")) return null;
  if (typeof nowMs === "number" && ms > nowMs + 86400000) return null;
  try {
    return new Date(ms).toISOString();
  } catch (error) {
    return null;
  }
}

/**
 * يوحّد رابطًا ويرفض غير الصالح. يعيد {url, key, host} أو null.
 * محلِّل يدوي عمدًا: لا اعتماد على كائن URL داخل صندوق n8n.
 */
function normalizeUrl(raw) {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (text.length === 0 || text.length > 2000) return null;
  if (/[\s"'<>\\^`{|}\u0000-\u001f\u007f]/.test(text)) return null;
  const match = /^https:\/\/([^/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(text);
  if (!match) return null;
  const authority = match[1];
  if (authority.indexOf("@") !== -1 || authority.indexOf("[") !== -1) return null;
  const hostPort = /^([^:]+)(?::([0-9]{1,5}))?$/.exec(authority);
  if (!hostPort) return null;
  const host = hostPort[1].toLowerCase().replace(/\.$/, "");
  const port = hostPort[2];
  if (host.indexOf(".") === -1) return null;
  if (/^[0-9.]+$/.test(host)) return null;
  if (!/^[a-z0-9.-]+$/.test(host) || /(^|\.)(-|\.)|-\.|\.\./.test(host)) {
    // أسماء دولية غير ASCII تُرفض هنا: التطبيق يطلب مضيفًا بصيغة ASCII.
    return null;
  }
  const path = match[2] && match[2].length > 0 ? match[2] : "/";
  const kept = [];
  if (match[3]) {
    for (const part of match[3].slice(1).split("&")) {
      if (part.length === 0) continue;
      const name = part.split("=")[0];
      if (!TRACKING_PARAM.test(name)) kept.push(part);
    }
  }
  const portPart = port && port !== "443" ? ":" + port : "";
  const query = kept.length > 0 ? "?" + kept.join("&") : "";
  const url = "https://" + host + portPart + path + query;
  if (url.length > URL_MAX) return null;
  const bareHost = host.replace(/^www\./, "");
  const trimmedPath = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const sortedQuery = kept.slice().sort().join("&");
  return {
    url,
    host: bareHost,
    key: bareHost + portPart + trimmedPath + (sortedQuery ? "?" + sortedQuery : ""),
  };
}

function hostMatches(host, domain) {
  return host === domain || host.endsWith("." + domain);
}

/**
 * وضع regulatory (المادة ٩): يبقى مضيف من نطاقات الوضع الرسمية أو نطاق حكومي سعودي فقط.
 * الباقي (مدوّنات، موسوعات، تجاري) يسقط هنا ولا يُعدّ ولا يُنقل. التطبيق يعيد الحكم.
 */
function regulatoryHostAllowed(host) {
  for (const domain of OFFICIAL_BY_MODE.regulatory) if (hostMatches(host, domain)) return true;
  return host.endsWith(".gov.sa");
}

/** 0 رسمي للوضع، 1 حكومي/تعليمي، 2 مرجعي، 3 الباقي. */
function tierOf(host, mode) {
  const official = OFFICIAL_BY_MODE[mode] || [];
  for (const domain of official) if (hostMatches(host, domain)) return 0;
  for (const suffix of GOV_SUFFIXES) if (host.endsWith(suffix)) return 1;
  for (const domain of REFERENCE_HOSTS) if (hostMatches(host, domain)) return 2;
  return 3;
}

function pick(object, path) {
  let current = object;
  for (const key of path.split(".")) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = current[key];
  }
  return current;
}

function list(value) {
  return Array.isArray(value) ? value.slice(0, MAX_ITEMS_PER_PROVIDER) : [];
}

function encodePath(text) {
  return encodeURIComponent(String(text).replace(/ /g, "_"));
}

const ADAPTERS = {
  google(parsed) {
    return list(pick(parsed, "items")).map((it) => ({
      title: pick(it, "title"),
      url: pick(it, "link"),
      snippet: pick(it, "snippet"),
      publishedAt: pick(it, "pagemap.metatags.0.article:published_time"),
    }));
  },
  brave(parsed) {
    return list(pick(parsed, "web.results")).map((it) => ({
      title: pick(it, "title"),
      url: pick(it, "url"),
      snippet: pick(it, "description"),
      publishedAt: pick(it, "page_age"),
    }));
  },
  tavily(parsed) {
    return list(pick(parsed, "results")).map((it) => ({
      title: pick(it, "title"),
      url: pick(it, "url"),
      snippet: pick(it, "content"),
      publishedAt: pick(it, "published_date"),
    }));
  },
  github(parsed) {
    return list(pick(parsed, "items")).map((it) => {
      const repo = pick(it, "repository.full_name");
      const fragment = pick(it, "text_matches.0.fragment");
      return {
        title: (repo ? repo + "/" : "") + (pick(it, "path") || pick(it, "name") || ""),
        url: pick(it, "html_url"),
        snippet: fragment || pick(it, "repository.description") || repo,
        publishedAt: null,
      };
    });
  },
  mdn(parsed) {
    return list(pick(parsed, "documents")).map((it) => ({
      title: pick(it, "title"),
      url:
        typeof pick(it, "mdn_url") === "string" ? "https://developer.mozilla.org" + it.mdn_url : "",
      snippet: pick(it, "summary"),
      publishedAt: null,
    }));
  },
  osv(parsed) {
    const vulns = Array.isArray(pick(parsed, "vulns"))
      ? list(pick(parsed, "vulns"))
      : typeof pick(parsed, "id") === "string"
        ? [parsed]
        : [];
    return vulns.map((it) => ({
      title: pick(it, "id") + (pick(it, "summary") ? ": " + pick(it, "summary") : ""),
      url: /^[A-Za-z0-9._-]{3,80}$/.test(String(pick(it, "id")))
        ? "https://osv.dev/vulnerability/" + it.id
        : "",
      snippet: pick(it, "summary") || pick(it, "details"),
      publishedAt: pick(it, "published") || pick(it, "modified"),
    }));
  },
  npm(parsed) {
    return list(pick(parsed, "objects")).map((it) => {
      const name = pick(it, "package.name");
      return {
        title: name ? name + "@" + (pick(it, "package.version") || "") : "",
        url: pick(it, "package.links.npm") || (name ? "https://www.npmjs.com/package/" + name : ""),
        snippet: pick(it, "package.description"),
        publishedAt: pick(it, "package.date"),
      };
    });
  },
  nvd(parsed) {
    return list(pick(parsed, "vulnerabilities")).map((it) => {
      const id = pick(it, "cve.id");
      const descriptions = pick(it, "cve.descriptions");
      const english = Array.isArray(descriptions)
        ? descriptions.find((d) => d && d.lang === "en") || descriptions[0]
        : null;
      return {
        title: id,
        url: /^CVE-[0-9]{4}-[0-9]{4,}$/.test(String(id))
          ? "https://nvd.nist.gov/vuln/detail/" + id
          : "",
        snippet: english && english.value,
        publishedAt: pick(it, "cve.published"),
      };
    });
  },
  wikipedia(parsed, context) {
    const lang = context && context.lang === "ar" ? "ar" : "en";
    return list(pick(parsed, "query.search")).map((it) => ({
      title: pick(it, "title"),
      url:
        typeof pick(it, "title") === "string"
          ? "https://" + lang + ".wikipedia.org/wiki/" + encodePath(it.title)
          : "",
      snippet: pick(it, "snippet"),
      publishedAt: pick(it, "timestamp"),
    }));
  },
  wikidata(parsed) {
    return list(pick(parsed, "search")).map((it) => ({
      title: pick(it, "label") || pick(it, "id"),
      url: /^[PQL][0-9]{1,12}$/.test(String(pick(it, "id")))
        ? "https://www.wikidata.org/wiki/" + it.id
        : "",
      snippet: pick(it, "description"),
      publishedAt: null,
    }));
  },
  openalex(parsed) {
    return list(pick(parsed, "results")).map((it) => {
      const venue = pick(it, "primary_location.source.display_name");
      const year = String(pick(it, "publication_date") || "").slice(0, 4);
      return {
        title: pick(it, "display_name"),
        url: pick(it, "doi") || pick(it, "id"),
        snippet: [venue, year].filter(Boolean).join(" - "),
        publishedAt: pick(it, "publication_date"),
      };
    });
  },
};

function parseJson(text) {
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_TEXT_CHARS) return null;
  try {
    const value = JSON.parse(text);
    return value !== null && typeof value === "object" ? value : null;
  } catch (error) {
    return null;
  }
}

function errorMessage(out) {
  if (!out || typeof out !== "object") return "";
  const err = out.error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && typeof err.message === "string") return err.message;
  return "";
}

/**
 * يصنّف ناتج عقدة HTTP واحد إلى {id,status,ms,text,hidden}.
 * @param {object} input {id, gate:{run,reason}, startedAt, now, out, timeoutMs}
 */
function classifyHttp(input) {
  const id = String(input.id);
  const gate = input.gate || { run: false, reason: "not_in_mode" };
  const ms = clampInt(input.now - input.startedAt, 0, 60000);
  if (!gate.run) {
    if (gate.reason === "deadline") return { id, status: "timeout", ms: 0, text: null };
    return {
      id,
      status: "skipped",
      ms: 0,
      text: null,
      hidden: gate.reason === "not_in_mode" || gate.reason === "no_package_term",
    };
  }
  const out = input.out;
  const message = errorMessage(out);
  if (message) {
    if (CREDENTIAL_RE.test(message)) return { id, status: "skipped", ms: 0, text: null };
    if (TIMEOUT_RE.test(message)) return { id, status: "timeout", ms, text: null };
    return { id, status: "error", ms, text: null };
  }
  if (!out || typeof out !== "object" || typeof out.statusCode !== "number") {
    return { id, status: "error", ms, text: null };
  }
  if (out.statusCode < 200 || out.statusCode >= 300) {
    return { id, status: "error", ms, text: null };
  }
  // المتن في data (outputPropertyName) كما يضعه n8n الحقيقي لردّ نصّي كامل، لا في body.
  const text = typeof out.data === "string" ? out.data : JSON.stringify(out.data);
  if (typeof text !== "string" || text.length > MAX_TEXT_CHARS) {
    return { id, status: "error", ms, text: null };
  }
  return { id, status: "ok", ms, text };
}

/** دفعة GET بلا مفتاح: يقابل المخرجات بالمداخل بالترتيب، وأي عدم تطابق = خطأ للكل. */
function classifyBatch(input) {
  const planned = Array.isArray(input.planned) ? input.planned : [];
  const outs = Array.isArray(input.outs) ? input.outs : [];
  const gate = input.gate || { run: false, reason: "not_in_mode" };
  const aligned = outs.length === planned.length;
  return planned.map((item, index) =>
    classifyHttp({
      id: item.id,
      gate: gate.run && !aligned ? { run: true, reason: "" } : gate,
      startedAt: input.startedAt,
      now: input.now,
      out: aligned ? outs[index] : { error: "batch_misaligned" },
      timeoutMs: input.timeoutMs,
    }),
  );
}

const STATUS_RANK = { ok: 0, timeout: 1, error: 2, skipped: 3 };

/**
 * @param {object} input
 * @param {Array} input.entries ناتج classifyHttp/classifyBatch
 * @param {string} input.mode
 * @param {string} input.lang
 * @param {number} input.maxResults
 * @param {number} input.now
 */
function mergeRank(input) {
  const entries = Array.isArray(input && input.entries) ? input.entries : [];
  const mode = input && input.mode;
  const limit = clampInt(input && input.maxResults, 1, RESULT_CAP);
  const nowMs = input && typeof input.now === "number" ? input.now : undefined;

  const byProvider = {};
  const candidates = [];
  entries.forEach((entry) => {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string") return;
    if (entry.hidden) return;
    const id = entry.id;
    const record = byProvider[id] || { id, status: null, ms: 0, n: 0 };
    byProvider[id] = record;
    let status = STATUS_RANK[entry.status] === undefined ? "error" : entry.status;
    let produced = 0;
    if (status === "ok") {
      const parsed = parseJson(entry.text);
      const adapter = ADAPTERS[id];
      if (parsed === null || !adapter) {
        status = "error";
      } else {
        let raw = [];
        try {
          raw = adapter(parsed, { lang: input.lang });
        } catch (error) {
          status = "error";
        }
        raw.forEach((item, rank) => {
          const link = normalizeUrl(item && item.url);
          if (!link) return;
          if (mode === "regulatory" && !regulatoryHostAllowed(link.host)) return;
          const title = sanitizeText(item.title, TITLE_MAX) || link.host;
          produced += 1;
          candidates.push({
            tier: tierOf(link.host, mode),
            order: PROVIDER_ORDER.indexOf(id) === -1 ? 99 : PROVIDER_ORDER.indexOf(id),
            rank,
            key: link.key,
            result: {
              title,
              url: link.url,
              snippet: sanitizeText(item.snippet, SNIPPET_MAX),
              publishedAt: toIso(item.publishedAt, nowMs),
              provider: id,
            },
          });
        });
      }
    }
    // مزوّد بنداءين (OSV بالحزمة وبالمعرّف): يفوز الأفضل حالًا.
    if (record.status === null || STATUS_RANK[status] < STATUS_RANK[record.status]) {
      record.status = status;
    }
    record.ms = Math.max(record.ms, clampInt(entry.ms, 0, 60000));
    record.n += produced;
  });

  candidates.sort((a, b) => a.tier - b.tier || a.order - b.order || a.rank - b.rank);
  const seen = {};
  const results = [];
  for (const candidate of candidates) {
    if (seen[candidate.key]) continue;
    seen[candidate.key] = true;
    results.push(candidate.result);
    if (results.length >= limit) break;
  }

  const providers = Object.keys(byProvider)
    .sort((a, b) => {
      const ia = PROVIDER_ORDER.indexOf(a) === -1 ? 99 : PROVIDER_ORDER.indexOf(a);
      const ib = PROVIDER_ORDER.indexOf(b) === -1 ? 99 : PROVIDER_ORDER.indexOf(b);
      return ia - ib || (a < b ? -1 : 1);
    })
    .map((id) => byProvider[id]);
  return { providers, results };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    mergeRank,
    classifyHttp,
    classifyBatch,
    normalizeUrl,
    sanitizeText,
    regulatoryHostAllowed,
    tierOf,
    toIso,
    PROVIDER_ORDER,
    OFFICIAL_BY_MODE,
    RESULT_CAP,
    TITLE_MAX,
    URL_MAX,
    SNIPPET_MAX,
    MAX_TEXT_CHARS,
  };
}
