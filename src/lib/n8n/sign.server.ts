/**
 * توقيع الطلبات والتحقق من الردود — HMAC-SHA256 بـWeb Crypto (`crypto.subtle`).
 *
 * يعمل على بيئة Vercel (Node 22) ولا يستورد `node:crypto`، فيبقى قابلًا للنقل. نقيٌّ: لا
 * بيئة ولا شبكة ولا حالة؛ السرّ والزمن والنونس تُمرَّر كلها، فيجرّبه الاختبار بقيمٍ ثابتة.
 *
 * ## العقد (حرفيًّا)
 *
 * طلب:  `X-Nx-Sig = "v1=" + hex(HMAC-SHA256(secret, "nx-n8n:v1|" + ts + "|" + nonce + "|" + path + "|" + sha256hex(body)))`
 * ردّ:  `X-Nx-Resp-Sig = "v1=" + hex(HMAC-SHA256(secret, "nx-n8n:v1:resp|" + respTs + "|" + requestNonce + "|" + sha256hex(responseBody)))`
 *
 * - المسار داخل التوقيع: طلبٌ موقَّعٌ لمسار سَدِيد لا يصلح لمسار FNN ولو تطابق الجسم.
 * - نونس الطلب داخل توقيع الردّ: ردٌّ مسجَّل لطلبٍ سابق لا يصلح لطلبٍ آخر (إعادة التشغيل).
 * - فاصلان مختلفان للنطاق (`nx-n8n:v1|` · `nx-n8n:v1:resp|`): لا يُستعمل توقيع طلبٍ ردًّا ولا العكس.
 * - الانحراف: أكثر من 30 ث ⇒ يُرفض (للطلب عند المستقبِل، وللردّ هنا).
 * - المقارنة بزمنٍ ثابت على النصّ كلّه، بلا خروج مبكر عند أول فرق.
 *
 * فصل النطاق بين السطحين (سَدِيد/FNN) بالسرّ: يختار العميل السرّ من سطح المسار (`PATH_SURFACE`)
 * لا من مدخل، فلا يُوقَّع مسار FNN بسرّ سَدِيد.
 */
import {
  HEADER,
  KEY_ID,
  MAX_SKEW_SECONDS,
  REQUEST_SIG_DOMAIN,
  RESPONSE_SIG_DOMAIN,
  SIG_PREFIX,
} from "./protocol";

const encoder = new TextEncoder();
const SIG_SHAPE = /^v1=[0-9a-f]{64}$/;
const TS_SHAPE = /^\d{1,12}$/;
const NONCE_SHAPE = /^[0-9a-f]{32}$/;

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error("webcrypto_unavailable");
  return s;
}

function toHex(buf: ArrayBuffer): string {
  let out = "";
  for (const b of new Uint8Array(buf)) out += b.toString(16).padStart(2, "0");
  return out;
}

/** SHA-256 سداسيّ لنصٍّ أو بايتات. */
export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? encoder.encode(data) : new Uint8Array(data);
  return toHex(await subtle().digest("SHA-256", bytes));
}

/** HMAC-SHA256 سداسيّ؛ المفتاح هو بايتات UTF-8 للسرّ كما هو. */
export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await subtle().importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await subtle().sign("HMAC", key, encoder.encode(message)));
}

