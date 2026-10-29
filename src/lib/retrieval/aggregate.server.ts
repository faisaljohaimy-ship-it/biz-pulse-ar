/**
 * مجمِّع الأذرع — تشغيلٌ متزامن بموعدٍ لكل ذراع، ودمجٌ بـRRF مع حفظ الإسهام.
 *
 * ## العطل الذي يصلحه (التدقيق `SADEED_RAG_AUDIT_2026-10-29.md` §٤ O2)
 *
 * كان `gatherRagContext` ذراعًا واحدة: `await embedText` **ثم** RPC. مزوّد
 * تضمين بطيء (مهلة `httpJson` 15 ث × محاولتين) يستهلك سباق مرحلة السياق
 * (2.5 ث) كلّه، فتضيع أي ذراع أخرى **تحديدًا حين يغيب المزوّد** — وهذه
 * الحالة التي أمر المالك أن «تعمل باستمرار» فيها. هنا كل ذراع تُشغَّل في
 * وعدها الخاص بموعدها الخاص: المعجمية ≤ `LEXICAL_ARM_DEADLINE_MS`،
 * والمتّجهية «أفضل جهد» محدودة بـ`VECTOR_ARM_DEADLINE_MS` **فلا تُسقط
 * المعجمية** — لكنها **تحجز نتيجة المعجمية حتى موعدها** (المقيس، مراجعة
 * ٢٠٢٦/١٠/٢٩: `Promise.all` ينتظر كل ذراع، فتضمينٌ معلّق 10 ث مع راية
 * مرفوعة يعيد المجمِّع عند ≈2,001 مللي ثانية والمعجمية مخدومة؛ وبلا راية عند
 * ≈3). دون سباق الدردشة (2.5 ث) فلا تضيع نتيجة، والتأخير ≤ 2 ث لكل دور مسجَّل
 * بالراية. «معجميةً أولًا» (الحلّ عند تسوية المعجمية) قرارُ خطوةٍ لاحقة.
 *
 * ## الهجر لا الانتظار
 *
 * تجاوز الموعد يُطلق `AbortController` الذراع ويعيد `{served:false,
 * reason:"timeout"}` فورًا؛ وعد الذراع البطيء يُترك خلفنا ولا يُنتظر —
 * `Promise.race` وحده (كما في `withDeadline` بمسار الدردشة) يترك النداء
 * يعمل، أمّا الإشارة فتهجره على الشبكة (`postgrest-js` يقبل `.abortSignal`).
 *
 * ## ذراعٌ فاشلة لا تُفرغ غيرها
 *
 * رمي الذراع يصير `{served:false, reason:"threw"}` (بلا نصّ الخطأ — قد يحمل
 * نصّ الاستعلام)، وتُدمج الأذرع التي خدمت كما لو لم تكن الفاشلة. الحالة
 * المزروعة في الاختبار: ذراع 10 ث مع ذراع 50 مللي ثانية ⇐ النتيجة في حدود
 * موعد البطيئة لا 10 ث، والسريعة مخدومة.
 *
 * ## ما ليس هنا
 *
 * لا قاعدة ولا مزوّد ولا شبكة (عقد البنية ②): الأذرع التي تقرأ القاعدة
 * تُبنى خارج هذا المجلد (`src/lib/sadeed/rag/*.server.ts`) وتُمرَّر إليه
 * كائناتٍ تنفّذ `RetrievalArm`.
 */
import { fuseRankedLists, type FusedHit } from "./fuse.server";
import type { ArmResult, RetrievalArm, RetrievalContext } from "./types";

/** الموعد الافتراضي للأذرع المعجمية (قراءة قاعدة أو فهرس ذاكري). */
export const LEXICAL_ARM_DEADLINE_MS = 1_500;
/**
 * موعد الذراع المتّجهية — أقلّ من سباق مرحلة السياق في الدردشة (2.5 ث) كي
 * تصل نتيجة المعجمية في وقتها مهما تأخّر التضمين.
 */
export const VECTOR_ARM_DEADLINE_MS = 2_000;
/** سقف النتائج المدموجة التي تُعاد للمستهلك. */
export const AGGREGATE_LIMIT = 12;

/**
 * أسماء الأذرع — مصدرٌ واحد للأذرع الحقيقية (`src/lib/sadeed/rag/`) وللمقياس
 * غير المتّصل (`eval/`) الذي يذكرها «لم يُقَس» بأسمائها نفسها. لا اسم مزوّد
 * فيها: تصل سجلّ الأحداث وبيانات الاستشهاد في JSON.
 */
