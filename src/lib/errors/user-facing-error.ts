/**
 * رسالة الخطأ التي تصل المستخدم.
 *
 * ## القاعدة المنقوضة
 *
 * البند الثالث من «الطريقة المحفوظة» في `CLAUDE.md`:
 *
 * > **لا تُظهر أبدًا عبارات مصادقة للمستخدم** — أي رسالة تطابق
 * > `/authenticat|unauthor|token/i` تُستبدل برسالة عربية محايدة مع زر
 * > إعادة المحاولة.
 *
 * وكانت حدود الخطأ تطبع `error.message` كما هو و`dir="ltr"`. والمصدر
 * المقابل — `requireSupabaseAuth` — يرمي حرفيًّا
 * `"Unauthorized: No authorization header provided"`. فزائرٌ يفتح شاشةً
 * قراءتها خلف مصادقة يرى تلك الجملة بالإنجليزية على واجهةٍ عربية.
 *
 * ## لماذا هنا لا في كل حدّ على حدة
 *
 * ثلاثة حدود كانت تطبع الرسالة الخام، ولكلٍّ نصّه. قاعدةٌ منسوخة ثلاثًا
 * تُصلَح مرّتين ويُنسى ثالثها — وهو ما وقع فعلًا. فالمرشِّح واحد،
 * ومُدخَله `unknown` لأن ما يُرمى في جافاسكربت ليس `Error` بالضرورة.
 */

/**
 * ما لا يُعرض: عبارات المصادقة والصلاحيات ورموزها. يشمل الصيغة العربية
 * أيضًا — الترجمة لا تجعل تفصيلة البنية التحتية صالحةً للعرض.
 */
const SECRET_SHAPED =
  /authenticat|unauthor|token|forbidden|permission denied|jwt|bearer|api[\s_-]?key|غير مصرّ?ح|صلاحي/i;

/** رسالة الحال العامّة — تقول ما جرى وما بقي ممكنًا، بلا اسم مورّد. */
export const GENERIC_ERROR_AR = "تعذّر عرض الشاشة الآن. حاول مجددًا بعد لحظات.";

/** رسالة الجلسة — صادقة دون أن تكشف بنيةً ولا تطلب من مديرٍ قراءة سجلّ. */
export const SESSION_ERROR_AR = "انتهت الجلسة أو لم تبدأ. أعد المحاولة أو سجّل الدخول.";

/**
 * نصّ خطأٍ صالح للعرض على واجهة عربية.
 *
 * يعيد **دائمًا** نصًّا عربيًّا: رسالة الجلسة لما يشبه المصادقة، ورسالة
 * الحال العامّة لكل ما سواه — بما فيه الفارغ والمجهول. لا يُمرَّر نصّ
 * المصدر إلى الشاشة في أي فرع.
 */
function readableErrorMessage(error: unknown): string {
  try {
    return String(
      typeof error === "string" ? error : ((error as { message?: unknown } | null)?.message ?? ""),
    );
  } catch {
    // A thrown value can have a hostile message getter or string coercion.
    // The error boundary must still render a safe, anonymized fallback.
    return "";
  }
}

export function userFacingError(error: unknown): string {
  return isSessionError(error) ? SESSION_ERROR_AR : GENERIC_ERROR_AR;
}

/** Session errors can arrive as sanitized numeric HTTP statuses without auth keywords. */
export function isSessionError(error: unknown): boolean {
  if (SECRET_SHAPED.test(readableErrorMessage(error))) return true;
  try {
    const value = error as { status?: unknown; statusCode?: unknown } | null;
    // Some SDK envelopes expose both fields; a non-auth primary status must
    // not mask a numeric 401/403 in the secondary statusCode.
    const status = value?.status;
    if (status === 401 || status === 403) return true;
    const statusCode = value?.statusCode;
    return statusCode === 401 || statusCode === 403;
  } catch {
    // Error objects can expose hostile getters or proxies.
    return false;
  }
}
