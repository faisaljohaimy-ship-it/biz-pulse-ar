/**
 * الرقم الوظيفي — بوابة **إسناد** لا بوابة أمان (أمر المالك ٢٠٢٦/٠٩/١٩).
 *
 * ## ما هذه ليست، ويجب أن يبقى مكتوبًا
 *
 * رقمٌ يُكتب في صندوق **ليس مصادقة**: لا يُتحقَّق من مصدره، ولا يُقارن
 * بسجلّ موظفين، ويستطيع أي زائر كتابة أي رقم. فهي لا تمنع أحدًا ولا تثبت
 * هوية، والبناء عليها كأنها حراسة خطأٌ يكلّف.
 *
 * وما تفعله فعلًا: **تُسند الاستعمال**. سؤالُ المالك كان «من دخل على
 * النظام ومن استخدمه بلا تسجيل» — وهذا ما تجيبه: سجلٌّ بالرقم والوقت
 * والمسار المقصود، يميّز من صرّح عن نفسه ممّن مرّ صامتًا.
 *
 * والحراسة الحقيقية تبقى دَينًا معلنًا: مصادقة وأدوار وRLS — راجع
 * `_audit/ACTION_REQUIRED.md`.
 *
 * ## لماذا القرار هنا لا في المكوّن
 *
 * التطبيع والتحقّق والنطاق **منطقٌ خالص يُختبر بالمساواة**. ولو كُتب في
 * المكوّن لصار المحروس نصَّ JSX لا القاعدة، ولَما أمكن إثبات أن «١٢٣٤٥»
 * بالأرقام العربية و«12345» شيءٌ واحد.
 */

/**
 * مفتاح التخزين — **عقدٌ حيّ لا يُعاد تسميته**.
 *
 * تغييرُه يُيتّم كل جهازٍ صرّح عن رقمه فيُسأل من جديد، ويكسر اتصال
 * السجلّ المحليّ بما سبقه. (نفس قاعدة `aria-voice-muted` و`theme`.)
 */
export const STAFF_NUMBER_KEY = "sadeed-staff-number";

/**
 * الطول المقبول — **خمسة أو ستة، لا ما بينهما وما حولهما** (أمر المالك
 * ٢٠٢٦/٠٩/٢٠).
 *
 * كان ٣–١٢ واسعًا عمدًا حين لم تكن صيغة أرقام المنشأة معلومة. وقد حُسمت:
 * الرقم الوظيفي في الشركة خمسة أو ستة أرقام. فالتوسعة لم تعد احتياطًا بل
 * بابًا يقبل «١٢٣» و«١٢٣٤٥٦٧٨» ويسجّلهما دخولًا صحيحًا.
 */
export const STAFF_NUMBER_MIN = 5;
export const STAFF_NUMBER_MAX = 6;

export const ERR_STAFF_REQUIRED = "الرقم الوظيفي مطلوب";
export const ERR_STAFF_DIGITS = "الرقم الوظيفي أرقامٌ إنجليزية فقط (0–9)";
export const ERR_STAFF_LENGTH = "الرقم الوظيفي خمسة أو ستة أرقام";
export const ERR_REGION_REQUIRED = "اختر المنطقة للدخول";

/** الأرقام العربية-الهندية ← اللاتينية. لوحة المفاتيح العربية تكتب ٠١٢٣. */
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

/**
 * التطبيع: يُزيل الفراغات ويوحّد الأرقام إلى اللاتينية.
 *
 * بغيره يصير «١٢٣٤٥» و«12345» رقمين مختلفين في السجلّ، فيُحسب موظفٌ
 * واحد اثنين — وهو عين ما وُجد السجلّ ليمنعه.
 */
