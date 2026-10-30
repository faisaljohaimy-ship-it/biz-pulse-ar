/**
 * sign-response: توقيع ردّ n8n للتطبيق (عقد n8n، الإصدار v1).
 *
 *   X-Nx-Resp-Ts  = ثوانٍ يونكس
 *   X-Nx-Resp-Sig = "v1=" + hex(HMAC-SHA256(secret,
 *     "nx-n8n:v1:resp|" + respTs + "|" + requestNonce + "|" + sha256hex(responseBody)))
 *
 * التطبيق يُسقط أي ردّ يفشل توقيعه أو طابعه الزمني (انحراف أكثر من 30 ثانية)،
 * وهذا يلتقط أيضًا عنوانًا موجَّهًا إلى خدمة خطأ.
 *
 * دالة نقية: الوقت يُمرَّر. بلا سر صالح يعود الردّ بلا ترويسات توقيع (التطبيق
 * سيُسقطه) ولا يُرمى خطأ أبدًا.
 *
 * `signRequest` جهة العميل: يستعملها الاختبار وسكربت المثال فقط، ولا تُستدعى
 * في أي عقدة. هي نسخة ثانية من صيغة التطبيق تُقارَن بمتجهات ذهبية مستقلة.
 */
const crypto = require("crypto");

const MIN_SECRET_LENGTH = 32;

function sha256hex(text) {
  return crypto.createHash("sha256").update(String(text), "utf8").digest("hex");
}

function hmacHex(secret, text) {
  return crypto.createHmac("sha256", secret).update(String(text), "utf8").digest("hex");
}

/**
 * @param {object} input
 * @param {string} input.secret
 * @param {string} input.body نص الردّ كما سيُرسَل حرفيًّا
 * @param {string} input.nonce نونس الطلب
 * @param {number} input.now الوقت بالميللي ثانية
 * @returns {{signed: boolean, respTs: string, respSig: string, headers: object}}
 */
function signResponse(input) {
  const now =
    input && typeof input.now === "number" && isFinite(input.now) ? input.now : Date.now();
  const respTs = String(Math.floor(now / 1000));
  try {
    const secret = input && input.secret;
    if (typeof secret !== "string" || secret.length < MIN_SECRET_LENGTH) {
      return { signed: false, respTs, respSig: "", headers: {} };
    }
    const body = typeof input.body === "string" ? input.body : "";
    const nonce = typeof input.nonce === "string" ? input.nonce : "";
    const respSig =
      "v1=" + hmacHex(secret, "nx-n8n:v1:resp|" + respTs + "|" + nonce + "|" + sha256hex(body));
    return {
      signed: true,
      respTs,
      respSig,
      headers: { "X-Nx-Resp-Ts": respTs, "X-Nx-Resp-Sig": respSig },
    };
  } catch (error) {
    return { signed: false, respTs, respSig: "", headers: {} };
  }
}

/** جهة العميل: يبني ترويسات طلب موقَّعة لنصّ متن محدَّد. */
function signRequest(input) {
  const ts = String(input.ts);
  const nonce = String(input.nonce);
  const body = String(input.body);
  const sig =
    "v1=" +
    hmacHex(
      input.secret,
      "nx-n8n:v1|" + ts + "|" + nonce + "|" + input.path + "|" + sha256hex(body),
    );
  return {
    "Content-Type": "application/json",
    "X-Nx-Key-Id": "v1",
    "X-Nx-Ts": ts,
    "X-Nx-Nonce": nonce,
    "X-Nx-Deadline-Ms": String(input.deadlineMs === undefined ? 1800 : input.deadlineMs),
    "X-Nx-Sig": sig,
  };
}

/** جهة العميل: يتحقق من توقيع ردّ (للاختبار وسكربت المثال). */
function verifyResponse(input) {
  const respTs = String(input.respTs);
  const expected =
    "v1=" +
    hmacHex(
      input.secret,
      "nx-n8n:v1:resp|" + respTs + "|" + input.nonce + "|" + sha256hex(input.body),
    );
  const skewMs = Math.abs(input.now - Number(respTs) * 1000);
  return { ok: expected === input.respSig && skewMs <= 30000, skewMs };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { signResponse, signRequest, verifyResponse, sha256hex, hmacHex };
}
