/**
 * runner-dispatch: بوّابة مشغّل الأتمتة (FNN) على كتالوج مغلق من خمسة معرّفات.
 *
 * الكتالوج لا يُؤخذ من الطلب ولا يُوسَّع بمعلمة. كل معرّف يؤدي عملًا غير ضار:
 *   engineering_digest        ملخص تنبيهات أمنية عامة (قراءة API عامّ)
 *   dependency_advisory_scan  تنبيهات عامة على حزم رئيسية بالاسم (ليست تدقيقًا
 *                             لنسخ المثبّتة؛ هي تنبيهات منشورة حديثًا على هذه الأسماء)
 *   research_cache_purge      تنظيف مفتاح researchCache من static data فقط
 *   canary_run_now            فحص صحة فوري بلا تغيير حالة المراقب
 *   owner_notify_test         رسالة اختبار إلى قناة المالك
 * لا نشر ولا مستودع ولا كتابة في جداول معرفة أو قواعد بيانات. التنفيذ كلّه إما
 * قراءة عامة أو تنظيف حالة n8n نفسها.
 *
 * المعلمات: أعداد صحيحة ضمن حدود وقيم من قوائم فقط؛ أي مفتاح غير معروف يُرفض.
 * التكرار: مفتاح الـIdempotency-Key (نونس التأكيد) يحفظ النتيجة 24 ساعة،
 * والمكرَّر يعود already_done بالنتيجة المحفوظة. المخزن بسقف 500 مدخل.
 *
 * نقية: الحالة والوقت يُمرَّران ويُعادان. لا شبكة هنا.
 */
