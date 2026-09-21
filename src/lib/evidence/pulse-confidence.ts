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
 * فالقاعدة الآن: **المقام تشغيلاتٌ منتهيةٌ معلومةُ المصير وحدها.**
 * (كُتب هنا أنها «قاعدةُ `bridge.functions.ts`» فقِيس ذلك وصفًا كاذبًا:
 * مقامُ الجسر كان `completed + failed` ويُسقط `succeeded` — وهي منتهيةٌ
 * معلومة. فالمفرداتُ صارت مُصدَّرةً من هنا ويقرؤها الجسر، لا العكس.) وما لم يُحسم بعدُ لا يُحسب نجاحًا ولا إخفاقًا
 * — يخرج من الكسر كلِّه. ومنصّةٌ كلُّها عالقة تعود «لم يُقَس»، وهو صدقٌ:
 * لا مصيرَ رُصد.
 *
 * والمفرداتُ **مملوكةٌ هنا ومفهرسةٌ بالمصدر** لا تُسلَّم عند النداء:
 * تسليمُها كان `isFailure` وقِيس نافذًا (‏`r.status === "__never__"`
 * يُعطي ١٠٠٪ بشكلٍ سليمٍ تمامًا).
 */
export const OUTCOMES: Record<
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
/**
 * مصيرُ صفٍّ واحد — **مُصدَّرة كي لا تتكرّر المفردات فتفترق.**
 *
 * قِيس أنّ `bridge.functions.ts:167` يعدّ `"completed"` وحدها نجاحًا
 * بينما الكاتب `agent-runtime.server.ts:463` يكتب `"succeeded"` —
 * فوكيلٌ نجح سبعًا من ثمانٍ كان يُقرأ **صفرًا** بحلقةٍ حمراء. والملفّ
 * نفسه يعرف الاثنتين في سطرٍ آخر. فالمفردةُ الواحدة في موضعين تفترق،
 * وهذه هي علّةُ «أربع نسخ من `UNMEASURED_AR`» بعينها.
 */
export function outcomeOf(
  source: string,
  status: string | null | undefined,
): "ok" | "bad" | "pending" {
  const v = OUTCOMES[source];
  if (!v) throw new Error(`مصدرٌ بلا مفرداتِ مصير: «${source}»`);
  const st = status ?? "";
  if (v.ok.includes(st)) return "ok";
  if (v.bad.includes(st)) return "bad";
  return "pending";
}

/**
 * صفوفُ استعلام — **`null` عند الفشل، لا مصفوفةً فارغة.**
 *
 * `data ?? []` يطمس الفرق بين «لا صفوف» و«لم يُقرأ»: فشلُ الاستعلام أو
 * منعُ RLS يعطي `data: null` ⇐ `[]` ⇐ `critical = 0` ⇐ شريحةٌ
 * **خضراء**. والمادة ٢٧ تسمّي هذه الحالة بحرفها: «نظامٌ لم يُشغَّل قط
 * يُقرأ كذلك، **لا كنظامٍ سليمٍ خامل**».
 *
 * وكانت النسبُ كلُّها محصَّنةً في هذا الملفّ والعدّاداتُ كلُّها مكشوفة
 * — فصيلةٌ أعلى من المرض نفسه: لا استبدالُ الغياب صفرًا في الصفحة، بل
 * **طمسُ الفشل في مصدر البيانات**.
 */
export function rowsOf<T>(res: { data: T[] | null; error: unknown }): T[] | null {
  return res.error ? null : (res.data ?? []);
}

/** عدُّ صفوفٍ قد تكون غائبة. */
export function countOf(rows: readonly unknown[] | null): number | null {
  return rows ? rows.length : null;
}

/**
 * نسبةُ نجاحٍ على **المنتهي معلومِ المصير** — من المفردات الواحدة.
 *
 * كان كلُّ سطحٍ يعدّ الحالات بيده (`r.status === "failed"`)، فأعطى الصفُّ
 * الواحد **ثلاثة أجوبة**: عشرةُ تنفيذاتٍ كلُّها `queued` كانت تُقرأ
 * «TOOLS 100%» في الشريحة و«AVAILABILITY 0%» في المؤشّر و«لم يُقَس» في
 * الثقة. فالمعلَّقُ نجاحٌ هنا وإخفاقٌ هناك وغيابٌ ثالثًا — على شاشةٍ
 * واحدة. والمقام الآن `ok + bad` في الثلاثة، والمعلَّقُ خارجَها جميعًا.
 */
export function settledRate(
  source: string,
  rows: readonly { status?: string | null }[],
): number | null {
  const ok = rows.filter((r) => outcomeOf(source, r.status) === "ok").length;
  const bad = rows.filter((r) => outcomeOf(source, r.status) === "bad").length;
  return ok + bad === 0 ? null : Math.round((ok * 100) / (ok + bad));
}

export type PulseSample = {
  readonly source: string;
  readonly rows: readonly { readonly status?: string | null }[] | null | undefined;
};

export function pulseConfidence(
  samples: readonly PulseSample[],
  observedAt: string,
): Grounded<MeasuredPercent> {
  // **مصدرٌ معلَنٌ لم يُقرأ يمنع القياس كلَّه.**
  //
  // كان `s.rows ?? []` هنا — العلّةُ التي كُتبت هذه الوحدة لقتلها، حيّةً
  // داخلها. فمصدرٌ مرفوضٌ (‏`null`) يصير `[]` ⇒ `n = 0` ⇒ **يُسقطه
  // `filter(o => o.n > 0)` صامتًا** ⇒ يُحسب المتوسّط من الناجي وحده ⇒
  // «١٠٠٪» موسومةً `measured` بدليلٍ يستشهد بصفٍّ واحد.
  //
  // والفرقُ جوهريّ: «لا صفوف» قياسٌ، و«لم يُقرأ» غياب. وادّعاءُ قياسٍ
  // على أطرافٍ بعضُها مجهول **ادّعاءُ حصرٍ** — وهو الخطأ الذي تكرّر في
  // هذه السلسلة أكثر من أيّ غيره.
  const unread = samples.find((s) => s.rows == null);
  if (unread) {
    return unmeasured(
      `مصدرٌ معلَنٌ لم يُقرأ: «${unread.source}» — لا يُدَّعى قياسٌ على أطرافٍ مجهولة`,
    );
  }

  const observed = samples
    .map((s) => {
      // **مصدرٌ بلا مفرداتِ مصيرٍ خطأُ برمجة** — يرميه `outcomeOf`.
      const rows = s.rows as readonly { readonly status?: string | null }[];
      const ok = rows.filter((r) => outcomeOf(s.source, r.status) === "ok").length;
      const bad = rows.filter((r) => outcomeOf(s.source, r.status) === "bad").length;
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
