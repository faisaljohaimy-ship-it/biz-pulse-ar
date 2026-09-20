/**
 * طبقة الإسناد — **ادّعاءٌ بلا دليلٍ لا يُمثَّل في هذا النظام.**
 *
 * ## الفجوة التي تسدّها
 *
 * `./gate.ts` (المادة FR-19) يجيب سؤالًا واحدًا: **هل تُعرض هذه الشارة؟**
 * — له مصدرٌ ولحظةُ رصدٍ وطزاجة، و`EvidenceBadge` لا يرسم بلا دليل. وهو
 * محكمٌ فيما وُضع له.
 *
 * والسؤال الذي لا يجيبه، وهو الذي تجيبه هذه الطبقة: **هل قِيست القيمة
 * أصلًا؟** فالشارة إمّا تُرسم أو لا؛ أمّا الرقم داخل الصفحة فيمرّ بلا
 * حارس. والمقيس في الشيفرة قبل هذا الملفّ: `RiskRow` تحمل `severity`
 * و`status_ar` وحدهما — بلا مصدرٍ ولا لحظةِ قياس ولا ثقة.
 * و`RiskRecommendation` تحمل `why_ar` نصًّا حرًّا: **سببًا مكتوبًا لا
 * دليلًا مُسنَدًا**. ونصٌّ حرٌّ يشرح السبب أخطر من غيابه: يُقرأ إسنادًا
 * وهو إنشاء.
 *
 * ## ولا نوع `Evidence` ثانٍ — القاعدة صريحة
 *
 * FR-19 يسمّي `gate.ts` «single source of truth — do not fork». وكُتبت
 * هذه الطبقة أوّل مرّة بنوع `Evidence` خاصٍّ بها و`EvidenceKind` ثانٍ
 * **في المجلّد نفسه** — نظامان متوازيان لشيءٍ واحد، وهو بالضبط ما تصفه
 * النسخ الأربع من `UNMEASURED_AR`: تتغيّر إحداها ولا تتغيّر أخواتها.
 * فحُذف النوع الثاني، ووُسّع اتحاد `EvidenceKind` في `gate.ts` نفسه
 * بثلاثة أصنافٍ كانت ناقصة (مرجع مدمج · مشتقّ · إسنادٌ بشريّ)، وصار
 * `Evidence` هنا هو `Evidence` هناك حرفًا.
 *
 * والربط ليس في النوع وحده: `measured()` يرفض دليلًا يرفضه
 * `hasEvidence()` — فلا يمكن أن يوجد ادّعاءٌ «مقيس» يحمل دليلًا ترفض
 * الشارةُ رسمه. الطبقتان لا تفترقان في الحكم.
 *
 * ## و«لم يُقَس» قيمةٌ أولى لا `null`
 *
 * المادة ٢٧ في هذا المشروع: ما لم يُقَس يُعرض «لم يُقَس»، والصفر ليس
 * بديلًا عن الغياب. و`null` يحمل المعنى بلا أن يحمل **سببه**، فيتساوى
 * «لا مصدر» و«المصدر صامت» و«الحقل غير مطبَّق» — وهي ثلاثة قرارات
 * مختلفة. فالغياب هنا يحمل سببه معه إجباريًّا.
 */
import { hasEvidence, type Evidence } from "./gate";

export type { Evidence, EntityRef, EvidenceKind } from "./gate";

/**
 * درجة اليقين — مصطلحاتٌ ثلاث لا مقياسٌ عدديّ.
 *
 * رقمٌ مثل «ثقة ٠٫٨٧» يوحي بدقّةٍ لا مصدر لها، ويُقارَن بما لا يُقارَن.
 * والثلاث تصف **كيف عُرف** لا كم نثق: قِيس · اشتُقّ · قُدِّر.
 */
export type Confidence = "measured" | "derived" | "estimated";

/** ادّعاءٌ مقيس ومُسنَد. */
export interface GroundedValue<T> {
  readonly measured: true;
  readonly value: T;
  readonly evidence: readonly Evidence[];
  readonly confidence: Confidence;
}

/** غيابٌ يحمل سببه. */
export interface UnmeasuredValue {
  readonly measured: false;
  /** لماذا لم يُقَس — لا يجوز أن يكون فارغًا. */
  readonly reason: string;
}

export type Grounded<T> = GroundedValue<T> | UnmeasuredValue;

/**
 * نصّ الغياب — **مُعاد تصديره لا مُعاد تعريفه.**
 *
 * وُجدت في المستودع **أربع نسخ** متطابقة من هذا الثابت
 * (`sec-exec-kpis.functions` · `reports/report-document.types` ·
 * `reports/pdf-rich` · `reports/report-model`). وخامسةٌ هنا تزيد الاحتمال
 * الذي تقوم عليه العلّة: نسخةٌ تتغيّر وأخواتها لا، فتقول الشاشة غير ما
 * يقول الملفّ المطبوع عن **الشيء نفسه**.
 *
 * فيُقرأ من `report-document.types` — وهو الوحيد بلا اعتماديّة واحدة،
 * فلا يجرّ طبقة الرسم إلى وحدةٍ أساسية. وحارسٌ في الاختبار يُثبت تطابق
 * الأربع، فالافتراق يسقط بدل أن يُكتشف على ورقةٍ مطبوعة.
 */
export { UNMEASURED_AR as UNMEASURED_TEXT_AR } from "@/lib/reports/report-document.types";
import { UNMEASURED_AR } from "@/lib/reports/report-document.types";

