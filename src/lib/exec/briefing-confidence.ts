/**
 * P0-4 — ثقةُ الموجز التنفيذي **تُشتقّ من المرصود أو لا تُذكر.**
 *
 * ## العلّة المقيسة
 *
 * كان `ExecutiveBriefing.recommendation.confidence` رقمًا `0..1` مصدره
 * أحد اثنين، وكلاهما اختلاق:
 *
 *   • مسار النموذج: `Number(parsed.confidence ?? 0.8)` — **رقمٌ يقوله
 *     النموذج عن نفسه**، وافتراضيٌّ `0.8` حين لا يقوله.
 *   • المسار الحتميّ: `critical.length > 0 ? 0.78 : 0.86` — ثابتان
 *     مكتوبان بلا اشتقاق.
 *
 * وأخطر من عرضهما أنّ سَدِيد **ينطقهما**:
 * «التوصية: … مستوى الثقة ٨٦٪.» فتصل أذنَ مسؤولٍ نسبةٌ لا أصل لها،
 * ويُتصرَّف بها.
 *
 * ## السياسة — حتميّة، لا رقمٌ بديل
 *
 * البديل ليس رقمًا آخر. الثقة تصف **كيف عُرف** لا كم نثق:
 *
 *   • لا مشاهدة واحدة  ⇐ **لا تُذكر ثقة** (`unmeasured` بسببها).
 *   • مشاهداتٌ دون العتبة ⇐ `estimated`.
 *   • مشاهداتٌ فوقها      ⇐ `derived`.
 *
 * و`measured` **لا تقع هنا بحال**: العدّات مقيسة، أمّا كونُ التوصية
 * صائبةً فاستنتاجٌ عنها — والخلط بينهما هو العلّة نفسها في ثوبٍ أنظف.
 *
 * والمخرَج `Grounded<Confidence>` من طبقة الإسناد القائمة، لا نوعٌ ثانٍ:
 * إمّا درجةٌ تحمل أدلّتها، وإمّا غيابٌ يحمل سببه.
 */
import {
  measured,
  unmeasured,
  type Confidence,
  type Evidence,
  type Grounded,
} from "@/lib/evidence/evidence";

/** ما رُصد فعلًا وبُني عليه الموجز. */
export interface BriefingSignal {
  readonly openIncidents: number;
  readonly criticalIncidents: number;
  readonly activePatrols: number;
  readonly highRiskPermits: number;
}

/**
 * عتبة الاشتقاق.
 *
 * دون خمس مشاهدات لا يُقال «مشتقّ»: التوصية حينها مبنيّة على طرفٍ من
 * الصورة، والوصف الصادق «تقديريّ».
 */
export const DERIVED_THRESHOLD = 5;

/** مجموع ما رُصد — أساسُ الحكم. */
export function observationCount(s: BriefingSignal): number {
  return s.openIncidents + s.activePatrols + s.highRiskPermits;
}

/**
 * دليلُ الموجز: لقطةُ العدّات المرصودة لحظةَ القراءة.
 *
 * `observedAt` رصدٌ فعليّ لا تاريخٌ مكتوب — الاستعلام وقع الآن
 * (‏FR-19 §3).
 */
export function briefingEvidence(s: BriefingSignal, observedAt: string): Evidence {
  return {
    kind: "db.query",
    source: "sec_incidents,sec_patrols,sec_permits",
    observedAt,
    value: observationCount(s),
    limitation:
      observationCount(s) < DERIVED_THRESHOLD
        ? `عيّنة دون ${DERIVED_THRESHOLD} مشاهدات — التوصية على طرفٍ من الصورة`
        : undefined,
  };
}

/**
 * درجةُ ثقةِ التوصية — أو غيابُها حاملًا سببه.
 *
 * **لا تقبل رقمًا من نموذج ولا ثابتًا مكتوبًا**: مدخلها العدّات وحدها،
 * فلا سبيل إلى أن يُحقن فيها رقمٌ مختلَق.
 */
export function briefingConfidence(
  signal: BriefingSignal,
  observedAt: string,
): Grounded<Confidence> {
  const n = observationCount(signal);
  if (n === 0) {
    // صفرُ مشاهدات لا يعني «الوضع مطمئن»: يعني **لم يُرصد شيء**.
    // ونسبةُ ثقةٍ هنا هي الاختلاق في أصفى صوره.
    return unmeasured("لا مشاهدات تشغيلية مرصودة — لا يمكن إثبات درجة ثقة");
  }
  const grade: Confidence = n >= DERIVED_THRESHOLD ? "derived" : "estimated";
  return measured(grade, [briefingEvidence(signal, observedAt)], grade);
}

/**
 * ما يُنطق عن الثقة — **وصفٌ أو تصريحٌ بالغياب، لا نسبة.**
 *
 * كان المنطوق «مستوى الثقة ٨٦٪». والنسبة المنطوقة أشدّ أثرًا من
 * المعروضة: لا تحمل شارةً ولا مصدرًا، ويسمعها المسؤول قرارًا.
 */
export function spokenConfidenceAr(c: Grounded<Confidence>): string {
  if (!c.measured) return "ودرجة الثقة لا تُثبت: لا مشاهدات تشغيلية مرصودة.";
  return c.value === "derived"
    ? "وهذه التوصية مشتقّة من المشاهدات المرصودة."
    : "وهذه التوصية تقديرية على عيّنة محدودة.";
}

export function spokenConfidenceEn(c: Grounded<Confidence>): string {
  if (!c.measured) return "Confidence cannot be established: no operational observations recorded.";
  return c.value === "derived"
    ? "This recommendation is derived from recorded observations."
    : "This recommendation is estimated on a limited sample.";
}