/**
 * مقارنة نصّين بزمنٍ لا يتوقّف عند أول فرق: يمرّ على أطول الطولين دائمًا، والفرق في الطول
 * يُدمج في الناتج. (لا `timingSafeEqual` من Node — هذا الملف لا يعتمد عليه.)
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** 16 بايتًا عشوائيًّا سداسيّةً (32 رمزًا). المصدر قابل للحقن للاختبار. */
export function generateNonce(
  randomBytes: (n: number) => Uint8Array = (n) =>
    globalThis.crypto.getRandomValues(new Uint8Array(n)),
): string {
  const bytes = randomBytes(16);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export interface SignRequestInput {
  readonly secret: string;
  /** ثوانٍ يونكسية. */
  readonly ts: number;
  readonly nonce: string;
  readonly path: string;
  /** الجسم كما سيُرسل بالضبط (بايتاته هي المحسوبة). */
  readonly body: string;
  readonly deadlineMs: number;
}

/** رؤوس الطلب الأربعة المعرِّفة للتوقيع + المهلة. */
export async function signRequest(input: SignRequestInput): Promise<Record<string, string>> {
  const bodyHash = await sha256Hex(input.body);
  const sig = await hmacSha256Hex(
    input.secret,
    `${REQUEST_SIG_DOMAIN}${input.ts}|${input.nonce}|${input.path}|${bodyHash}`,
  );
  return {
    [HEADER.keyId]: KEY_ID,
    [HEADER.ts]: String(input.ts),
    [HEADER.nonce]: input.nonce,
    [HEADER.deadlineMs]: String(Math.trunc(input.deadlineMs)),
    [HEADER.sig]: `${SIG_PREFIX}${sig}`,
  };
}

export type RequestRejection = "missing" | "skew" | "shape" | "signature";

export interface VerifyRequestInput {
  readonly secret: string;
  readonly headers: Headers;
  readonly path: string;
  readonly body: string;
  /** ثوانٍ يونكسية «الآن» عند المستقبِل. */
  readonly nowSeconds: number;
}

/**
 * ما يفعله المستقبِل (n8n) للطلب، بلا حالة: الشكل، الانحراف، ثم التوقيع. **الكشف عن إعادة
 * التشغيل (النونس المكرَّر) حالةٌ عند المستقبِل** — يحتفظ بالنونس 120 ث حتى 5000 مدخل؛ ليس هنا.
 * موجودة في التطبيق كي يشغّلها الاختبار وكي يكون للمستقبِل مرجعٌ يطابق العميل بالبايت.
 */
export async function verifyRequestSignature(
  input: VerifyRequestInput,
): Promise<{ ok: true; nonce: string } | { ok: false; reason: RequestRejection }> {
  const keyId = input.headers.get(HEADER.keyId);
  const tsRaw = input.headers.get(HEADER.ts);
  const nonce = input.headers.get(HEADER.nonce);
  const sig = input.headers.get(HEADER.sig);
  if (keyId === null || tsRaw === null || nonce === null || sig === null) {
    return { ok: false, reason: "missing" };
  }
  if (
    keyId !== KEY_ID ||
    !TS_SHAPE.test(tsRaw) ||
    !NONCE_SHAPE.test(nonce) ||
    !SIG_SHAPE.test(sig)
  ) {
    return { ok: false, reason: "shape" };
  }
  if (Math.abs(input.nowSeconds - Number(tsRaw)) > MAX_SKEW_SECONDS) {
    return { ok: false, reason: "skew" };
  }
  const bodyHash = await sha256Hex(input.body);
  const expected = `${SIG_PREFIX}${await hmacSha256Hex(
    input.secret,
    `${REQUEST_SIG_DOMAIN}${tsRaw}|${nonce}|${input.path}|${bodyHash}`,
  )}`;
  return constantTimeEqual(expected, sig)
    ? { ok: true, nonce }
    : { ok: false, reason: "signature" };
}

export interface SignResponseInput {
  readonly secret: string;
  readonly respTs: number;
  /** نونس الطلب الذي يُجاب عنه. */
  readonly requestNonce: string;
  /** جسم الردّ كما سيُرسل بالضبط. */
  readonly body: string | Uint8Array;
}

/** رأسا الردّ: ما يضعه المستقبِل على كل ردٍّ، وما يتحقّق منه العميل. */
export async function signResponse(input: SignResponseInput): Promise<Record<string, string>> {
  const bodyHash = await sha256Hex(input.body);
  const sig = await hmacSha256Hex(
    input.secret,
    `${RESPONSE_SIG_DOMAIN}${input.respTs}|${input.requestNonce}|${bodyHash}`,
  );
  return {
    [HEADER.respTs]: String(input.respTs),
    [HEADER.respSig]: `${SIG_PREFIX}${sig}`,
  };
}

export interface VerifyResponseInput {
  readonly secret: string;
  readonly headers: Headers;
  /** نونس الطلب الذي أرسلناه. */
  readonly requestNonce: string;
  /** بايتات الجسم المقروءة فعلًا (بعد سقف الحجم). */
  readonly body: Uint8Array;
  readonly nowSeconds: number;
}

/**
 * يتحقّق من ردٍّ: رأسان موجودان بالشكل · الانحراف ≤ 30 ث · توقيعٌ مطابق. أي إخفاقٍ ⇒ `false`
 * والردّ يُهمل كلّه. وهذا يلتقط أيضًا العنوان الموجَّه خطأً إلى خدمةٍ غير n8n لدينا: لا تملك السرّ.
 */
export async function verifyResponseSignature(input: VerifyResponseInput): Promise<boolean> {
  const tsRaw = input.headers.get(HEADER.respTs);
  const sig = input.headers.get(HEADER.respSig);
  if (tsRaw === null || sig === null) return false;
  if (!TS_SHAPE.test(tsRaw) || !SIG_SHAPE.test(sig)) return false;
  if (Math.abs(input.nowSeconds - Number(tsRaw)) > MAX_SKEW_SECONDS) return false;
  const bodyHash = await sha256Hex(input.body);
  const expected = `${SIG_PREFIX}${await hmacSha256Hex(
    input.secret,
    `${RESPONSE_SIG_DOMAIN}${tsRaw}|${input.requestNonce}|${bodyHash}`,
  )}`;
  return constantTimeEqual(expected, sig);
}