export function normalizeStaffNumber(raw: string): string {
  return (
    raw
      .trim()
      // يُزال الفراغ وعلامتا الاتجاه (‏RLM/LRM) وحدها: أثرُ لصقٍ لا يراه
      // المستخدم. **والشرطة لا تُزال** — كانت ضمن المحذوف، فكان «102-54»
      // يمرّ دخولًا صحيحًا بعد أن يصير «10254». وذلك حذفُ حرفٍ مرئيّ كتبه
      // المستخدم، وتغييرٌ لرقمه بلا علمه، ونقضٌ لشرط «أرقام إنجليزية فقط».
      .replace(/[\s\u200e\u200f]/g, "")
      .split("")
      .map((ch) => {
        const ai = ARABIC_INDIC.indexOf(ch);
        if (ai > -1) return String(ai);
        const ea = EXTENDED_ARABIC_INDIC.indexOf(ch);
        if (ea > -1) return String(ea);
        return ch;
      })
      .join("")
  );
}

/** أوّل خطأٍ عربيّ، أو `null` إن صحّ الرقم. */
export function validateStaffNumber(raw: string): string | null {
  const value = normalizeStaffNumber(raw);
  if (value.length === 0) return ERR_STAFF_REQUIRED;
  if (!/^\d+$/.test(value)) return ERR_STAFF_DIGITS;
  if (value.length < STAFF_NUMBER_MIN || value.length > STAFF_NUMBER_MAX) return ERR_STAFF_LENGTH;
  return null;
}

/**
 * نطاق البوابة — **نفس بادئات المسارات التشغيلية، من مصدرٍ واحد.**
 *
 * الجذر سطحٌ تسويقيّ يبقى مفتوحًا: بوابةٌ عليه تطرد الزائر قبل أن يعرف ما
 * المنتج. وما عداه من الشاشات التشغيلية يُسأل عنده.
 *
 * ولماذا تُعاد القراءة من `operational-noindex` لا تُكتب قائمة ثانية:
 * قائمتان لنفس المفهوم تفترقان يومًا، فيُمنع مسارٌ من الفهرسة ولا يُسأل
 * عنده، أو العكس — وكلاهما خطأٌ صامت.
 */
export { isOperationalRoute as isGatedRoute } from "@/lib/seo/operational-noindex";

// `isRegionId` من عقد النطاق نفسه الذي يحكم العرض — لا قائمةَ مناطق ثانية
// هنا تفترق عن `regions.ts` يومًا.
import { isRegionId } from "@/lib/regions/region-scope";

/** صفّ السجلّ كما يُعرض ويُخزَّن. */
export interface StaffEntry {
  readonly staff_number: string;
  /** ISO — وقت الدخول. */
  readonly entered_at: string;
  /** المسار الذي قُصد قبل السؤال. */
  readonly path: string;
  /**
   * المنطقة المختارة عند الدخول — `null` للصفوف السابقة للحقل.
   *
   * **ولا تُملأ الفراغات بالافتراضي.** صفٌّ دخل قبل وجود الاختيار لم
   * تُعرف منطقته، وكتابة «الوسطى» فيه اختلاقُ إسنادٍ لم يقع (المادة ٢٧).
   */
  readonly region: string | null;
}

/**
 * تحقّق الدخول كاملًا — **الرقم والمنطقة معًا**.
 *
 * فُصل عن `validateStaffNumber` عمدًا: تلك تُجيب «هل الرقم صالح؟» وهذه
 * تُجيب «هل يُسمح بالدخول؟». وهما سؤالان مختلفان منذ صار الاختيار شرطًا،
 * وخلطُهما يجعل زرَّ الدخول يقرأ صلاحية الرقم وحده فيمرّ بلا منطقة.
 *
 * يعيد أوّل خطأ، أو `null` حين يصحّ الاثنان.
 */
export function validateEntry(input: {
  readonly staffNumber: string;
  readonly region: string | null | undefined;
}): string | null {
  const numberProblem = validateStaffNumber(input.staffNumber);
  if (numberProblem) return numberProblem;
  if (!isRegionId(input.region)) return ERR_REGION_REQUIRED;
  return null;
}
