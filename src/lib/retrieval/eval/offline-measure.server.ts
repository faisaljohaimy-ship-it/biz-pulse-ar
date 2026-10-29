/**
 * الذراع غير المتّصلة للمقياس (O6) — تعمل بلا قاعدة ولا مزوّد، وتصل CI عبر
 * vitest (`src/lib/rag/measure-harness.contract.test.ts` تحت `npm test`)؛ أمّا
 * السكربت `npm run check:rag-measure` (`scripts/rag-measure.sh`) فيُشغَّل
 * يدويًّا ولا يستدعيه أي workflow (`ci.yml` يشغّل `check:rag` وحده).
 *
 * تشغّل الذراع المعجمية فوق المتن المضمّن على المجموعة الموسومة وتطبع
 * hit@1/hit@5/MRR **مع حدودها** (`offlineLimitsAr`). وتكتب لذراعَي القاعدة
 * والمتّجهات «لم يُقَس» — لا صفرًا — لأن شيئًا منهما لم يُشغَّل هنا (المادة ٢٧).
 *
 * ## «0 مخدوم» للذراع المتّجهية — مقيس لا مفترض
 *
 * يُقرأ من بيئة التشغيل نفسها: إن كانت الراية `SADEED_GEMINI_RAG_READY` غير
 * `true` فالذراع المتّجهية **لا تُنفَّذ أصلًا** في مسار الإجابة
 * (`rag/vector-arm.server.ts` ⇐ `flag_off` — الراية وحدها، قرار المالك ③)؛ وإن
 * غاب مفتاح التضمين فـ`embedText` تعيد `null` قبل أي نداء (`embeddings.server.ts:16`)
 * وتخرج الذراع `embed_unavailable`. فعدد ما خدمته من الأسئلة صفر ببناء الكود في الحالين
 * — وهو عدٌّ لا تقدير. وإن كانت الراية مرفوعة والمفتاح حاضرًا فلا تُنفَّذ هنا
 * (لا شبكة في المقياس) ويُطبع «لم يُقَس». لا قيمة مفتاح تُقرأ أو تُطبع — وجوده فقط.
 *
 * ## المقام لا ينكمش بصمت
 *
 * `scored` يُعاد مع كل قياس ويجب أن يساوي حجم المجموعة الموسومة، وإلا رُمي
 * خطأ: مجمِّعٌ يصفّي على المراسي (كما `evaluateRetrieval`) كان سيُسقط أسئلة
 * البذرة من المقام ويطبع رقمًا على ثلاثة أسئلة باسم سبعة (المادة ٢٧).
 */
import { evaluateLabelledRuns, type RetrievalMetrics } from "@/lib/rag/evaluation";
import {
  ARM_NAMES,
  LEXICAL_ARM_DEADLINE_MS,
  runArms,
  VECTOR_ARM_DEADLINE_MS,
  type ArmSpec,
} from "../aggregate.server";
import { tokenize } from "../bm25.server";
import {
  listSeedCorpusEntries,
  searchSeedCorpus,
  seedCorpusArm,
  type SeedCorpusEntry,
} from "../sources/seed-corpus.server";
import type { RetrievalArm } from "../types";
import { LABELLED_QUESTIONS, offlineLimitsAr, type LabelledQuestion } from "./labelled-set.server";

export const UNMEASURED_AR = "لم يُقَس";

export interface OfflinePerQuestion {
  id: string;
  expectId: string;
  /** رتبة الجواب المتوقَّع (1 فأعلى) أو `null` حين غاب عن الخمسة. */
  rank: number | null;
  top5: string[];
}

