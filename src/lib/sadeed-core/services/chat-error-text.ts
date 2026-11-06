/**
 * نصّ خطأ الدردشة كما يُعرض في لوحة سَدِيد — عربيٌّ دائمًا، ولا رمز تقنيّ.
 *
 * ## ما الذي كُسر (المالك، ٢٠٢٦/١٠/١٦)
 *
 * لقطة جوال المالك: سؤالٌ عادي فظهر في فقاعة حمراء النصّ الخام
 * `rate_limit_unavailable`. كانت الفقاعة تعرض حقل `error` من جسم JSON كما هو
 * ما لم يشبه عبارة مصادقة — فكل رمزٍ إنجليزيّ يرسله الخادم يصل الشاشة حرفيًّا،
 * ومعه الجمل الإنجليزية مثل «SADEED is temporarily rate limited…».
 *
 * ## القاعدة
 *
 * 1. `message_ar` من الخادم أوّلًا (رسائل الحصّة اليومية تحملها).
 * 2. رمزٌ معروف ⇐ جملته العربية.
 * 3. نصٌّ فيه حروفٌ عربية ولا يشبه المصادقة ⇐ يُعرض بعد قناع أسماء المزوّدين.
 * 4. كل ما سوى ذلك — رمزٌ مجهول، إنجليزية، فراغ ⇐ الرسالة المحايدة.
 */
import { VENDOR_MASK_RE } from "@/lib/sadeed/vendor-mask";
import { CHAT_TIMEOUT_CODE } from "./chat-timeout";

export { CHAT_TIMEOUT_CODE };

export const CHAT_CONNECTION_ERROR_AR = "تعذّر الاتصال — أعد المحاولة";

/** لحظة ازدحام: صادقة، تقول ما جرى ومتى يعود، بلا رمز. */
export const CHAT_BUSY_AR = "سَدِيد يستقبل طلباتٍ كثيرة الآن — أعد المحاولة بعد دقيقة.";

/** الخادم مشغول بطلباتٍ أخرى (سقف التزامن) — يعود خلال ثوانٍ. */
export const CHAT_SERVER_BUSY_AR = "سَدِيد مشغول بطلباتٍ أخرى الآن — أعد المحاولة بعد ثوانٍ.";
/** الطلب نفسه ما زال قيد المعالجة (نقرٌ مزدوج أو إعادة محاولة مبكرة). */
export const CHAT_DUPLICATE_AR = "طلبك السابق قيد المعالجة — انتظر لحظة.";

/**
 * مهلة العميل (`sadeedAuthedFetch`): الدور لم يردّ في سقفه. يحمل `message`
 * في `TimeoutError` رمزَ `chat-timeout.ts`، فيصير نصًّا عربيًّا هنا — ولا يُعاد الدور
 * تلقائيًّا (إعادته تُنفق الحصّة والنموذج مرّةً ثانية على السؤال نفسه)؛
 * الإعادة بيد المستخدم.
 */
export const CHAT_TIMEOUT_AR = "استغرق الرد أطول من المعتاد — أعد المحاولة.";

/** هل خطأ الدردشة هذا مهلةُ العميل؟ (لا تُعاد تلقائيًّا.) */
export function isChatTimeout(error: { message?: string } | null | undefined): boolean {
  return error?.message === CHAT_TIMEOUT_CODE;
}

/** تعذّر التحقّق من الطلب (المخزن/الحصّة) — جملةٌ واحدة للرمزين. */
const VERIFY_FAILED_AR = "تعذّر التحقّق من الطلب لحظيًّا — أعد المحاولة بعد لحظات.";

const KNOWN_CODES: Readonly<Record<string, string>> = Object.freeze({
  [CHAT_TIMEOUT_CODE]: CHAT_TIMEOUT_AR,
  rate_limited: CHAT_BUSY_AR,
  rate_limit_unavailable: VERIFY_FAILED_AR,
  quota_unavailable: VERIFY_FAILED_AR,
  busy: CHAT_SERVER_BUSY_AR,
  duplicate_request: CHAT_DUPLICATE_AR,
  daily_global_cap: "بلغ النظام سقفه اليومي — تُستأنف الخدمة بعد منتصف الليل.",
  daily_identity_cap: "تجاوزت حصّتك اليومية — تعود الحصّة بعد منتصف الليل.",
});

// Inherited Object.prototype names (e.g. "toString", "__proto__") are not
// error codes. A truthy inherited function/object must never escape to the UI.
function knownCodeMessage(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const key = code.trim();
  return Object.prototype.hasOwnProperty.call(KNOWN_CODES, key) ? KNOWN_CODES[key] : null;
}

const AUTH_SHAPED = /authenticat|unauthor|token|jwt|bearer|api[\s_-]?key/i;
const HAS_ARABIC = /[؀-ۿ]/;

function safeArabic(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed || !HAS_ARABIC.test(trimmed) || AUTH_SHAPED.test(trimmed)) return null;
  const masked = trimmed.replace(VENDOR_MASK_RE, "").trim();
  return masked || null;
}

/** يحوّل نصّ `chat.error.message` إلى جملةٍ صالحة للعرض. */
export function chatErrorText(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return CHAT_CONNECTION_ERROR_AR;
  try {
    const parsed = JSON.parse(text) as { error?: unknown; message_ar?: unknown; code?: unknown };
    const fromServer = safeArabic(parsed?.message_ar);
    if (fromServer) return fromServer;
    const byCode = knownCodeMessage(parsed?.code);
    if (byCode) return byCode;
    if (typeof parsed?.error === "string") {
      const known = knownCodeMessage(parsed.error);
      if (known) return known;
      return safeArabic(parsed.error) ?? CHAT_CONNECTION_ERROR_AR;
    }
    return CHAT_CONNECTION_ERROR_AR;
  } catch {
    /* ليس JSON */
  }
  const known = knownCodeMessage(text);
  if (known) return known;
  return safeArabic(text) ?? CHAT_CONNECTION_ERROR_AR;
}
