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

/** أدنى وأقصى طول مقبول — واسعٌ عمدًا: صيغة أرقام المنشأة ليست معلومة لي. */
export const STAFF_NUMBER_MIN = 3;
export const STAFF_NUMBER_MAX = 12;

export const ERR_STAFF_REQUIRED = "الرقم الوظيفي مطلوب";
export const ERR_STAFF_DIGITS = "الرقم الوظيفي أرقامٌ فقط";
export const ERR_STAFF_LENGTH = `الرقم الوظيفي بين ${STAFF_NUMBER_MIN} و${STAFF_NUMBER_MAX} أرقامًا`;

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
  return raw
    .trim()
    .replace(/[\s‏‎-]/g, "")
    .split("")
    .map((ch) => {
      const ai = ARABIC_INDIC.indexOf(ch);
      if (ai > -1) return String(ai);
      const ea = EXTENDED_ARABIC_INDIC.indexOf(ch);
      if (ea > -1) return String(ea);
      return ch;
    })
    .join("");
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

/** صفّ السجلّ كما يُعرض ويُخزَّن. */
export interface StaffEntry {
  readonly staff_number: string;
  /** ISO — وقت الدخول. */
  readonly entered_at: string;
  /** المسار الذي قُصد قبل السؤال. */
  readonly path: string;
}