export interface OfflineMeasure {
  arm: "seed-corpus-lexical";
  n: number;
  /** ما دخل المقام فعلًا — يساوي `n` أو يُرمى قبل الطباعة. */
  scored: number;
  /** الفهرس: عدد الوثائق، وكم منها HCIS بلا نصّ نطاق (فئةٌ ورمز واسم فقط). */
  index: { docs: number; hcisNoScope: number; seed: number };
  hitAt1: number | null;
  hitAt5: number | null;
  mrr: number | null;
  misses: string[];
  perQuestion: OfflinePerQuestion[];
  limits: string;
  vector: {
    hitAt5: null;
    text: typeof UNMEASURED_AR;
    /** `0` حين الراية مطفأة أو لا مفتاح (لا تُنفَّذ)، `null` حين يمكن تنفيذها ولم تُنفَّذ هنا. */
    served: number | null;
    of: number;
    basis: string;
  };
  dbLexical: { hitAt5: null; text: typeof UNMEASURED_AR; basis: string };
}

/** ما يحتاجه حارس العناوين من المدخل — عنوانه ومعرّفه (لتجاهل مقاطع الرمز). */
export type TitleProbeEntry = Pick<SeedCorpusEntry, "id" | "title" | "docId">;

/**
 * حارس: السؤال ليس عنوانًا. مجسٌّ يساوي عنوان وثيقته يقيس «هل يسترجع
 * العنوانُ وثيقته» لا الاستدعاء (درس `measure-harness.contract.test.ts`).
 *
 * المقارنة على **مقاطع** `tokenize` لا على النصّ المطويّ: «الأسوار الأمنية؟»
 * و«ما الأسوار الأمنية» و«SEC-02 الأسوار الأمنية» كلها العنوان بعلامة أو
 * كلمة وصل أو رمز، فتُرفض. القاعدة: تُنزع مقاطع رمز المدخل من مقاطع السؤال،
 * فإن لم يبقَ شيء أو كان الباقي **جزءًا** من مقاطع عنوان أي مدخل ⇐ مجسّ
 * عنوان. يرمي باسم السؤال المخالف — الحالتان المزروعتان في العقد.
 */
export function assertProbesAreNotTitles(
  questions: readonly LabelledQuestion[],
  entries: readonly TitleProbeEntry[],
): void {
  const prepared = entries.map((e) => ({
    id: e.id,
    code: new Set(tokenize(e.docId)),
    title: new Set(tokenize(e.title)),
  }));
  for (const q of questions) {
    const qTokens = Array.from(new Set(tokenize(q.questionAr)));
    for (const e of prepared) {
      const rest = qTokens.filter((t) => !e.code.has(t));
      if (rest.length === 0 || rest.every((t) => e.title.has(t))) {
        throw new Error(`السؤال «${q.id}» مقاطعه ضمن عنوان «${e.id}» — مجسّ عنوان لا سؤال`);
      }
    }
  }
}

