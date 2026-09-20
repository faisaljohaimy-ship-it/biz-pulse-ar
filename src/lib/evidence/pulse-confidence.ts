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

/** الحالات المعدودة إخفاقًا — **قاعدةٌ واحدة هنا، لا مُميِّزٌ يُسلَّم.** */
const FAILED = new Set(["failed", "error"]);

/**
 * طرفٌ مرصود — **مصدرٌ وصفوفُه الخام كما عادت من القاعدة.**
 *
 * كان النوع `{ source; n: number; pct: number }`، فكان المتَّصلُ يُسلّم
 * **نتيجةً** لا **رصدًا**، وأُفلت منه ثلاثًا: `n: rows.length || 1` ·
 * `pct: 100` · و`FailPct` مُعرَّفًا صفرًا. وكلُّ علاجٍ نصّيٍّ هُزم
 * بإعادة صياغة — خمس مرّات متتابعة.
 *
 * فلم يبقَ للمتَّصل ما يُسلّمه إلا **ما قرأته القاعدة**: لا عدٌّ ولا
 * نسبةٌ ولا مُميِّزُ إخفاق. وقِيس أنّ الثلاثة كانت منافذ:
 *
 *   • عددًا ونسبةً ⇐ يُزوَّران بكتابةٍ مباشرة.
 *   • مُميِّزًا (‏`isFailure`) ⇐ `r.status === "__never__"` يُعطي «١٠٠٪»
 *     دائمًا بشكلٍ سليمٍ تمامًا. فصارت القاعدة هنا، واحدةً للجميع.
 *   • ومصفوفةً محشوّة (‏`data ?? [{…}]`) ⇐ تُعطي «١٠٠٪» على قاعدةٍ
 *     خاوية. فصار المُسلَّم **`data` نفسه** بما فيه `null`، ويُعالَج
 *     الغيابُ هنا — فلا موضعَ حشوٍ عند النداء أصلًا.
 *
 * ولتزوير الرقم اليوم يلزم تزويرُ **جواب القاعدة**، لا وسمٌ عند النداء.
 */
export type PulseSample = {
  readonly source: string;
  readonly rows: readonly { readonly status?: string | null }[] | null | undefined;
};

export function pulseConfidence(
  samples: readonly PulseSample[],
  observedAt: string,
): Grounded<MeasuredPercent> {
  const observed = samples
    .map((s) => {
      const rows = s.rows ?? [];
      const failed = rows.filter((r) => FAILED.has(r.status ?? "")).length;
      return {
        source: s.source,
        n: rows.length,
        pct: rows.length ? 100 - (failed * 100) / rows.length : 0,
      };
    })
    .filter((o) => o.n > 0);
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
