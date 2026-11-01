/**
 * رمز تأكيد استيراد فِن (أمر المالك ٢٠٢٦/١٠/٣١) — خادمٌ فقط.
 *
 * التنفيذ خطوتان بنقرتين من المالك: **معاينة** لا تكتب شيئًا وتُصدر هذا الرمز، ثم **تأكيد** يعيد رفع
 * الملف نفسه (الخادم لا يخزّنه بين الخطوتين) ومعه الرمز. الرمز يربط ثلاثة أشياء كي لا يصلح لغيرها:
 *  - **المستخدم** (`uid`): رمز مالكٍ لا يصلح لمستخدمٍ آخر.
 *  - **بصمة الملف** (`sha`: sha256 للبايتات): رمزٌ لملفٍ لا يصلح لملفٍ آخر ولو بالاسم نفسه.
 *  - **المدّة** (`exp`): عشر دقائق.
 * ومعهما عدد الوثائق والصفوف المعاينة (`parts`/`rows`) ليقارنها المنفِّذ بما أعاد حسابه.
 *
 * الشكل: `base64url(JSON) + "." + base64url(HMAC-SHA256)` — نفس بنية رمز تأكيد الكتابة في
 * `sadeed/write-confirmation.server.ts` لكن **بمفتاحٍ مستقل** `FINN_IMPORT_SIGNING_SECRET` وبفاصل
 * نطاقٍ مختلف `finn-import-confirm:v1|` (حزام ومشدّ): فلا يصلح رمز كتابةٍ رمزَ استيراد ولا العكس
 * حتى لو تطابق السرّان. غياب السرّ أو قصره (< ٣٢ حرفًا) ⇒ `confirmation_unavailable` والميزة مغلقة
 * (معاينةً وتنفيذًا).
 *
 * **الاستهلاك مرّةً واحدة** (`claimImportToken`): الآلية الذرّية نفسها في `claimConfirmation` —
 * `public.check_rate_limit` بمفتاحٍ فريد `fi-claim:<user>:<nonce>` وحدٍّ 1: دالة قاعدة تقفل الصفّ
 * وتعيد `true` لنداءٍ واحد بالضبط مهما تزامن المتنافسون. أي خطأ فيها أو جوابٌ غير منطقي ⇒ فشل
 * مغلق (لا كتابة). ولا نعتمد على ترتيب صفوف سجلّ ولا على قراءةٍ ثم كتابة.
 *
 * تنبيه للمستدعي: الرمز يُستهلك بالمطالبة لا بنجاح الكتابة؛ فشلُ التضمين بعد المطالبة يعني معاينةً
 * جديدة (رمز جديد) — وهذا مقصود: لا إعادة تشغيل صامتة لكتابةٍ لا يُعرف أثرها.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { FINN_IMPORT_LIMITS, type FinnImportErrorCode } from "./contract";

export const FINN_IMPORT_TOKEN_DOMAIN = "finn-import-confirm:v1|";
const MAX_TOKEN_LENGTH = 2048;
/** دلو المطالبة يعيش أطول من عمر الرمز بهامش (ستّة أضعافه)؛ الرمز لا يُقبل أصلًا بعد انتهائه. */
export const FINN_IMPORT_CLAIM_WINDOW_SECONDS = (FINN_IMPORT_LIMITS.tokenTtlMs / 1000) * 6;
const SHA256_HEX = /^[0-9a-f]{64}$/;

interface ImportTokenPayload {
  v: 1;
  uid: string;
  sha: string;
  parts: number;
  rows: number;
  exp: number;
  n: string;
}

export type SignImportTokenResult =
  | { ok: true; token: string; nonce: string; expiresAt: string }
  | { ok: false; error: Extract<FinnImportErrorCode, "confirmation_unavailable"> };

export type VerifyImportTokenResult =
  | { ok: true; nonce: string; parts: number; rows: number; expiresAt: string }
  | {
      ok: false;
      error: Extract<
        FinnImportErrorCode,
        "token_invalid" | "token_expired" | "file_changed" | "confirmation_unavailable"
      >;
    };

export type ClaimImportTokenResult =
  | { ok: true }
  | {
      ok: false;
      error: Extract<FinnImportErrorCode, "already_used" | "unavailable" | "token_invalid">;
    };

/**
 * مفتاح توقيع **مستقل** لاستيراد فِن (قرار ٢٠٢٦/١٠/٣١): لا احتياط إلى `SADEED_MESSAGE_APPROVAL_SECRET`.
 * السبب: ذلك السرّ هو ما يفتح بوابة كتابة دردشة سَدِيد (`create_task` و`sec_*`…) وهي اليوم مغلقة
 * عند غيابه؛ فضبطه لتشغيل استيراد فِن كان سيفتح كتابات سَدِيد دون قرار. فصل المفاتيح = فصل الأثر.
 */