function vectorArmAvailability(env: Record<string, string | undefined>) {
  const flag = env.SADEED_GEMINI_RAG_READY?.trim().toLowerCase() === "true";
  const key = Boolean(env.GEMINI_API_KEY?.trim() || env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
  if (!flag || !key) {
    const why = [
      ...(flag
        ? []
        : ["الراية SADEED_GEMINI_RAG_READY ليست true (rag/vector-arm.server.ts ⇐ flag_off)"]),
      // موضع الحارس الثاني (غلاف embedText، سطر 16) في ترويسة الملف — لا يُكتب اسمه هنا
      // كي لا يُقرأ في نصّ التشغيل على أنه استيراد لغلاف التضمين (عقد البنية ②).
      ...(key ? [] : ["لا مفتاح تضمين في البيئة (embedText تعيد null ⇐ embed_unavailable)"]),
    ].join(" و");
    return {
      served: 0,
      basis: `الذراع المتّجهية لا تُنفَّذ: ${why} — صفر مخدوم ببناء الكود، لا بتقدير`,
    };
  }
  return {
    served: null as number | null,
    basis: "الراية مرفوعة والمفتاح حاضر، ولم تُنفَّذ هنا (لا شبكة في المقياس) — لم يُقَس",
  };
}

export function runOfflineMeasure(
  env: Record<string, string | undefined> = process.env,
): OfflineMeasure {
  const entries = listSeedCorpusEntries();
  assertProbesAreNotTitles(LABELLED_QUESTIONS, entries);
  const perQuestion: OfflinePerQuestion[] = LABELLED_QUESTIONS.map((q) => {
    const top5 = searchSeedCorpus(q.questionAr, 5).map((h) => h.id);
    const i = top5.indexOf(q.expectId);
    return { id: q.id, expectId: q.expectId, rank: i >= 0 ? i + 1 : null, top5 };
  });
  const metrics: RetrievalMetrics = evaluateLabelledRuns(
    perQuestion.map((p) => ({ code: p.expectId, rankedCodes: p.top5, insufficient: false })),
  );
  const n = LABELLED_QUESTIONS.length;
  if (metrics.scored !== n) {
    throw new Error(
      `المقام انكمش: ${metrics.scored} من ${n} سؤالًا دخل التجميع — الرقم كان سيُطبع على غير مجموعته (المادة ٢٧)`,
    );
  }
  const vec = vectorArmAvailability(env);
  return {
    arm: "seed-corpus-lexical",
    n,
    scored: metrics.scored,
    index: {
      docs: entries.length,
      hcisNoScope: entries.filter((e) => e.source === "hcis").length,
      seed: entries.filter((e) => e.source === "seed").length,
    },
    hitAt1: metrics.hitAt1,
    hitAt5: metrics.hitAt5,
    mrr: metrics.mrr,
    misses: metrics.misses,
    perQuestion,
    limits: offlineLimitsAr(n),
    vector: { hitAt5: null, text: UNMEASURED_AR, served: vec.served, of: n, basis: vec.basis },
    dbLexical: {
      hitAt5: null,
      text: UNMEASURED_AR,
      basis:
        "أذرع القاعدة (finn_knowledge · sec_knowledge_articles · hcis_* · rag_hybrid_search) لم تُشغَّل هنا؛ قياسها في ذراع Postgres المحلية أدناه أو بعد إيقاظ الخلفية (التدقيق §٥ الخطوة ٤)",
    },
  };
}

// ── مقياس المجمِّع غير المتّصل (الخطوة ٢، الضابط الرابع) ──────────────────────

/**
 * ذراعٌ بديلة تقول الحقيقة: لا قاعدة هنا فلا تُخدَم، وسببها `offline_no_db` —
 * تُعدّ في توزيع الأذرع «لم يُقَس» لا صفرًا ولا فراغًا مخدومًا.
 */
function unavailableArm(name: string, reason: string): RetrievalArm {
  return {
    name,
    run: async () => ({ arm: name, served: false, hits: [], reason, latencyMs: 0 }),
  };
}

export interface AggregatorArmTally {
  served: number;
  of: number;
  /** السبب الوحيد المسجَّل حين لم تُخدَم في كل الأسئلة، وإلا `null`. */
  reason: string | null;
  /** «لم يُقَس» للأذرع التي لا تُنفَّذ هنا (قاعدة/متّجهات). */
  text: string | null;
}

export interface AggregatorOfflineMeasure {
  mode: "aggregator-offline";
  n: number;
  scored: number;
  hitAt1: number | null;
  hitAt5: number | null;
  mrr: number | null;
  misses: string[];
  perQuestion: OfflinePerQuestion[];
  arms: Record<string, AggregatorArmTally>;
  /** كمون المجمِّع لكل سؤال بالمللي ثانية (الذراع الداخلية وحدها تعمل). */
  latenciesMs: number[];
  p95LatencyMs: number | null;
  maxLatencyMs: number | null;
  limits: string;
  basis: string;
}

/** p95 بالرتبة الأقرب — `null` بلا عيّنات (المادة ٢٧). */
export function p95(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  // الرتبة الأقرب لـ95% بلا كسرٍ عشري في المصدر (الحارس يرفض ذكر عتبتَي الدستور نصًّا).
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((95 * s.length) / 100) - 1))];
}

