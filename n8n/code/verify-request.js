/**
 * verify-request: التحقق من طلب التطبيق قبل أي عمل (عقد n8n، الإصدار v1).
 *
 * دالة نقية: لا شبكة ولا ساعة ولا حالة عامة. الوقت والحالة يُمرَّران ويُعادان.
 * تُضمَّن هذه الشيفرة حرفيًّا في عقدة Code، ويستوردها vitest كما هي.
 * لا استيراد إلا `crypto` المدمجة (NODE_FUNCTION_ALLOW_BUILTIN=crypto).
 *
 * التوقيع المتوقَّع (من العقد):
 *   X-Nx-Sig = "v1=" + hex(HMAC-SHA256(secret,
 *     "nx-n8n:v1|" + ts + "|" + nonce + "|" + path + "|" + sha256hex(body)))
 *
 * الرفض (كلّه يعود 200 مع code=auth_failed من العقدة التي تبني الغلاف):
 *   - انحراف الساعة أكثر من 30 ثانية
 *   - نونس مكرَّر خلال 120 ثانية (السقف 5000 مدخل)
 *   - بصمة المتن أو التوقيع لا يطابق
 *
 * ترتيب الفحوص مقصود: التوقيع أولًا ثم التكرار. النونس لا يُسجَّل إلا بعد
 * توقيع صحيح، وإلا ملأ مهاجمٌ بلا مفتاح مخزن النونس وطرد نونسات حقيقية.
 *
 * المتن: العقدة الأصلية تمرّر المتن الخام (base64) إن توفّر، وإلا يُعاد تسلسل
 * المتن المحلَّل بـJSON.stringify. المسار الثاني مكافئ دلاليًّا لما سيُعالَج،
 * ويطابق ما يُرسله التطبيق إن بُني المتن بـJSON.stringify. لم يُقَس على n8n حقيقي.
 */
const crypto = require("crypto");

const KEY_ID = "v1";
const SKEW_MS = 30000;
const NONCE_TTL_MS = 120000;
const NONCE_CAP = 5000;
const MIN_SECRET_LENGTH = 32;
const NONCE_RE = /^[0-9a-f]{32}$/;
const SIG_RE = /^v1=[0-9a-f]{64}$/;
const TS_RE = /^[0-9]{1,12}$/;
const MAX_DEADLINE_MS = 120000;

function sha256hex(text) {
  return crypto.createHash("sha256").update(String(text), "utf8").digest("hex");
}

function hmacHex(secret, text) {
  return crypto.createHmac("sha256", secret).update(String(text), "utf8").digest("hex");
}

function headerValue(headers, name) {
  if (!headers || typeof headers !== "object") return "";
  const wanted = String(name).toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === wanted) {
      const value = Array.isArray(headers[key]) ? headers[key][0] : headers[key];
      return typeof value === "string" ? value.trim() : "";
    }
  }
  return "";
}

