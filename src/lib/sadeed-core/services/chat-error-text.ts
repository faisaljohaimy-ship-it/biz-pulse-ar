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

export const CHAT_CONNECTION_ERROR_AR = "تعذّر الاتصال — أعد المحاولة";

/** لحظة ازدحام: صادقة، تقول ما جرى ومتى يعود، بلا رمز. */
export const CHAT_BUSY_AR = "سَدِيد يستقبل طلباتٍ كثيرة الآن — أعد المحاولة بعد دقيقة.";

/** الخادم مشغول بطلباتٍ أخرى (سقف التزامن) — يعود خلال ثوانٍ. */
export const CHAT_SERVER_BUSY_AR = "سَدِيد مشغول بطلباتٍ أخرى الآن — أعد المحاولة بعد ثوانٍ.";
/** الطلب نفسه ما زال قيد المعالجة (نقرٌ مزدوج أو إعادة محاولة مبكرة). */
export const CHAT_DUPLICATE_AR = "طلبك السابق قيد المعالجة — انتظر لحظة.";

const KNOWN_CODES: Readonly<Record<string, string>> = Object.freeze({
  rate_limited: CHAT_BUSY_AR,
  rate_limit_unavailable: "تعذّر التحقّق من الطلب لحظيًّا — أعد المحاولة بعد لحظات.",
  quota_unavailable: "تعذّر التحقّق من الطلب لحظيًّا — أعد المحاولة بعد لحظات.",
  busy: CHAT_SERVER_BUSY_AR,
  duplicate_request: CHAT_DUPLICATE_AR,
  daily_global_cap: "بلغ النظام سقفه اليومي — تُستأنف الخدمة بعد منتصف الليل.",
  daily_identity_cap: "تجاوزت حصّتك اليومية — تعود الحصّة بعد منتصف الليل.",
});

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
    if (typeof parsed?.code === "string" && KNOWN_CODES[parsed.code.trim()]) {
      return KNOWN_CODES[parsed.code.trim()];
    }
    if (typeof parsed?.error === "string") {
      const known = KNOWN_CODES[parsed.error.trim()];
      if (known) return known;
      return safeArabic(parsed.error) ?? CHAT_CONNECTION_ERROR_AR;
    }
    return CHAT_CONNECTION_ERROR_AR;
  } catch {
    /* ليس JSON */
  }
  const known = KNOWN_CODES[text];
  if (known) return known;
  return safeArabic(text) ?? CHAT_CONNECTION_ERROR_AR;
}