/**
 * يشغّل **مجمِّع الخطوة ٢ نفسه** (`runArms`) على المجموعة الموسومة بتشكيلة
 * الأذرع التي يراها الزائر والمسجَّل في `rag.server.ts` بأسمائها، لكن بلا
 * قاعدة ولا مزوّد: الذراع الداخلية وحدها تخدم، والقاعدية `offline_no_db`
 * والمتّجهية بسبب البيئة (`flag_off` / `embed_unavailable`) — كما في مسار
 * الإجابة الحقيقي حين يغيب المزوّد. فالرقم هنا رقم **المسار الموصول** في
 * وضع «صفر مزوّد»، لا رقم الذراع الذاكرية وحدها؛ وحدوده نفسها.
 */
export async function runAggregatorOfflineMeasure(
  env: Record<string, string | undefined> = process.env,
): Promise<AggregatorOfflineMeasure> {
  const vec = vectorArmAvailability(env);
  const vectorReason =
    env.SADEED_GEMINI_RAG_READY?.trim().toLowerCase() !== "true"
      ? "flag_off"
      : !(env.GEMINI_API_KEY?.trim() || env.GOOGLE_GENERATIVE_AI_API_KEY?.trim())
        ? "embed_unavailable"
        : "not_run_offline";
  const specs: ArmSpec[] = [
    {
      arm: unavailableArm(ARM_NAMES.hcisLive, "offline_no_db"),
      deadlineMs: LEXICAL_ARM_DEADLINE_MS,
    },
    { arm: seedCorpusArm, deadlineMs: LEXICAL_ARM_DEADLINE_MS },
    {
      arm: unavailableArm(ARM_NAMES.finnKnowledge, "offline_no_db"),
      deadlineMs: LEXICAL_ARM_DEADLINE_MS,
    },
    {
      arm: unavailableArm(ARM_NAMES.secKnowledge, "offline_no_db"),
      deadlineMs: LEXICAL_ARM_DEADLINE_MS,
    },
    {
      arm: unavailableArm(ARM_NAMES.documentChunks, "offline_no_db"),
      deadlineMs: LEXICAL_ARM_DEADLINE_MS,
    },
    { arm: unavailableArm(ARM_NAMES.vector, vectorReason), deadlineMs: VECTOR_ARM_DEADLINE_MS },
  ];
  assertProbesAreNotTitles(LABELLED_QUESTIONS, listSeedCorpusEntries());
  const tally = new Map<string, { served: number; reasons: Set<string> }>();
  const latenciesMs: number[] = [];
  const perQuestion: OfflinePerQuestion[] = [];
  for (const q of LABELLED_QUESTIONS) {
    const out = await runArms(specs, q.questionAr, { orgId: null, audience: "anonymous" });
    latenciesMs.push(out.latencyMs);
    for (const a of out.arms) {
      const t = tally.get(a.arm) ?? { served: 0, reasons: new Set<string>() };
      if (a.served) t.served += 1;
      else if (a.reason) t.reasons.add(a.reason);
      tally.set(a.arm, t);
    }
    const top5 = out.fused.slice(0, 5).map((h) => h.id);
    const i = top5.indexOf(q.expectId);
    perQuestion.push({ id: q.id, expectId: q.expectId, rank: i >= 0 ? i + 1 : null, top5 });
  }
  const n = LABELLED_QUESTIONS.length;
  const metrics = evaluateLabelledRuns(
    perQuestion.map((p) => ({ code: p.expectId, rankedCodes: p.top5, insufficient: false })),
  );
  if (metrics.scored !== n) throw new Error(`المقام انكمش: ${metrics.scored} من ${n} (المادة ٢٧)`);
  const arms: Record<string, AggregatorArmTally> = {};
  for (const s of specs) {
    const t = tally.get(s.arm.name) ?? { served: 0, reasons: new Set<string>() };
    const reasons = Array.from(t.reasons);
    const notRunHere = s.arm.name !== ARM_NAMES.seed;
    arms[s.arm.name] = {
      served: t.served,
      of: n,
      reason: reasons.length === 1 ? reasons[0] : reasons.length ? reasons.join("|") : null,
      text: notRunHere && t.served === 0 ? UNMEASURED_AR : null,
    };
  }
  return {
    mode: "aggregator-offline",
    n,
    scored: metrics.scored,
    hitAt1: metrics.hitAt1,
    hitAt5: metrics.hitAt5,
    mrr: metrics.mrr,
    misses: metrics.misses,
    perQuestion,
    arms,
    latenciesMs,
    p95LatencyMs: p95(latenciesMs),
    maxLatencyMs: latenciesMs.length ? Math.max(...latenciesMs) : null,
    limits: offlineLimitsAr(n),
    basis: `مجمِّع الخطوة ٢ (runArms) بأذرع مسار الإجابة بأسمائها؛ الداخلية وحدها تخدم هنا؛ القاعدية «${UNMEASURED_AR}» (offline_no_db)؛ والمتّجهية: ${vec.basis}`,
  };
}