export const ARM_NAMES = {
  /** (أ) الفهرس الداخلي — بذرة المستودع + أسماء HCIS. */
  seed: "seed-corpus-lexical",
  /** (ب) صفوف `hcis_*` الحيّة بسياسة `anon`. */
  hcisLive: "hcis-live-lexical",
  /** (ج) `finn_knowledge` تحت JWT المستدعي. */
  finnKnowledge: "finn-knowledge-lexical",
  /** (ج) `sec_knowledge_articles` المنشورة تحت JWT المستدعي. */
  secKnowledge: "sec-knowledge-lexical",
  /** (د) `finn_document_chunks` ⋈ `finn_documents.status='ready'` — سياقٌ «غير موثّق». */
  documentChunks: "document-chunks-lexical",
  /** (هـ) RPC المتّجهية خلف الراية والمفتاح. */
  vector: "vector",
} as const;

export type ArmName = (typeof ARM_NAMES)[keyof typeof ARM_NAMES];

export interface ArmSpec {
  arm: RetrievalArm;
  deadlineMs: number;
}

export interface AggregateOutcome {
  /** نتيجة كل ذراع بترتيب `specs` — مخدومة أو بسببها. */
  arms: ArmResult[];
  /** النتائج المدموجة بـRRF مع إسهام كل ذراع، مرتّبة ومرقّمة. */
  fused: FusedHit[];
  servedArms: string[];
  /** زمن المجمِّع كلّه — لا يتجاوز أطول موعد. */
  latencyMs: number;
}

/**
 * تشغيل ذراع واحدة بموعدها: مهلة ⇐ إلغاء الإشارة وإعادة `timeout`؛ رمي ⇐
 * `threw`. لا يرمي أبدًا. معرَّضة للاختبار المباشر.
 */
export async function runArmWithDeadline(
  spec: ArmSpec,
  query: string,
  ctx: RetrievalContext,
): Promise<ArmResult> {
  const { arm, deadlineMs } = spec;
  const started = Date.now();
  if (!(deadlineMs > 0)) {
    return { arm: arm.name, served: false, hits: [], reason: "deadline", latencyMs: 0 };
  }
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ArmResult>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({
        arm: arm.name,
        served: false,
        hits: [],
        reason: "timeout",
        latencyMs: Date.now() - started,
      });
    }, deadlineMs);
  });
  const attempt = (async (): Promise<ArmResult> => {
    try {
      const result = await arm.run(query, ctx, deadlineMs, controller.signal);
      // ذراعٌ تجاهلت الإشارة وأجابت بعد الموعد: السباق حُسم أصلًا، وهذا الفرع لا يُرى.
      return { ...result, arm: result.arm || arm.name };
    } catch {
      return {
        arm: arm.name,
        served: false,
        hits: [],
        reason: "threw",
        latencyMs: Date.now() - started,
      };
    }
  })();
  try {
    return await Promise.race([attempt, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * الأذرع كلّها متزامنة؛ تعود حين تُحسم كلّها (كلٌّ بموعدها، فالمجموع ≤ أطول
 * موعد). استعلام فارغ ⇐ لا ذراع تُشغَّل (`empty_query`). الدمج بترتيب
 * `specs`: الذراع الأولى تملك حقول النتيجة المشتركة (العنوان والمقتطف) حين
 * تُعيد ذراعان المعرّف نفسه — فتُقدَّم الذراع الأغنى نصًّا.
 */
export async function runArms(
  specs: readonly ArmSpec[],
  query: string,
  ctx: RetrievalContext,
  opts: { limit?: number } = {},
): Promise<AggregateOutcome> {
  const started = Date.now();
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      arms: specs.map((s) => ({
        arm: s.arm.name,
        served: false,
        hits: [],
        reason: "empty_query",
        latencyMs: 0,
      })),
      fused: [],
      servedArms: [],
      latencyMs: Date.now() - started,
    };
  }
  const arms = await Promise.all(specs.map((spec) => runArmWithDeadline(spec, trimmed, ctx)));
  const served = arms.filter((a) => a.served);
  const fused = fuseRankedLists(
    served.map((a) => ({ arm: a.arm, hits: a.hits })),
    { limit: opts.limit ?? AGGREGATE_LIMIT },
  );
  return {
    arms,
    fused,
    servedArms: served.map((a) => a.arm),
    latencyMs: Date.now() - started,
  };
}
