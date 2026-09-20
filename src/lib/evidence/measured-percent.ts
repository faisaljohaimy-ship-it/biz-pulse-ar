/**
 * نسبةٌ مقيسة — **نوعٌ معتمٌ لا يُحسب ولا يُعرض إلا عبر دوالّه.**
 *
 * ## لماذا نوعٌ لا نمط
 *
 * حُرست نِسَب الثقة في هذا المستودع بأربعة حرّاس نصّية متتابعة، ونجا
 * الصنفُ من كلّ واحدٍ منها:
 *
 *   ① حارس `* 100` ← نجا منه `confidence: 82` (مئويٌّ من البداية).
 *   ② حارس `confidence: 0.X` ← نجا منه العدد الصحيح.
 *   ③ حارسٌ على ملفّاتٍ بأعيانها ← نجا منه ملفٌّ خامس.
 *   ④ حارسُ الإقحام ← نجا منه `const pct = Math.round(c * 100)`،
 *      لأن الاسم غُسل إلى `c` قبل الضرب.
 *
 * والدرس أنّ الحارس النصّيّ يُهزَم بإعادة تسمية. فالقفل هنا في **النوع**:
 * القيمة كائنٌ معتمٌ بمفتاحٍ فريد، فـ
 *
 *   • `Math.round(p * 100)` ⇐ **خطأ ترجمة** (لا حساب على كائن).
 *   • `{p}%` في JSX ⇐ **خطأ ترجمة** (الكائن ليس `ReactNode`).
 *
 * وإعادةُ التسمية لا تنفع: النوع يسافر مع القيمة لا مع الاسم.
 *
 * ## والقيمة لا تُبنى إلا من عددٍ محدود
 *
 * `measuredPercent` يرفض `NaN` و`Infinity` رميًا. وما لا يُقاس أصلًا لا
 * يُبنى هنا: يُمثَّل `unmeasured(...)` من طبقة الإسناد، فيحمل **سببه**.
 */
import { type Grounded, isMeasured, unmeasuredLabel } from "./evidence";

// رمزٌ حقيقيّ لا `declare`: الأخير نوعٌ بلا وجودٍ عند التشغيل، فيُخفق
// البناء بـ`MEASURED_PERCENT is not defined`. وهذا يجمع الأمرين —
// مفتاحٌ موجود فعلًا، ونوعٌ فريدٌ لا يُزوَّر.
const MEASURED_PERCENT: unique symbol = Symbol("MeasuredPercent");

/** نسبةٌ ٠..١٠٠ مقيسة. معتمةٌ عمدًا — انظر ترويسة الملفّ. */
export type MeasuredPercent = { readonly [MEASURED_PERCENT]: number };

/**
 * يبني نسبةً مقيسة من عددٍ ٠..١٠٠. **يرمي على غير المحدود.**
 *
 * الرمي مقصود: `NaN` يمرّ في الحساب صامتًا ويُعرض «NaN%»، وذلك عطلُ
 * برمجةٍ في زيّ قياس.
 */
export function measuredPercent(value: number): MeasuredPercent {
  if (!Number.isFinite(value)) {
    throw new Error(`نسبةٌ غير محدودة (${value}) — ما لا يُقاس يُمثَّل غيابًا لا رقمًا`);
  }
  return { [MEASURED_PERCENT]: Math.max(0, Math.min(100, value)) } as MeasuredPercent;
}

/** يبني نسبةً من نسبةٍ ٠..١ (‏`3/4` ⇒ ٧٥). */
export function percentFromRatio(ratio: number): MeasuredPercent {
  return measuredPercent(ratio * 100);
}

/**
 * العدد الخام — **للحساب وحده، لا للعرض.**
 *
 * مسمًّى صراحةً كي يظهر في المراجعة: من يستدعيه يخرج من الحماية عامدًا.
 */
export function percentValue(p: MeasuredPercent): number {
  return p[MEASURED_PERCENT];
}

/** نصُّ العرض: «٨٧٪» حين تُقاس، و«لم يُقَس»/«Not measured» حين لا تُقاس. */
export function formatPercent(p: Grounded<MeasuredPercent>, ar: boolean): string {
  if (!isMeasured(p)) return unmeasuredLabel(ar);
  return `${Math.round(percentValue(p.value))}%`;
}

/**
 * نبرةٌ للعرض — **والغياب نبرةٌ رابعة لا يُطوى في «منخفض».**
 *
 * طيُّ «لم يُقَس» مع «٥٠٪» في لونٍ واحد يجعل الغياب يُقرأ قياسًا رديئًا.
 */
export function percentTone(
  p: Grounded<MeasuredPercent>,
  thresholds: { good: number; warn: number } = { good: 85, warn: 60 },
): "good" | "warn" | "bad" | "unmeasured" {
  if (!isMeasured(p)) return "unmeasured";
  const v = percentValue(p.value);
  if (v >= thresholds.good) return "good";
  if (v >= thresholds.warn) return "warn";
  return "bad";
}
