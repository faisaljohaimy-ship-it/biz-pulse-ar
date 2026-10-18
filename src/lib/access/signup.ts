/**
 * «مستخدم جديد» — التحقّق من نموذج التسجيل (أمر المالك ٢٠٢٦/٠٩/٢٩).
 *
 * «اسمح للمستخدمين العاديين بتسجيل البلاغات بعد تسجيل الدخول بالرقم الوظيفي
 * والإيميل تحت خانة مستخدم جديد». والتفعيل **فوري للجميع** بقرار المالك: لا
 * سجلّ موظفين في النظام يُقارن به الرقم، فالرقم **نسبةٌ لا تحقّق** — يُتحقَّق
 * من صيغته ومن أنه غير مسجَّل بحسابٍ آخر (`staff_number_available` في القاعدة)،
 * ويُحفظ مع الحساب (`staff_accounts`) بـtrigger لا يُسقط التسجيل.
 *
 * الصلاحية لا تُكتب هنا ولا في بيانات المستخدم: العضوية تأتي من trigger
 * القاعدة، والقدرة على الإنشاء من سياسات RLS (ترحيل `20260929210000`).
 */
import { normalizeStaffNumber, validateStaffNumber } from "@/lib/access/staff-entry";

export interface SignupFields {
  readonly name: string;
  readonly staffNumber: string;
  readonly email: string;
  readonly password: string;
  readonly confirm: string;
}

export type SignupErrors = Partial<Record<keyof SignupFields, string>>;

export const PASSWORD_MIN = 8;

/** أخطاء الحقول بالعربية — كائنٌ فارغ حين يصحّ النموذج كلّه. */
export function validateSignup(f: SignupFields): SignupErrors {
  const e: SignupErrors = {};
  const name = f.name.trim();
  if (name.length < 2) e.name = "اكتب اسمك الكامل";
  else if (name.length > 80) e.name = "الاسم أطول من ٨٠ حرفًا";
  const staff = validateStaffNumber(f.staffNumber);
  if (staff) e.staffNumber = staff;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "اكتب بريدًا إلكترونيًا صحيحًا";
  if (f.password.length < PASSWORD_MIN) e.password = "كلمة المرور ٨ أحرف على الأقل";
  if (f.confirm !== f.password) e.confirm = "كلمتا المرور غير متطابقتين";
  return e;
}

/** بيانات التسجيل المرسلة إلى Supabase — الرقم مطبَّعًا (أرقام إنجليزية). */
export function signupMetadata(f: SignupFields): { name: string; staff_number: string } {
  return { name: f.name.trim(), staff_number: normalizeStaffNumber(f.staffNumber) };
}

/** رسالة خطأ Supabase ← عربية محايدة (بلا عبارات مصادقة تقنية للمستخدم). */
export function signupErrorMessage(raw: string): string {
  if (/already registered|already exists|user_already_exists/i.test(raw))
    return "هذا البريد مسجَّل مسبقًا — استخدم «تسجيل الدخول».";
  if (/password/i.test(raw)) return "كلمة المرور لا تستوفي الشروط — جرّب كلمة أطول وأقوى.";
  if (/rate|too many/i.test(raw)) return "محاولاتٌ كثيرة — انتظر قليلًا ثم أعد المحاولة.";
  if (/signup.*disabled|not allowed/i.test(raw))
    return "التسجيل مغلق حاليًا — تواصل مع مسؤول النظام.";
  return "تعذّر إنشاء الحساب الآن — أعد المحاولة.";
}

/**
 * خطأ الدخول من Supabase/Google ← رسالةٌ محايدة بلغة الواجهة، لا تعيد نصّ الخادم أبدًا
 * (أمر المالك ٢٠٢٦/١٠/١٨: «Display clear Arabic errors without exposing sensitive
 * information»). وكانت صفحة الدخول تعرض `error.message` الخام بالإنجليزية.
 * و«غير صحيحة» تجمع البريد وكلمة المرور معًا عمدًا: لا يُكشف أيّهما الخاطئ.
 */
export function signinErrorMessage(raw: string, ar = true): string {
  if (
    /invalid login credentials|invalid_credentials|invalid_grant|invalid email or password/i.test(
      raw,
    )
  )
    return ar ? "البريد أو كلمة المرور غير صحيحة." : "The email or password is incorrect.";
  if (/email not confirmed|email_not_confirmed/i.test(raw))
    return ar
      ? "البريد غير مؤكَّد بعد — افتح رسالة التأكيد في بريدك."
      : "This email is not confirmed yet — open the confirmation message.";
  if (/rate|too many/i.test(raw))
    return ar
      ? "محاولاتٌ كثيرة — انتظر قليلًا ثم أعد المحاولة."
      : "Too many attempts — wait a moment.";
  if (/fetch|network|timeout|timed out|unavailable|gateway|\b5\d\d\b/i.test(raw))
    return ar
      ? "تعذّر الوصول إلى خدمة الدخول الآن — أعد المحاولة بعد قليل."
      : "The sign-in service is unreachable right now — try again shortly.";
  return ar ? "تعذّر تسجيل الدخول الآن — أعد المحاولة." : "Sign-in failed — try again.";
}
