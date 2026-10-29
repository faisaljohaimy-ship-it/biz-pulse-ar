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
 * (`rag.server.ts:96` — الراية وحدها)؛ وإن غاب مفتاح التضمين فـ`embedText`
 * تعيد `null` قبل أي نداء (`embeddings.server.ts:16`) ويخرج المسار فارغًا
 * (`rag.server.ts:98-99`). فعدد ما خدمته من الأسئلة صفر ببناء الكود في الحالين
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
import { tokenize } from "../bm25.server";
import {
  listSeedCorpusEntries,
  searchSeedCorpus,
  type SeedCorpusEntry,
} from "../sources/seed-corpus.server";
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
      ...(flag ? [] : ["الراية SADEED_GEMINI_RAG_READY ليست true (rag.server.ts:96)"]),
      // موضع الحارس الثاني (غلاف embedText، سطر 16) في ترويسة الملف — لا يُكتب اسمه هنا
      // كي لا يُقرأ في نصّ التشغيل على أنه استيراد لغلاف التضمين (عقد البنية ②).
      ...(key ? [] : ["لا مفتاح تضمين في البيئة (embedText تعيد null ⇐ rag.server.ts:98-99)"]),
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
