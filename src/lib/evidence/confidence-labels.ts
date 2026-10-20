/**
 * نصوص درجة اليقين — **مصدرٌ واحد لموضعين ولما بعدهما.**
 *
 * تُعرض في لوح المخاطر المتوقَّعة (`sec-ops-insights`) وفي موجز القرار
 * (`bridge/BriefingStage`). ونسختان منها تفترقان يومًا فيقول
 * لوحٌ «مشتقّ» وآخر «محسوب» عن **الدرجة نفسها** في الشاشة الواحدة — وهي
 * علّة `UNMEASURED_AR` بعينها (أربع نسخ في هذا المستودع).
 *
 * وسبب وجودها أصلًا: كانت الشاشة تعرض «ثقة ٨٧٪» و«ثقة ٧٢٪». الأولى رقمٌ
 * يقوله نموذجٌ عن نفسه أو ثابتٌ مكتوب، والثانية `score` مقسومًا على مئة.
 * وكلتاهما تُرسم كأنها قياس. والمصطلح يقول **كيف عُرف** ولا يدّعي دقّةً
 * بلا مصدر (المادة ٢٧).
 */
import type { Confidence } from "./evidence";

export const CONFIDENCE_LABEL: Record<Confidence, { readonly ar: string; readonly en: string }> = {
  measured: { ar: "مقيس", en: "Measured" },
  derived: { ar: "مشتقّ", en: "Derived" },
  estimated: { ar: "تقديريّ", en: "Estimated" },
};
