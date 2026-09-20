/**
 * ثقةُ التشغيل على `/live-dashboard` — **حسابٌ خالصٌ في وحدةٍ خالصة.**
 *
 * أُخرج من جسم دالّة الخادم عمدًا، ولم يُترك فيه دالّةً مُصدَّرة: الفرع
 * الذي يهمّ — «لا عيّنة إطلاقًا ⇐ لم يُقَس» — كان يُشهَد له باختبارٍ
 * نصّيّ يبحث عن سطره في الملفّ، وذلك يُثبت **وجود السطر لا بلوغَه**.
 *
 * وقد كان السطر غيرَ مبلوغٍ فعلًا: `auditTotal = auditRows.length || 1`
 * مقامُ قسمةٍ للشريحة، ومرَّ بوابةَ العيّنة فصار شرطُها صادقًا أبدًا.
 * فتُعرض «١٠٠٪» على قاعدةٍ خاوية — **بدليلٍ يدّعي رصد صفٍّ واحد لا وجود
 * له**، فيصير الاختلاق مُسنَدًا. والمادة ٢٧: نظامٌ لم يُشغَّل قط يُقرأ
 * كذلك، لا سليمًا خاملًا.
 *
 * فوحدةٌ بلا اعتماديّةِ خادمٍ واحدة، تُستدعى في الاختبار بمدخَلٍ فارغ.
 */
import { measured, unmeasured, type Grounded } from "./evidence";
import { percentFromRatio, type MeasuredPercent } from "./measured-percent";

/** طرفٌ مرصود: مصدرٌ وعددُ عيّناتٍ **خام** ونسبةُ نجاح. */
export type PulseSample = { source: string; n: number; pct: number };

/**
 * ثقةُ التشغيل من الأطراف المرصودة — **ما لا عيّنةَ له لا يدخل.**
 *
 * و`n` هنا **عددُ الصفوف لا مقامُ القسمة**: تمريرُ مقامٍ يحمل `|| 1` هو
 * بعينه ما جعل الفرع الفارغ ميتًا.
 *
 * **والمتوسّط مرجَّحٌ بعدد العيّنات.** طرفٌ بعيّنةٍ واحدة كان يزن ثلثَ
 * الرقم كطرفٍ بألف، و`n` يُكتب في الدليل ولا يدخل الحساب — فيُقرأ
 * ترجيحًا وليس به.
 */
export function pulseConfidence(
  samples: readonly PulseSample[],
  observedAt: string,
): Grounded<MeasuredPercent> {
  const observed = samples.filter((s) => s.n > 0 && Number.isFinite(s.pct));
  if (observed.length === 0) {
    return unmeasured("لا تنفيذات ولا تشغيلات ولا أحداث مرصودة — لا أساس لنسبة ثقة");
  }
  const weight = observed.reduce((sum, o) => sum + o.n, 0);
  const weighted = observed.reduce((sum, o) => sum + o.pct * o.n, 0) / weight;
  return measured(
    percentFromRatio(weighted / 100),
    observed.map((o) => ({
      kind: "db.query" as const,
      source: o.source,
      observedAt,
      value: o.n,
    })),
    "derived",
  );
}