function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a), "utf8");
  const right = Buffer.from(String(b), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/** يُسقط المنتهي ويعيد نسخة جديدة؛ لا يعدّل المدخل. */
function pruneNonces(store, now) {
  const next = {};
  if (!store || typeof store !== "object") return next;
  for (const key of Object.keys(store)) {
    const expiresAt = store[key];
    if (typeof expiresAt === "number" && expiresAt > now && NONCE_RE.test(key)) {
      next[key] = expiresAt;
    }
  }
  return next;
}

/** يضيف نونسًا ويطرد الأقدم عند بلوغ السقف. يعيد المخزن الجديد وعدد المطرودين. */
function rememberNonce(store, nonce, now) {
  const next = pruneNonces(store, now);
  let evicted = 0;
  const keys = Object.keys(next);
  if (keys.length >= NONCE_CAP) {
    keys.sort((a, b) => next[a] - next[b]);
    const drop = keys.length - NONCE_CAP + 1;
    for (let i = 0; i < drop; i += 1) {
      delete next[keys[i]];
      evicted += 1;
    }
  }
  next[nonce] = now + NONCE_TTL_MS;
  return { store: next, evicted };
}

function canonicalText(body) {
  const text = JSON.stringify(body);
  return typeof text === "string" ? text : "";
}

/**
 * المتن الخام يُقبل مرشَّحًا فقط إن كان JSON يطابق المتن المحلَّل دلاليًّا.
 * في نمط التخزين على القرص قد يحمل الحقل معرّفًا لا محتوى، فيسقط هنا بدل أن
 * يُرفض كل طلب سليم.
 */
function rawCandidate(rawBodyBase64, body) {
  if (typeof rawBodyBase64 !== "string" || rawBodyBase64.length === 0) return null;
  try {
    const text = Buffer.from(rawBodyBase64, "base64").toString("utf8");
    if (JSON.stringify(JSON.parse(text)) !== canonicalText(body)) return null;
    return text;
  } catch (error) {
    return null;
  }
}

function fail(reason, nonces) {
  return {
    ok: false,
    code: reason === "no_secret" ? "internal" : "auth_failed",
    reason,
    nonces,
    nonce: "",
    ts: 0,
    deadlineMs: null,
    bodySource: "",
    evicted: 0,
  };
}

/**
 * @param {object} input
 * @param {object} input.headers رؤوس الطلب (أي حالة أحرف)
 * @param {*} input.body المتن المحلَّل
 * @param {string} [input.rawBodyBase64] المتن الخام إن توفّر
 * @param {string} input.path المسار المغلق لهذا الـworkflow (ثابت لا من الطلب)
 * @param {string} input.secret السر (32 حرفًا فأكثر)
 * @param {number} input.now الوقت بالميللي ثانية
 * @param {object} [input.nonces] مخزن النونس {nonce: expiresAtMs}
 */
function evaluate(input) {
  const now =
    input && typeof input.now === "number" && isFinite(input.now) ? input.now : Date.now();
  let nonces = pruneNonces(input && input.nonces, now);
  try {
    const secret = input && input.secret;
    if (typeof secret !== "string" || secret.length < MIN_SECRET_LENGTH) {
      return fail("no_secret", nonces);
    }
    const path = input && typeof input.path === "string" ? input.path : "";
    if (!path) return fail("bad_path", nonces);

    const headers = input.headers;
    if (headerValue(headers, "x-nx-key-id") !== KEY_ID) return fail("bad_key_id", nonces);

    const tsText = headerValue(headers, "x-nx-ts");
    if (!TS_RE.test(tsText)) return fail("bad_ts", nonces);
    const ts = Number(tsText);
    if (Math.abs(now - ts * 1000) > SKEW_MS) return fail("skew", nonces);

    const nonce = headerValue(headers, "x-nx-nonce").toLowerCase();
    if (!NONCE_RE.test(nonce)) return fail("bad_nonce", nonces);

    const signature = headerValue(headers, "x-nx-sig").toLowerCase();
    if (!SIG_RE.test(signature)) return fail("bad_signature_format", nonces);

    const candidates = [];
    const raw = rawCandidate(input.rawBodyBase64, input.body);
    if (raw !== null) candidates.push({ source: "raw", text: raw });
    candidates.push({ source: "canonical", text: canonicalText(input.body) });

    let matched = "";
    for (const candidate of candidates) {
      const expected =
        "v1=" +
        hmacHex(
          secret,
          "nx-n8n:v1|" + ts + "|" + nonce + "|" + path + "|" + sha256hex(candidate.text),
        );
      if (constantTimeEqual(expected, signature) && matched === "") matched = candidate.source;
    }
    if (matched === "") return fail("bad_signature", nonces);

    if (nonces[nonce] !== undefined) return fail("replay", nonces);
    const remembered = rememberNonce(nonces, nonce, now);
    nonces = remembered.store;

    const deadlineText = headerValue(headers, "x-nx-deadline-ms");
    let deadlineMs = null;
    if (/^[0-9]{1,6}$/.test(deadlineText)) {
      const parsed = Number(deadlineText);
      if (parsed >= 1 && parsed <= MAX_DEADLINE_MS) deadlineMs = parsed;
    }

    return {
      ok: true,
      code: "ok",
      reason: "",
      nonces,
      nonce,
      ts,
      deadlineMs,
      bodySource: matched,
      evicted: remembered.evicted,
    };
  } catch (error) {
    return fail("exception", nonces);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * النونس ومعرّف الطلب «كما ادّعاهما المرسل»، بصرف النظر عن صحة التوقيع. يُوقَّع بهما
 * ردّ الفشل ليقرأ التطبيق auth_failed بدل أن يُسقطه. ليسا موثوقين ولا يُستعملان
 * قرارًا: النونس هنا لا يُسجَّل، وإنما يوقَّع به الجواب فقط.
 */
function claimedContext(input) {
  const out = { nonce: "", requestId: "" };
  try {
    const nonce = headerValue(input && input.headers, "x-nx-nonce").toLowerCase();
    if (NONCE_RE.test(nonce)) out.nonce = nonce;
    const body = input && input.body;
    if (body && typeof body === "object" && UUID_RE.test(String(body.requestId))) {
      out.requestId = body.requestId;
    }
  } catch (error) {
    // يبقى فارغًا
  }
  return out;
}

function verifyRequest(input) {
  const result = evaluate(input);
  const claimed = claimedContext(input);
  result.claimedNonce = claimed.nonce;
  result.claimedRequestId = claimed.requestId;
  return result;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    verifyRequest,
    rememberNonce,
    pruneNonces,
    sha256hex,
    hmacHex,
    SKEW_MS,
    NONCE_TTL_MS,
    NONCE_CAP,
    MIN_SECRET_LENGTH,
  };
}