function importSecret(): string | null {
  const value = process.env.FINN_IMPORT_SIGNING_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

/** هل التأكيد قابل للعمل؟ لا ⇐ الميزة مغلقة (المعاينة والتنفيذ) بصدق. */
export function importConfirmationAvailable(): boolean {
  return importSecret() !== null;
}

/** بصمة الملف التي يلتزم بها الرمز: sha256 hex لبايتاته الخام. */
export function fileSha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function hmac(secret: string, encodedPayload: string): Buffer {
  return createHmac("sha256", secret)
    .update(`${FINN_IMPORT_TOKEN_DOMAIN}${encodedPayload}`)
    .digest();
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64Url(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  return Buffer.from(value, "base64url");
}

export async function signImportToken(input: {
  userId: string;
  fileSha256: string;
  parts: number;
  rows: number;
  now?: number;
}): Promise<SignImportTokenResult> {
  if (!input.userId || !SHA256_HEX.test(input.fileSha256)) {
    throw new TypeError("signImportToken: userId and a sha256 hex fingerprint are required");
  }
  if (
    !Number.isInteger(input.parts) ||
    input.parts < 0 ||
    !Number.isInteger(input.rows) ||
    input.rows < 0
  ) {
    throw new TypeError("signImportToken: parts and rows must be non-negative integers");
  }
  const secret = importSecret();
  if (!secret) return { ok: false, error: "confirmation_unavailable" };
  const exp = (input.now ?? Date.now()) + FINN_IMPORT_LIMITS.tokenTtlMs;
  const payload: ImportTokenPayload = {
    v: 1,
    uid: input.userId,
    sha: input.fileSha256,
    parts: input.parts,
    rows: input.rows,
    exp,
    n: toBase64Url(randomBytes(16)),
  };
  const encoded = toBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  return {
    ok: true,
    token: `${encoded}.${toBase64Url(hmac(secret, encoded))}`,
    nonce: payload.n,
    expiresAt: new Date(exp).toISOString(),
  };
}

function isPayload(value: unknown): value is ImportTokenPayload {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    p.v === 1 &&
    typeof p.uid === "string" &&
    p.uid.length > 0 &&
    typeof p.sha === "string" &&
    SHA256_HEX.test(p.sha) &&
    Number.isInteger(p.parts) &&
    Number.isInteger(p.rows) &&
    typeof p.exp === "number" &&
    Number.isFinite(p.exp) &&
    typeof p.n === "string" &&
    p.n.length > 0
  );
}

export async function verifyImportToken(
  token: string,
  expected: { userId: string; fileSha256: string; now?: number },
): Promise<VerifyImportTokenResult> {
  const secret = importSecret();
  if (!secret) return { ok: false, error: "confirmation_unavailable" };
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, error: "token_invalid" };
  }
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra !== undefined) return { ok: false, error: "token_invalid" };
  const actual = fromBase64Url(signature);
  const wanted = hmac(secret, encoded);
  // التوقيع أوّلًا بمقارنةٍ زمنها ثابت: لا تُقرأ حمولةٌ لم يثبت أنها منّا. `timingSafeEqual` يرمي
  // عند اختلاف الطول، فالطول يُفحص قبله (هو غير سرّي: طول HMAC معلوم).
  if (!actual || actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) {
    return { ok: false, error: "token_invalid" };
  }
  const payloadBytes = fromBase64Url(encoded);
  if (!payloadBytes) return { ok: false, error: "token_invalid" };
  let payload: unknown;
  try {
    payload = JSON.parse(payloadBytes.toString("utf8"));
  } catch {
    return { ok: false, error: "token_invalid" };
  }
  if (!isPayload(payload)) return { ok: false, error: "token_invalid" };
  if (payload.uid !== expected.userId) return { ok: false, error: "token_invalid" };
  if (payload.exp <= (expected.now ?? Date.now())) return { ok: false, error: "token_expired" };
  if (payload.sha !== expected.fileSha256) return { ok: false, error: "file_changed" };
  return {
    ok: true,
    nonce: payload.n,
    parts: payload.parts,
    rows: payload.rows,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

/**
 * يطالب بالرمز مرّةً واحدة. يُنادى بعد `verifyImportToken` وقبل أي كتابة. `{ ok: true }` لنداءٍ
 * واحد بالضبط لكل رمز؛ والباقي `already_used`. أي عطلٍ في المخزن ⇒ `unavailable`
 * (فشل مغلق: لا كتابة؛ وليس «غير مهيَّأ»: العطل عابر لا ضبط ناقص).
 */
export async function claimImportToken(input: {
  nonce: string;
  userId: string;
}): Promise<ClaimImportTokenResult> {
  if (!input.nonce || !input.userId) return { ok: false, error: "token_invalid" };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      _bucket_key: `fi-claim:${input.userId}:${input.nonce}`,
      _max_requests: 1,
      _window_seconds: FINN_IMPORT_CLAIM_WINDOW_SECONDS,
    });
    if (error || typeof data !== "boolean") return { ok: false, error: "unavailable" };
    return data ? { ok: true } : { ok: false, error: "already_used" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