const CATALOG = [
  "engineering_digest",
  "dependency_advisory_scan",
  "research_cache_purge",
  "canary_run_now",
  "owner_notify_test",
];
const IDEMPOTENCY_TTL_MS = 24 * 3600 * 1000;
const IDEMPOTENCY_CAP = 500;
const SCAN_PACKAGES = [
  "react",
  "vite",
  "zod",
  "ai",
  "@supabase/supabase-js",
  "@tanstack/react-router",
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDEM_RE = /^[A-Za-z0-9._:-]{8,128}$/;

const PARAM_SPECS = {
  engineering_digest: {
    days: { type: "int", min: 1, max: 30, fallback: 7 },
    severity: { type: "enum", values: ["critical", "high"], fallback: "critical" },
  },
  dependency_advisory_scan: {
    days: { type: "int", min: 1, max: 90, fallback: 30 },
  },
  research_cache_purge: {
    scope: { type: "enum", values: ["expired", "all"], fallback: "expired" },
  },
  canary_run_now: {},
  owner_notify_test: {},
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** يتحقق من المعلمات ويملأ الافتراضات. يعيد {ok, params}. */
function validateParams(workflow, params) {
  const spec = Object.prototype.hasOwnProperty.call(PARAM_SPECS, workflow)
    ? PARAM_SPECS[workflow]
    : null;
  if (!spec) return { ok: false };
  const input = params === undefined ? {} : params;
  if (!isPlainObject(input)) return { ok: false };
  for (const key of Object.keys(input)) {
    if (!Object.prototype.hasOwnProperty.call(spec, key)) return { ok: false };
  }
  const out = {};
  for (const key of Object.keys(spec)) {
    const rule = spec[key];
    const value = input[key];
    if (value === undefined) {
      out[key] = rule.fallback;
    } else if (rule.type === "int") {
      if (!Number.isInteger(value) || value < rule.min || value > rule.max) return { ok: false };
      out[key] = value;
    } else {
      if (rule.values.indexOf(value) === -1) return { ok: false };
      out[key] = value;
    }
  }
  return { ok: true, params: out };
}

function pruneStore(store, now) {
  const next = {};
  if (!isPlainObject(store)) return next;
  for (const key of Object.keys(store)) {
    const entry = store[key];
    if (
      isPlainObject(entry) &&
      typeof entry.at === "number" &&
      now - entry.at < IDEMPOTENCY_TTL_MS
    ) {
      next[key] = entry;
    }
  }
  return next;
}

/**
 * @param {object} input {body, idemKey, now, store}
 * @returns {{decision: string, workflow: string, params: object|null, requestId: string,
 *   idemKey: string, result: object|null, store: object}}
 */
function dispatch(input) {
  const now =
    input && typeof input.now === "number" && isFinite(input.now) ? input.now : Date.now();
  const store = pruneStore(input && input.store, now);
  const base = { workflow: "", params: null, requestId: "", idemKey: "", result: null, store };
  const body = input && input.body;
  if (!isPlainObject(body) || body.v !== 1)
    return Object.assign({}, base, { decision: "bad_params" });
  const requestId =
    typeof body.requestId === "string" && UUID_RE.test(body.requestId) ? body.requestId : "";
  if (!requestId) return Object.assign({}, base, { decision: "bad_params" });
  base.requestId = requestId;
  const idemKey = input && typeof input.idemKey === "string" ? input.idemKey.trim() : "";
  if (!IDEM_RE.test(idemKey)) return Object.assign({}, base, { decision: "bad_params" });
  base.idemKey = idemKey;
  if (typeof body.workflow !== "string" || CATALOG.indexOf(body.workflow) === -1) {
    return Object.assign({}, base, { decision: "unknown_workflow" });
  }
  base.workflow = body.workflow;
  const checked = validateParams(body.workflow, body.params);
  if (!checked.ok) return Object.assign({}, base, { decision: "bad_params" });
  base.params = checked.params;
  const seen = store[idemKey];
  if (seen) {
    if (seen.workflow !== body.workflow) return Object.assign({}, base, { decision: "bad_params" });
    return Object.assign({}, base, { decision: "already_done", result: seen.result });
  }
  return Object.assign({}, base, { decision: "run" });
}

/** يحفظ نتيجة تنفيذ ناجح تحت مفتاح التكرار. */
function recordResult(input) {
  const now =
    input && typeof input.now === "number" && isFinite(input.now) ? input.now : Date.now();
  const store = pruneStore(input && input.store, now);
  store[input.idemKey] = { at: now, workflow: input.workflow, result: input.result };
  const keys = Object.keys(store);
  if (keys.length > IDEMPOTENCY_CAP) {
    keys.sort((a, b) => store[a].at - store[b].at);
    for (const key of keys.slice(0, keys.length - IDEMPOTENCY_CAP)) delete store[key];
  }
  return store;
}

function sinceDate(now, days) {
  return new Date(now - days * 86400000).toISOString().slice(0, 10);
}

/** طلب GET عام لكل معرّف يحتاج API: يعيد {url, headers} أو null. */
function buildRequest(workflow, params, now, stubBase) {
  const root = stubBase
    ? String(stubBase).replace(/\/+$/, "") + "/api.github.com"
    : "https://api.github.com";
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "nx-n8n-runner",
  };
  if (workflow === "engineering_digest") {
    return {
      url:
        root +
        "/advisories?type=reviewed&ecosystem=npm&severity=" +
        params.severity +
        "&published=" +
        encodeURIComponent(">=" + sinceDate(now, params.days)) +
        "&sort=published&direction=desc&per_page=10",
      headers,
    };
  }
  if (workflow === "dependency_advisory_scan") {
    return {
      url:
        root +
        "/advisories?type=reviewed&ecosystem=npm&affects=" +
        encodeURIComponent(SCAN_PACKAGES.join(",")) +
        "&published=" +
        encodeURIComponent(">=" + sinceDate(now, params.days)) +
        "&sort=published&direction=desc&per_page=10",
      headers,
    };
  }
  return null;
}

function clip(text, max) {
  const chars = Array.from(String(text === undefined || text === null ? "" : text));
  return chars.length <= max ? chars.join("") : chars.slice(0, max - 1).join("") + "…";
}

// الوسم بلا < داخله فالكلفة خطّية. فئة Cf كاملة (اتجاه، عرض صفري، وسوم U+E0000-E007F ...)
// ومحدّدات الصيغة تُحذف: هذه الأسطر تصل المالك وتُنسخ إلى التطبيق.
const TAG_RE = /<[^<>]*>/g;
const INVISIBLE_RE = /[\p{Cf}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu;
const RAW_LINE_CAP = 4000;

function cleanLine(text, max) {
  const raw = String(text === undefined || text === null ? "" : text);
  return clip(
    (raw.length > RAW_LINE_CAP ? raw.slice(0, RAW_LINE_CAP) : raw)
      .replace(TAG_RE, " ")
      .replace(/[<>]/g, " ")
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
      .replace(INVISIBLE_RE, "")
      .replace(/\s+/g, " ")
      .trim(),
    max,
  );
}

/** يلخّص ردّ تنبيهات GitHub العام. يعيد {summary, items} أو null عند الفشل. */
function summariseAdvisories(workflow, params, response) {
  if (!response || typeof response.statusCode !== "number" || response.statusCode !== 200)
    return null;
  let list;
  try {
    // المتن في data (outputPropertyName) كما يضعه n8n الحقيقي لردّ نصّي كامل، لا في body.
    list = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
  } catch (error) {
    return null;
  }
  if (!Array.isArray(list)) return null;
  const items = list.slice(0, 10).map((a) => {
    const names = Array.isArray(a && a.vulnerabilities)
      ? a.vulnerabilities
          .map((v) => v && v.package && v.package.name)
          .filter(Boolean)
          .slice(0, 3)
          .join("+")
      : "";
    return cleanLine(
      [a && a.ghsa_id, a && a.severity, names, a && a.summary].filter(Boolean).join(" | "),
      160,
    );
  });
  const scope =
    workflow === "dependency_advisory_scan"
      ? "على الحزم الرئيسية (" + SCAN_PACKAGES.length + " حزم بالاسم)"
      : "بدرجة " + params.severity;
  const summary =
    list.length === 0
      ? "لا تنبيهات منشورة " +
        scope +
        " خلال آخر " +
        params.days +
        " يومًا. هذه قراءة لتنبيهات عامة وليست تدقيقًا للنسخ المثبّتة."
      : "عدد التنبيهات المنشورة " +
        scope +
        " خلال آخر " +
        params.days +
        " يومًا: " +
        list.length +
        ". هذه قراءة لتنبيهات عامة وليست تدقيقًا للنسخ المثبّتة.";
  return { summary: clip(summary, 500), items };
}

/** ينظّف مفتاح researchCache فقط. لا يلمس النونس ولا الميزانية ولا التكرار. */
function purgeResearchCache(staticData, scope, now) {
  const sd = isPlainObject(staticData) ? staticData : {};
  const cache = isPlainObject(sd.researchCache) ? sd.researchCache : {};
  const keys = Object.keys(cache);
  let removed = 0;
  const kept = {};
  for (const key of keys) {
    const entry = cache[key];
    const expired =
      !isPlainObject(entry) || typeof entry.expiresAt !== "number" || entry.expiresAt <= now;
    if (scope === "all" || expired) removed += 1;
    else kept[key] = entry;
  }
  sd.researchCache = kept;
  return {
    removed,
    remaining: Object.keys(kept).length,
    summary:
      "حُذف " +
      removed +
      " من مدخلات ذاكرة البحث المؤقتة. المتبقي: " +
      Object.keys(kept).length +
      ".",
  };
}

const STATUS_AR = { ok: "سليمة", degraded: "متدهورة", down: "متوقفة" };
const LABELS = { app: "الصحة العامة", chat: "الدردشة", provider: "مزوّد الويب" };

/** يلخّص تقييم المراقب الفوري (canary_run_now). */
function summariseCanary(evaluation) {
  const status = evaluation && STATUS_AR[evaluation.observed] ? evaluation.observed : "down";
  const checks = evaluation && Array.isArray(evaluation.checks) ? evaluation.checks : [];
  return {
    summary: "حالة الفحص الفوري: " + STATUS_AR[status] + ".",
    items: checks
      .slice(0, 10)
      .map((c) =>
        cleanLine(
          (LABELS[c.name] || c.name) +
            ": " +
            (STATUS_AR[c.status] || c.status) +
            (c.detail ? " (" + c.detail + ")" : ""),
          160,
        ),
      ),
  };
}

/** يلخّص ناتج عقدة Telegram لاختبار الإشعار. */
function summariseNotify(out) {
  const delivered = Boolean(out && !out.error && (out.ok === true || out.result));
  return {
    summary: delivered
      ? "وصلت رسالة الاختبار إلى قناة المالك."
      : "تعذّر إرسال رسالة الاختبار. راجع بيانات القناة في n8n.",
    items: [delivered ? "الإرسال: ناجح" : "الإرسال: فشل"],
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CATALOG,
    PARAM_SPECS,
    SCAN_PACKAGES,
    IDEMPOTENCY_TTL_MS,
    IDEMPOTENCY_CAP,
    dispatch,
    recordResult,
    validateParams,
    buildRequest,
    summariseAdvisories,
    purgeResearchCache,
    summariseCanary,
    summariseNotify,
  };
}
