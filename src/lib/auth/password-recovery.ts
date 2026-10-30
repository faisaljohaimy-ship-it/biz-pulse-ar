/**
 * استعادة كلمة المرور من صفحة `/auth` — دوالّ خالصة، بلا وصولٍ إلى `window`.
 *
 * السبب (لقطات المالك ٢٠٢٦/١٠/٣٠، وسجلّ خدمة الهوية): ثلاث محاولات دخول بالبريد وكلمة المرور
 * ردّتها الخدمة `invalid_credentials` بينما الحساب موجودٌ ومؤكَّد وله كلمة مرور — أي أن المخزَّنة
 * لا تطابق ما يُكتب، ولا طريق في الواجهة لاستعادتها (وGoogle غير مفعّل بعد). فمن نسي كلمة مروره
 * بقي خارج النظام بلا مخرج. هذا الملف هو المخرج: طلب رابطٍ بالبريد، ثم كلمة مرور جديدة.
 *
 * ما يُحرس هنا: الرابط لا يُبنى على أصلٍ غير آمن (كحال `googleOAuthOptions`)، والرسائل ثابتة
 * لا تعكس نصّ الخادم ولا تحوي عبارات مصادقة تقنية، ولا تكشف إن كان البريد مسجَّلًا.
 */
import { PASSWORD_MIN } from "@/lib/access/signup";

/** وجهة العودة من رسالة الاستعادة: صفحة الدخول بوضع «كلمة مرور جديدة». */
export const RECOVERY_RETURN_PATH = "/auth?mode=reset";

/**
 * رابط العودة الذي يُمرَّر إلى `resetPasswordForEmail`. الأصل https (أو http على
 * localhost/127.0.0.1 للتطوير) بلا بيانات اعتماد مضمَّنة، وإلا يرمي — لا يُرسَل رابطُ استعادةٍ
 * إلى أصلٍ يختاره غيرُنا.
 */
export function recoveryRedirectTo(origin: string): string {
  const base = new URL(origin);
  const local = base.hostname === "localhost" || base.hostname === "127.0.0.1";
  if (
    base.username ||
    base.password ||
    (base.protocol !== "https:" && !(local && base.protocol === "http:"))
  ) {
    throw new Error("unsafe_auth_origin");
  }
  return new URL(RECOVERY_RETURN_PATH, base.origin).href;
}

/** صيغة بريدٍ معقولة (التحقّق الحقيقي عند الخادم). */
export function isEmailShape(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export { isRecoveryUrl } from "./recovery-url";

type NewPasswordError = "short" | "mismatch";

/** `null` حين تصحّ كلمة المرور الجديدة؛ وإلا سبب الرفض. القاعدة هي قاعدة التسجيل نفسها. */
export function newPasswordError(password: string, confirm: string): NewPasswordError | null {
  if (password.length < PASSWORD_MIN) return "short";
  if (confirm !== password) return "mismatch";
  return null;
}

export type RecoveryErrorKind = "rate" | "network" | "weak" | "same" | "expired" | "other";

/** رسالة الخدمة الخام ← صنفٌ ثابت. النصّ الخام لا يصل المستخدم أبدًا. */
export function recoveryErrorKind(raw: string): RecoveryErrorKind {
  if (/\brate\b|too many|over_email_send_rate_limit|security purposes/i.test(raw)) return "rate";
  if (/same_password|different from the old/i.test(raw)) return "same";
  if (/weak_password|password should|at least \d+ char/i.test(raw)) return "weak";
  if (/session[_ ]missing|session_not_found|jwt expired|invalid jwt|expired/i.test(raw))
    return "expired";
  if (/fetch|network|timeout|timed out|unavailable|gateway|\b5\d\d\b/i.test(raw)) return "network";
  return "other";
}

export type RecoveryNotice =
  "sent" | "email_invalid" | "short" | "mismatch" | "updated" | "link_expired" | RecoveryErrorKind;

/**
 * نصوص الحالة. ثابتة، بجمل قصيرة. «sent» محايدةٌ عمدًا: تُقال سواء وُجد الحساب أم لا،
 * فلا تكشف أيّ البريدات مسجَّل.
 */
export function recoveryMessage(kind: RecoveryNotice, isAr: boolean): string {
  const ar: Record<RecoveryNotice, string> = {
    sent: "إن كان هذا البريد مسجَّلًا فقد أرسلنا إليه رابط الاستعادة. افتح الرسالة ثم اتبع الرابط. قد تصل خلال دقيقة، وراجع الرسائل غير المرغوبة.",
    email_invalid: "اكتب بريدًا إلكترونيًا صحيحًا.",
    short: "كلمة المرور ٨ أحرف على الأقل.",
    mismatch: "كلمتا المرور غير متطابقتين.",
    updated: "تم تحديث كلمة المرور. مرحبًا بعودتك.",
    link_expired: "رابط الاستعادة منتهٍ أو استُعمل من قبل. اطلب رابطًا جديدًا.",
    rate: "محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.",
    network: "تعذّر الوصول إلى الخدمة الآن. أعد المحاولة بعد قليل.",
    weak: "كلمة المرور لا تستوفي الشروط. جرّب كلمة أطول وأقوى.",
    same: "اختر كلمة مرور مختلفة عن السابقة.",
    expired: "رابط الاستعادة منتهٍ أو استُعمل من قبل. اطلب رابطًا جديدًا.",
    other: "تعذّر إكمال الطلب الآن. أعد المحاولة.",
  };
  const en: Record<RecoveryNotice, string> = {
    sent: "If this email is registered, we sent it a recovery link. Open the message and follow the link. It can take a minute, so check spam too.",
    email_invalid: "Enter a valid email address.",
    short: `Password must be at least ${PASSWORD_MIN} characters.`,
    mismatch: "The two passwords do not match.",
    updated: "Password updated. Welcome back.",
    link_expired: "The recovery link has expired or was already used. Request a new one.",
    rate: "Too many attempts. Wait a minute and try again.",
    network: "The service is unreachable right now. Try again shortly.",
    weak: "The password does not meet the requirements. Try a longer, stronger one.",
    same: "Choose a password different from the previous one.",
    expired: "The recovery link has expired or was already used. Request a new one.",
    other: "The request could not be completed. Try again.",
  };
  return (isAr ? ar : en)[kind];
}

/** الفاصل بين طلبين لرابط الاستعادة (الخدمة تحدّد دقيقةً لكل بريد). */
export const RECOVERY_COOLDOWN_MS = 60_000;