/**
 * يبني ادّعاءً مقيسًا. **يرمي على دليلٍ غائبٍ أو غير صالح.**
 *
 * الرمي مقصود: إعادةُ «غير مقيس» بصمتٍ عند غياب الدليل تُخفي عطلَ برمجةٍ
 * في زيّ نقصِ بيانات، فيُقرأ «لم يُقَس» وهو «نسي المطوّر الإسناد».
 *
 * والصلاحية تُقاس بـ`hasEvidence` نفسه الذي تقيس به الشارة — لا بفحصٍ
 * ثانٍ يفترق عنه، فيصير ادّعاءٌ «مقيسًا» هنا و«بلا دليل» هناك.
 */
export function measured<T>(
  value: T,
  evidence: readonly Evidence[],
  confidence: Confidence = "measured",
): GroundedValue<T> {
  if (evidence.length === 0) {
    throw new Error("ادّعاءٌ مقيس بلا دليل — الإسناد شرطُ التمثيل لا تحسينُه");
  }
  // `hasEvidence` مُحدِّدُ نوع، فنفيُه على `Evidence` يضيّق إلى `never`.
  // فيُلفّ في دالّةٍ تعيد منطقيًّا خالصًا — الفحص نفسه بلا تضييق.
  const valid = (e: Evidence): boolean => hasEvidence(e);
  const bad = evidence.find((e) => !valid(e));
  if (bad) {
    throw new Error(`دليلٌ لا يجتاز حارس FR-19 — المصدر «${bad.source}» بلا لحظةِ رصدٍ صالحة`);
  }
  return { measured: true, value, evidence, confidence };
}

/** يبني غيابًا يحمل سببه. **يرمي على سببٍ فارغ.** */
export function unmeasured(reason: string): UnmeasuredValue {
  if (reason.trim().length === 0) {
    throw new Error("غيابٌ بلا سبب — «لم يُقَس» تُفقد معناها بلا بيانِ لماذا");
  }
  return { measured: false, reason };
}

export function isMeasured<T>(g: Grounded<T>): g is GroundedValue<T> {
  return g.measured;
}

/**
 * نصُّ العرض — القيمة حين تُقاس، و«لم يُقَس» حين لا تُقاس.
 *
 * **ولا يُمرَّر الصفر مكان الغياب**: التنسيق لا يُستدعى أصلًا على غير
 * المقيس، فلا سبيل إلى أن يصير الغياب رقمًا في الطريق إلى الشاشة.
 */
export function displayOf<T>(g: Grounded<T>, format: (v: T) => string): string {
  return isMeasured(g) ? format(g.value) : UNMEASURED_AR;
}

/** القيمة إن قِيست، وإلا البديل — لحسابٍ داخليّ لا لعرض. */
export function valueOr<T>(g: Grounded<T>, fallback: T): T {
  return isMeasured(g) ? g.value : fallback;
}

/**
 * جسرٌ إلى `EvidenceBadge` — دليلُ الادّعاء إن قِيس، و`null` إن لم يُقَس.
 *
 * و`null` هنا ليس نقصًا بل هو العقد: الشارة لا ترسم شيئًا بلا دليل
 * (FR-19). فادّعاءٌ غير مقيس **لا يُشار إليه بشارةٍ** أصلًا، بدل أن
 * يُرسم له رمزٌ باهتٌ يُقرأ قياسًا ضعيفًا وهو لا قياس.
 */
export function badgeEvidenceOf<T>(g: Grounded<T>): Evidence | null {
  return isMeasured(g) ? (g.evidence[0] ?? null) : null;
}

/**
 * يجمع أدلّة ادّعاءٍ مشتقّ من ادّعاءاتٍ أخرى.
 *
 * المشتقّ يرث أدلّة ما اشتُقّ منه: رقمٌ محسوبٌ من ثلاثة مصادر يجب أن
 * يقود إلى ثلاثتها، وإلا انقطعت سلسلة الإسناد عند أوّل حساب — وهو أكثر
 * ما يقع: يُسنَد المصدر ثم يُفقد الإسناد عند أوّل جمع أو متوسّط.
 *
 * وأيّ غيابٍ في المدخلات يجعل المخرَج غائبًا حاملًا سببه: متوسّطٌ يتجاهل
 * ما لم يُقَس يُقدَّم مقيسًا وهو ناقص.
 *
 * **ولحظةُ الرصد هنا `new Date()` وليست تلفيقًا**: FR-19 §3 يمنع تاريخًا
 * مكتوبًا بلا رصدٍ خلفه، ولحظةُ الاشتقاق **هي** الرصد — الحسابُ وقع
 * الآن، ودليلُه يحمل مدخلاته كلّها معه فيُتتبَّع إلى مصادرها الأولى.
 */
export function deriveFrom<T>(
  inputs: readonly Grounded<unknown>[],
  compute: () => T,
  opts?: { readonly source?: string },
): Grounded<T> {
  const missing = inputs.find((i): i is UnmeasuredValue => !i.measured);
  if (missing) return unmeasured(missing.reason);
  const evidence = inputs.flatMap((i) => (i as GroundedValue<unknown>).evidence);
  if (evidence.length === 0) return unmeasured("لا مدخلات مُسنَدة للاشتقاق");
  const self: Evidence = {
    kind: "derived.computed",
    source: opts?.source ?? "derived",
    observedAt: new Date().toISOString(),
  };
  return measured(compute(), [self, ...evidence], "derived");
}
