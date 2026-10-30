/**
 * build-envelope: يبني غلاف الردّ ويضمن أنه صالح دائمًا.
 *
 * الضمان: لأي مدخل (null، undefined، نص، كائن ناقص، مصفوفات ضخمة، حقول
 * بنوع خاطئ، أخطاء، مهلات) تعود الدالة بغلافٍ يجتاز `validateEnvelope`، وإلا
 * بغلاف ثابت مكتوب حرفيًّا. لا ترمي أبدًا. الجسم المُعاد لا يتجاوز 32 كيلوبايت
 * (سقف التطبيق للردّ) وإلا يُقصّ من الذيل.
 *
 * غلاف البحث:
 *   {v:1, ok, code, requestId, degraded, fetchedAt, providers[], results[]<=6}
 * غلاف المشغّل:
 *   {v:1, ok, code, requestId, result:{summary<=500, items[]<=10}|null}
 *
 * الرموز المسموحة صراحةً من الخارج هي رموز الفشل فقط. رمز ok وno_results
 * يُشتقّان من المزوّدين والنتائج؛ لا يُصرَّح بهما، فلا ادّعاء نجاح بلا نتائج.
 */

const RESEARCH_CODES = [
  "ok",
  "no_results",
  "all_providers_failed",
  "auth_failed",
  "bad_request",
  "budget_exhausted",
  "internal",
];
const EXPLICIT_FAILURE_CODES = [
  "all_providers_failed",
  "auth_failed",
  "bad_request",
  "budget_exhausted",
  "internal",
];
const RUNNER_CODES = [
  "ok",
  "unknown_workflow",
  "bad_params",
  "auth_failed",
  "already_done",
  "budget_exhausted",
  "internal",
];
const STATUSES = ["ok", "error", "timeout", "skipped"];
// مفاتيح العنصر الداخلية كما يفرضها مخطط التطبيق الصارم (strictObject): مفتاح زائد يُرفض الغلاف كلّه عنده.
const PROVIDER_KEYS = ["id", "status", "ms", "n"];
const RESULT_KEYS = ["title", "url", "snippet", "publishedAt", "provider"];
const MAX_BODY_BYTES = 32768;
// سقف مصفوفة المزوّدين في عقد التطبيق (PROVIDER_MAX في schema.ts): ما فوقه يُرفض الغلاف كلّه عند التطبيق.
const MAX_PROVIDERS = 8;
const EPOCH_ISO = "1970-01-01T00:00:00.000Z";
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const UUID_LIKE_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const NONCE_RE = /^[0-9a-f]{32}$/;
const HTTPS_RE = /^https:\/\/[^\s"'<>\\]+$/;

// الوسم بلا < داخله فالكلفة خطّية (النمط /<[^>]*>/ تربيعي على نصّ مليء بـ< بلا >).
const TAG_RE = /<[^<>]*>/g;
// فئة Cf كاملة (اتجاه، عرض صفري، وسوم U+E0000-E007F، U+061C، U+00AD ...) + محدّدات الصيغة + كل
// Default_Ignorable_Code_Point (كما في merge-rank.js ومعقِّم التطبيق).
const INVISIBLE_RE =
  /[\p{Cf}\p{Default_Ignorable_Code_Point}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu;
const RAW_FIELD_CAP = 4000;

function cleanText(value, max) {
  if (typeof value !== "string") return "";
  const text = (value.length > RAW_FIELD_CAP ? value.slice(0, RAW_FIELD_CAP) : value)
    .replace(TAG_RE, " ")
    .replace(/[<>]/g, " ")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(INVISIBLE_RE, "")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(text);
  return chars.length <= max
    ? text
    : chars
        .slice(0, max - 1)
        .join("")
        .trimEnd() + "…";
}

function safeIso(value) {
  try {
    const ms = typeof value === "number" ? value : Date.parse(String(value));
    if (isFinite(ms)) return new Date(ms).toISOString();
  } catch (error) {
    // يسقط إلى الاحتياط أدناه
  }
  try {
    return new Date().toISOString();
  } catch (error) {
    return EPOCH_ISO;
  }
}

function safeInt(value, min, max) {
  const n = Math.floor(Number(value));
  if (!isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function safeRequestId(value) {
  return typeof value === "string" && ID_RE.test(value) ? value : "";
}

function normaliseProviders(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value.slice(0, MAX_PROVIDERS)) {
    if (!item || typeof item !== "object") continue;
    const id = cleanText(item.id, 32);
    if (!id) continue;
    out.push({
      id,
      status: STATUSES.indexOf(item.status) === -1 ? "error" : item.status,
      ms: safeInt(item.ms, 0, 60000),
      n: safeInt(item.n, 0, 100),
    });
  }
  return out;
}

function normaliseIsoOrNull(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  const ms = Date.parse(value);
  if (!isFinite(ms)) return null;
  try {
    return new Date(ms).toISOString();
  } catch (error) {
    return null;
  }
}

function normaliseResults(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value.slice(0, 50)) {
    if (!item || typeof item !== "object") continue;
    const url = typeof item.url === "string" ? item.url.trim() : "";
    if (url.length === 0 || url.length > 300 || !HTTPS_RE.test(url)) continue;
    const provider = cleanText(item.provider, 32);
    if (!provider) continue;
    out.push({
      title: cleanText(item.title, 120) || url.slice(8, 60),
      url,
      snippet: cleanText(item.snippet, 300),
      publishedAt: normaliseIsoOrNull(item.publishedAt),
      provider,
    });
    if (out.length >= 6) break;
  }
  return out;
}

/** مدقّق بنيوي مكافئ لما يفعله zod الصارم عند التطبيق. يعيد مصفوفة مشاكل. */
function validateEnvelope(envelope) {
  const problems = [];
  const e = envelope;
  if (!e || typeof e !== "object" || Array.isArray(e)) return ["not_object"];
  const allowed = ["v", "ok", "code", "requestId", "degraded", "fetchedAt", "providers", "results"];
  for (const key of Object.keys(e)) if (allowed.indexOf(key) === -1) problems.push("extra:" + key);
  for (const key of allowed) if (!(key in e)) problems.push("missing:" + key);
  if (e.v !== 1) problems.push("v");
  if (typeof e.ok !== "boolean") problems.push("ok");
  if (RESEARCH_CODES.indexOf(e.code) === -1) problems.push("code");
  if (typeof e.requestId !== "string") problems.push("requestId");
  if (typeof e.degraded !== "boolean") problems.push("degraded");
  if (typeof e.fetchedAt !== "string" || !isFinite(Date.parse(e.fetchedAt))) {
    problems.push("fetchedAt");
  }
  if (!Array.isArray(e.providers)) problems.push("providers");
  else {
    e.providers.forEach((p, i) => {
      if (!p || typeof p !== "object") return problems.push("provider:" + i);
      for (const key of Object.keys(p)) {
        if (PROVIDER_KEYS.indexOf(key) === -1) problems.push("provider.extra:" + key + ":" + i);
      }
      if (typeof p.id !== "string" || p.id.length === 0) problems.push("provider.id:" + i);
      if (STATUSES.indexOf(p.status) === -1) problems.push("provider.status:" + i);
      if (!Number.isInteger(p.ms) || p.ms < 0) problems.push("provider.ms:" + i);
      if (!Number.isInteger(p.n) || p.n < 0) problems.push("provider.n:" + i);
    });
  }
  if (!Array.isArray(e.results) || e.results.length > 6) problems.push("results");
  else {
    e.results.forEach((r, i) => {
      if (!r || typeof r !== "object") return problems.push("result:" + i);
      for (const key of Object.keys(r)) {
        if (RESULT_KEYS.indexOf(key) === -1) problems.push("result.extra:" + key + ":" + i);
      }
      if (typeof r.title !== "string" || Array.from(r.title).length > 120) {
        problems.push("result.title:" + i);
      }
      if (typeof r.url !== "string" || r.url.length > 300 || !HTTPS_RE.test(r.url)) {
        problems.push("result.url:" + i);
      }
      if (typeof r.snippet !== "string" || Array.from(r.snippet).length > 300) {
        problems.push("result.snippet:" + i);
      }
      if (
        r.publishedAt !== null &&
        (typeof r.publishedAt !== "string" || !isFinite(Date.parse(r.publishedAt)))
      ) {
        problems.push("result.publishedAt:" + i);
      }
      if (typeof r.provider !== "string" || r.provider.length === 0) {
        problems.push("result.provider:" + i);
      }
    });
  }
  const okShouldBe = e.code === "ok" || e.code === "no_results";
  if (e.ok !== okShouldBe) problems.push("ok_code_mismatch");
  if (e.code === "ok" && Array.isArray(e.results) && e.results.length === 0) {
    problems.push("ok_without_results");
  }
  return problems;
}

function literalFallback(requestId, fetchedAt) {
  return {
    v: 1,
    ok: false,
    code: "internal",
    requestId: safeRequestId(requestId),
    degraded: true,
    fetchedAt: fetchedAt || EPOCH_ISO,
    providers: [],
    results: [],
  };
}

function byteLength(text) {
  return Buffer.byteLength(text, "utf8");
}

/**
 * @param {object} [input] {requestId, code, providers, results, now}
 * @returns {{envelope: object, body: string}}
 */
function buildEnvelope(input) {
  let requestId = "";
  let fetchedAt = EPOCH_ISO;
  try {
    const safe = input && typeof input === "object" ? input : {};
    requestId = safeRequestId(safe.requestId);
    fetchedAt = safeIso(safe.now);
    const explicit = EXPLICIT_FAILURE_CODES.indexOf(safe.code) !== -1;
    // ردّ فشل صريح (مصادقة، طلب سيئ، ميزانية، داخلي) لا يحمل مزوّدين ولا نتائج.
    const keepsProviders = !explicit || safe.code === "all_providers_failed";
    const providers = keepsProviders ? normaliseProviders(safe.providers) : [];
    let results = explicit ? [] : normaliseResults(safe.results);
    let code;
    if (explicit) {
      code = safe.code;
    } else if (results.length > 0) {
      code = "ok";
    } else {
      const attempted = providers.filter((p) => p.status !== "skipped");
      const anyOk = providers.some((p) => p.status === "ok");
      code = attempted.length === 0 || !anyOk ? "all_providers_failed" : "no_results";
    }
    if (code === "all_providers_failed") results = [];
    const ok = code === "ok" || code === "no_results";
    const degraded = !ok || providers.some((p) => p.status === "error" || p.status === "timeout");
    const envelope = { v: 1, ok, code, requestId, degraded, fetchedAt, providers, results };
    const body = JSON.stringify(envelope);
    if (validateEnvelope(envelope).length > 0 || byteLength(body) > MAX_BODY_BYTES) {
      throw new Error("invalid_envelope");
    }
    return { envelope, body };
  } catch (error) {
    const envelope = literalFallback(requestId, fetchedAt);
    return { envelope, body: JSON.stringify(envelope) };
  }
}

function normaliseItems(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value.slice(0, 10)) {
    const text = cleanText(typeof item === "number" ? String(item) : item, 160);
    if (text) out.push(text);
  }
  return out;
}

/**
 * @param {object} [input] {requestId, code, result:{summary, items}, now}
 * @returns {{envelope: object, body: string}}
 */
function buildRunnerEnvelope(input) {
  let requestId = "";
  try {
    const safe = input && typeof input === "object" ? input : {};
    requestId = safeRequestId(safe.requestId);
    const code = RUNNER_CODES.indexOf(safe.code) === -1 ? "internal" : safe.code;
    const keep = code === "ok" || code === "already_done";
    let result = null;
    if (keep && safe.result && typeof safe.result === "object") {
      result = {
        summary: cleanText(safe.result.summary, 500),
        items: normaliseItems(safe.result.items),
      };
    }
    if (keep && result === null) {
      return buildRunnerEnvelope({ requestId, code: "internal" });
    }
    const envelope = { v: 1, ok: keep, code, requestId, result };
    return { envelope, body: JSON.stringify(envelope) };
  } catch (error) {
    const envelope = { v: 1, ok: false, code: "internal", requestId, result: null };
    return { envelope, body: JSON.stringify(envelope) };
  }
}

/** يستخلص نونس الطلب ومعرّفه من إدخال n8n الخام (دون الوثوق بهما) لتوقيع ردّ الفشل. */
function contextFromWebhook(webhookJson) {
  const out = { nonce: "", requestId: "" };
  try {
    const headers = (webhookJson && webhookJson.headers) || {};
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === "x-nx-nonce") {
        const value = String(Array.isArray(headers[key]) ? headers[key][0] : headers[key])
          .trim()
          .toLowerCase();
        if (NONCE_RE.test(value)) out.nonce = value;
      }
    }
    const body = webhookJson && webhookJson.body;
    if (body && typeof body === "object" && UUID_LIKE_RE.test(String(body.requestId))) {
      out.requestId = body.requestId;
    }
  } catch (error) {
    // يبقى فارغًا
  }
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    buildEnvelope,
    buildRunnerEnvelope,
    validateEnvelope,
    contextFromWebhook,
    RESEARCH_CODES,
    RUNNER_CODES,
    MAX_BODY_BYTES,
    MAX_PROVIDERS,
  };
}