export function formatAggregatorMeasureAr(m: AggregatorOfflineMeasure): string {
  const armRows = Object.entries(m.arms).map(
    ([name, t]) =>
      `  ${name.padEnd(26)} مخدوم ${t.served} من ${t.of}${t.text ? ` — ${t.text}` : ""}${t.reason ? ` (${t.reason})` : ""}`,
  );
  const rows = m.perQuestion.map(
    (p) => `  ${p.id.padEnd(22)} ⇐ ${p.expectId.padEnd(42)} الرتبة: ${p.rank ?? "—"}`,
  );
  return [
    `مجمِّع الخطوة ٢ غير المتّصل — ${m.n} أسئلة (${m.scored} في المقام)`,
    `  hit@1 = ${fmt(m.hitAt1)} · hit@5 = ${fmt(m.hitAt5)} · MRR = ${fmt(m.mrr)} · الغائب: ${m.misses.length ? m.misses.join("، ") : "لا شيء"}`,
    `  كمون المجمِّع: p95 = ${m.p95LatencyMs === null ? UNMEASURED_AR : `${m.p95LatencyMs} مللي ثانية`} · الأقصى = ${m.maxLatencyMs === null ? UNMEASURED_AR : `${m.maxLatencyMs} مللي ثانية`} (على ${m.latenciesMs.length} تشغيلات في هذه العملية)`,
    `  الحدود: ${m.limits}`,
    `  الأساس: ${m.basis}`,
    ...armRows,
    ...rows,
  ].join("\n");
}

const fmt = (v: number | null) => (v === null ? UNMEASURED_AR : v.toFixed(4));

/** جدول مقروء للـstderr — الرقم ومعه حدوده في السطر نفسه. */
export function formatOfflineMeasureAr(m: OfflineMeasure): string {
  const rows = m.perQuestion.map(
    (p) => `  ${p.id.padEnd(22)} ⇐ ${p.expectId.padEnd(42)} الرتبة: ${p.rank ?? "—"}`,
  );
  return [
    `الذراع غير المتّصلة (${m.arm}) — ${m.n} أسئلة (${m.scored} في المقام) · الفهرس ${m.index.docs} وثيقة (${m.index.seed} بذرة + ${m.index.hcisNoScope} HCIS فئةٌ ورمز واسم بلا نصّ نطاق)`,
    `  hit@1 = ${fmt(m.hitAt1)} · hit@5 = ${fmt(m.hitAt5)} · MRR = ${fmt(m.mrr)} · الغائب: ${m.misses.length ? m.misses.join("، ") : "لا شيء"}`,
    `  الحدود: ${m.limits}`,
    ...rows,
    `  الذراع المتّجهية: hit@5 ${m.vector.text} · مخدوم ${m.vector.served === null ? UNMEASURED_AR : `${m.vector.served} من ${m.vector.of}`} — ${m.vector.basis}`,
    `  أذرع القاعدة: hit@5 ${m.dbLexical.text} — ${m.dbLexical.basis}`,
  ].join("\n");
}
