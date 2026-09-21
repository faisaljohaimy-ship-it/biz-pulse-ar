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

/**
 * مفرداتُ المصير **لكلِّ جدولٍ على حدة** — مملوكةٌ هنا لا تُسلَّم.
 *
 * كُتب أوّلًا `FAILED = {failed, error}` ثم `pct = 100 − الفاشل ÷ الكلّ`،
 * وهي **«غيرُ الفاشل ÷ الكلّ»** لا «الناجح ÷ المنتهي». وقِيس أنّ ذلك
 * يُعطي «١٠٠٪» **وجوابُ القاعدة صادقٌ تمامًا**:
 *
 *   • منصّةٌ عالقةٌ كليًّا (`queued`/`running`/`pending_approval`) ⇒ ١٠٠٪.
 *   • `rejected`/`cancelled`/`expired`/`superseded` ⇒ ١٠٠٪.
 *   • `status` غائبٌ أو `null` ⇒ ١٠٠٪.
 *   • و`audit_logs` أسوأُها: عمودُه `DEFAULT 'recorded'` ويكتبه التطبيق
 *     بنفسه — **عدّادُ استعمالٍ لا دلالةَ نجاحٍ فيه أصلًا**، فأربعون صفًّا
 *     منه كانت تُعطي «١٠٠٪» بدليلٍ صادقٍ يجعلها تبدو مقيسة. وذاك أسوأ
 *     من الرقم العاري.
 *
 * و`'error'` لم يكن قيمةً مشروعةً في أيٍّ من القيدين — نصفُ المجموعة
 * ميتٌ لا يطابق شيئًا.
 *
 * فالقاعدة الآن قاعدةُ `bridge.functions.ts`: **المقام تشغيلاتٌ منتهيةٌ
 * معلومةُ المصير وحدها.** وما لم يُحسم بعدُ لا يُحسب نجاحًا ولا إخفاقًا
 * — يخرج من الكسر كلِّه. ومنصّةٌ كلُّها عالقة تعود «لم يُقَس»، وهو صدقٌ:
 * لا مصيرَ رُصد.
 *
 * والمفرداتُ **مملوكةٌ هنا ومفهرسةٌ بالمصدر** لا تُسلَّم عند النداء:
 * تسليمُها كان `isFailure` وقِيس نافذًا (‏`r.status === "__never__"`
 * يُعطي ١٠٠٪ بشكلٍ سليمٍ تمامًا).
 */
const OUTCOMES: Record<
  string,
  { readonly ok: readonly string[]; readonly bad: readonly string[] }
> = {
  tool_executions: { ok: ["succeeded"], bad: ["failed"] },
  workflow_runs: { ok: ["succeeded"], bad: ["failed"] },
  agent_runs: { ok: ["succeeded", "completed"], bad: ["failed"] },
};

/**
 * طرفٌ مرصود — **مصدرٌ وصفوفُه الخام كما عادت من الاستعلام.**
 *
 * لا عددَ ولا نسبةَ ولا مُميِّزَ إخفاقٍ ولا متغيّرًا وسيطًا: كلُّ واحدٍ
 * منها قِيس منفذًا للتزوير. ويُسلَّم `data` بما فيه `null`، فلا موضعَ
 * حشوٍ عند النداء.
 *
 * **ولا يُدَّعى أكثر من ذلك.** كُتب هنا أنّ «تزوير الرقم يلزمه تزويرُ
 * جواب القاعدة» فقِيس كاذبًا: الجوابُ صادقٌ والرقمُ مزوَّر، لأن الخلل
 * كان في الصيغة لا في المدخل. ومَن يملك تعديلَ هذه الوحدة يملك الرقم —
 * وما يحرسه حينئذٍ اختبارُ سلوكٍ يستدعي الدالّة بصفوفٍ حقيقية، لا نصٌّ
 * يصف نفسه.
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
      // **مصدرٌ بلا مفرداتِ مصيرٍ خطأُ برمجة، لا بياناتٌ ناقصة.** وهو
      // ما وقع بـ`audit_logs`: جدولٌ لا دلالةَ نجاحٍ فيه أُدخل مصدرَ ثقة.
      // والإسقاطُ الصامت يُخفيه، فيُرمى صريحًا ويسقط في الاختبار.
      const vocab = OUTCOMES[s.source];
      if (!vocab) {
        throw new Error(`مصدرُ ثقةٍ بلا مفرداتِ مصير: «${s.source}» — لا يُعرف نجاحُه من إخفاقه`);
      }
      const rows = s.rows ?? [];
      const ok = rows.filter((r) => vocab.ok.includes(r.status ?? "")).length;
      const bad = rows.filter((r) => vocab.bad.includes(r.status ?? "")).length;
      // المقام: المنتهي معلومُ المصير وحده. والمعلَّقُ يخرج من الكسر.
      const settled = ok + bad;
      return { source: s.source, n: settled, pct: settled ? (ok * 100) / settled : 0 };
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
