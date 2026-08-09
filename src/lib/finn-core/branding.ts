/**
 * اسم المساعد كما يُعرض — مصدر واحد لملفات `finn-core` و`components/finn`.
 *
 * قرار المالك ٢٠٢٦/٠٨/٠٩: المساعد يُنادى «سَدِيد». الاسم مقروء من
 * `BRAND_ASSISTANT` — مصدر اسم العرض الوحيد — لا مكتوبًا حرفًا هنا، فلا ينشأ
 * مصدران للاسم نفسه ولا يتخلّف أحدهما عن الآخر عند أي تعديل لاحق.
 *
 * ── الحدّ المقصود ──
 * هذا **نصّ عرض فقط**. المعرّفات الآلية تبقى `FINN` كما هي بنصّ CLAUDE.md:
 * مسارات `/api/finn/*` و`/api/chat`، وأسماء المكوّنات والملفات والدوال،
 * وأصناف CSS، ومفاتيح التخزين. إعادة تسمية أيٍّ منها تكسر عقدًا حيًّا ولا
 * يراها مستخدم — فالمكسب صفر والخسارة مؤكدة.
 */
import { BRAND_ASSISTANT, PRODUCT_BRAND } from "@/lib/domain";

/** الاسم العربي المشكول — للعناوين والنصوص المرئية. */
export const FINN_DISPLAY_NAME_AR = BRAND_ASSISTANT.nameAr;

/**
 * الاسم العربي بلا تشكيل — لِما يُقرأ آليًّا: `aria-label` و`title` ونصّ
 * النطق. علامات التشكيل تُتهجّى أو تُشوّه في قارئات الشاشة ومحرّكات النطق.
 */
export const FINN_DISPLAY_NAME_AR_PLAIN = PRODUCT_BRAND.arPlain;

/** الاسم اللاتيني — للواجهة الإنجليزية. */
export const FINN_DISPLAY_NAME_EN = BRAND_ASSISTANT.nameEn;

/** اسم العرض بحسب لغة الواجهة. */
export function finnDisplayName(ar: boolean): string {
  return ar ? FINN_DISPLAY_NAME_AR : FINN_DISPLAY_NAME_EN;
}
