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
  /authenticat|unauthor|token|forbidden|permission denied|jwt|bearer|api[\s_-]?key|غير مصرّ?ح|غير مصرح|صلاحي/i;

/** رسالة الحال العامّة — تقول ما جرى وما بقي ممكنًا، بلا اسم مورّد. */
export const GENERIC_ERROR_AR = "تعذّر عرض هذه الشاشة الآن. حاول مرّة أخرى بعد لحظات.";

/** رسالة الجلسة — صادقة دون أن تكشف بنيةً ولا تطلب من مديرٍ قراءة سجلّ. */
export const SESSION_ERROR_AR =
  "انتهت الجلسة أو لم تبدأ بعد. أعد المحاولة أو سجّل الدخول للمتابعة.";

/**
 * نصّ خطأٍ صالح للعرض على واجهة عربية.
 *
 * يعيد **دائمًا** نصًّا عربيًّا: رسالة الجلسة لما يشبه المصادقة، ورسالة
 * الحال العامّة لكل ما سواه — بما فيه الفارغ والمجهول. لا يُمرَّر نصّ
 * المصدر إلى الشاشة في أي فرع.
 */
export function userFacingError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : ((error as { message?: unknown } | null)?.message ?? "");
  return SECRET_SHAPED.test(String(raw)) ? SESSION_ERROR_AR : GENERIC_ERROR_AR;
}

/** هل يشبه هذا الخطأ خطأ جلسة؟ — لعرض «تسجيل الدخول» بدل «إعادة المحاولة». */
export function isSessionError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  return SECRET_SHAPED.test(raw);
}
