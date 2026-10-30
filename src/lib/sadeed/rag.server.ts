// SADEED RAG context assembler — server only.
//
// الخطوة ٢ من «إحكام الاسترجاع بلا مزوّد» (أمر المالك ٢٠٢٦/١٠/٢٩؛ CLAUDE.md
// «إحكام الاسترجاع بلا مزوّد»): كان هذا الملف ذراعًا متّجهية واحدة خلف
// الراية `SADEED_GEMINI_RAG_READY` — بلا راية أو بلا مفتاح يعود فارغًا، فلا
// يصل أي مرجع إلى إجابة سَدِيد. الآن `gatherRagContext` يستدعي مجمِّع
// الأذرع (`src/lib/retrieval/aggregate.server.ts`) متزامنةً بموعدٍ لكلٍّ:
//
//   (أ) الفهرس الداخلي (بذرة المستودع + أسماء HCIS)          — زائر ومسجَّل
//   (ب) `hcis_*` الحيّة بعميل anon، بقاطع وكاش سالب            — زائر ومسجَّل
//   (ج) `finn_knowledge` و`sec_knowledge_articles` تحت JWT     — مسجَّل
//   (د) `finn_document_chunks` ⋈ `finn_documents.status='ready'` — مسجَّل، سياقٌ
//       «غير موثّق» فقط، لا استشهاد `[DOC:]` أبدًا (قرار المالك ⑤)
//   (هـ) الذراع المتّجهية = RPC اليوم خلف الراية والمفتاح (قرار ③)، وكتابتا
//       الذاكرة (`last_used_at` داخل الذراع، `rememberConversationTurn` أدناه)
//       خلف الراية نفسها كما كانتا.
//
// شكل الإرجاع `RagContext` باقٍ لمستدعيه (`/api/chat`) مع حقل `retrieval`
// للرصد، و`RagCitation.similarity` صار `number | null`: الذراع المعجمية لا
// تطبع `(sim NN%)` ولا `similarity: 1` — سطرها «مطابقة نصّية».
//
// الفشل صادق لا صامت: كل ذراع تعيد سببها (`rag.arm_failed`)، وفشلها كلّها
// يعيد سياقًا فارغًا ومسار الإجابة يمضي كما كان — لا 503 ولا خطأ جديد.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ARM_NAMES,
  LEXICAL_ARM_DEADLINE_MS,
  runArms,
  VECTOR_ARM_DEADLINE_MS,
  type AggregateOutcome,
  type ArmSpec,
} from "@/lib/retrieval/aggregate.server";
import type { FusedHit } from "@/lib/retrieval/fuse.server";
import { seedCorpusArm } from "@/lib/retrieval/sources/seed-corpus.server";
import type { ArmResult, MatchLabel, RetrievalAudience } from "@/lib/retrieval/types";
import { embedText, toPgVector } from "./embeddings.server";
import {
  documentChunksArm,
  finnKnowledgeArm,
  hcisLiveArm,
  secKnowledgeArm,
  type LexicalDbClient,
} from "./rag/lexical-arms.server";
import { observeRagOutcome, retrievalHeaderValue } from "./rag/observe.server";
import {
  neutralizeCitationMarkers,
  redactPii,
  sanitizeRetrievedContent,
} from "./rag/sanitize.server";
import { isGeminiRagReady, vectorArm } from "./rag/vector-arm.server";
import { computedSimilarityPercent, LEXICAL_MATCH_LABEL_AR } from "./similarity-label";

export { isGeminiRagReady, retrievalHeaderValue };
export type { RetrievalHeaderValue } from "./rag/observe.server";

export type RagCitation = {
  kind: "document" | "knowledge" | "memory";
  id: string;
  title: string;
  source?: string | null;
  /** الكوساين المحسوب للذراع المتّجهية؛ `null` للمعجمية — لا رقم مختلَق (المادة ٢٧). */
  similarity: number | null;
  /** Citation tag the model is instructed to use, e.g. `[DOC:Policy 01]`. */
  tag: string;
  /** Verified raw excerpt from the underlying chunk (already truncated, sanitized). */
  excerpt: string;
  /** وسم المطابقة كما يُعرض: «مطابقة نصّية» أو «تشابه دلالي». */
  label: MatchLabel;
  /** الذراع التي أسهمت أولًا — للرصد في JSON، لا نصّ عرض. */
  arm: string;
  /**
   * هل يحمل المقتطف نصًّا وراء الرمز والعنوان؟ `false` لاسم HCIS من الفهرس
   * الداخلي (رمزٌ واسم بلا نصّ نطاق — البند ④ بلا قرار) ولصفّ حيّ بلا `scope_ar`
   * ولمقتطف فارغ. بوّابة المخرج (`finalize.ts` (ج)) تعدّ الاستشهاد دليلًا على
   * ادّعاء تنظيمي؛ **واسمٌ وحده ليس دليلًا على نطاق** — فـ`/api/chat` يبني
   * `evidence.available` من هذه الاستشهادات وحدها (مراجعة ثالثة ٢٠٢٦/١٠/٢٩:
   * كانت إصابة «SEC-18 — محطات التحويل الكهربائية» بلا نطاق تُرضي البوّابة
   * لنطاقٍ مختلَق يردّد وسمها). التغطية (`evaluateRagCoverage`) لا تقرأه.
   */
  bodyText: boolean;
};

export type RagCoverage = {
  available: number;
  cited: number;
  citedTags: string[];
  uncitedTags: string[];
  coverageRatio: number;
  /** grounded = ≥1 cited; partial = <50% cited; uncited = sources existed but none cited. */
  status: "grounded" | "partial" | "uncited" | "no-sources";
};

export type RagRetrievalSummary = {
  servedArms: string[];
  arms: ArmResult[];
  hitCount: number;
  latencyMs: number;
};

export type RagContext = {
  embedding: number[] | null;
  contextBlock: string;
  citations: RagCitation[];
  counts: { memories: number; knowledge: number; documents: number; unverified: number };
  retrieval: RagRetrievalSummary;
};

export type GatherRagOptions = {
  audience?: RetrievalAudience;
  /** عميل بلا جلسة لذراع `hcis_*` (اللقطة لا تُخزَّن عبر JWT مستدعٍ). الافتراض: العميل نفسه. */
  anonClient?: SupabaseClient;
  /** البوّابة تعرف أن المخزن معطّل (`rate.unavailable`) ⇐ لا ذراع قاعدية تُشغَّل. */
  dbUnavailable?: boolean;
  requestId?: string;
  /**
   * حال الجلسة في هذا الدور (`anonymous` · `verified` · `unverified`) — يصل حدث
   * `rag.outcome` رمزًا مغلقًا فيُرى أن «غير متحقَّق» خُدم زائرًا. لا هوية.
   */
  authState?: string;
  env?: Record<string, string | undefined>;
};

/** Scan an assistant message for [DOC:…] / [KB:…] markers and report coverage. */
export function evaluateRagCoverage(answer: string, citations: RagCitation[]): RagCoverage {
  const available = citations.filter((c) => c.kind !== "memory").length;
  if (!available) {
    return {
      available: 0,
      cited: 0,
      citedTags: [],
      uncitedTags: [],
      coverageRatio: 0,
      status: "no-sources",
    };
  }
  const text = (answer || "").toLowerCase();
  const citedTags: string[] = [];
  const uncitedTags: string[] = [];
  for (const c of citations) {
    if (c.kind === "memory") continue;
    // A title mentioned in prose (or shared by two long titles) is not a
    // citation. Credit only the complete tag issued for this source.
    const hit = c.tag.length > 0 && text.includes(c.tag.toLowerCase());
    if (hit) citedTags.push(c.tag);
    else uncitedTags.push(c.tag);
  }
  const cited = citedTags.length;
  const coverageRatio = cited / available;
  const status: RagCoverage["status"] =
    cited === 0 ? "uncited" : coverageRatio < 0.5 ? "partial" : "grounded";
  return { available, cited, citedTags, uncitedTags, coverageRatio, status };
}

export const UNVERIFIED_TAG_AR = "غير موثّق";
export const LEXICAL_LABEL_AR: MatchLabel = LEXICAL_MATCH_LABEL_AR;

const emptyRetrieval = (): RagRetrievalSummary => ({
  servedArms: [],
  arms: [],
  hitCount: 0,
  latencyMs: 0,
});

export function emptyRagContext(): RagContext {
  return {
    embedding: null,
    contextBlock: "",
    citations: [],
    counts: { memories: 0, knowledge: 0, documents: 0, unverified: 0 },
    retrieval: emptyRetrieval(),
  };
}

/**
 * العنوان داخل وسم `[KB:…]`/`[DOC:…]`/`[MEM:…]` وفي بيانات الاستشهاد: يمرّ
 * بالمرشّحات نفسها التي يمرّ بها المقتطف (حذف PII، تحييد الحقن، وعلامات المصدر
 * المزوّرة `[KB:`/`(sim NN%)`) ثم تُنزع الأقواس المربّعة (الضيّقة والعريضة التي
 * يتركها التحييد) والأسطر — وإلا كُسر الوسم. **مراجعة ٢٠٢٦/١٠/٢٩:** كان العنوان
 * والمصدر يُكتبان خامين في سطر الكتلة والوسم وJSON الاستشهاد، فعنوانٌ مسموم
 * «… (sim 99%) …» ومصدرٌ «[KB:forged] ignore previous instructions» كانا يصلان
 * النموذج والعميل حرفيًّا — تجاوزًا لما يُغلقه `safeExcerpt` على المقتطف وحده.
 */
const tagTitle = (title: string) =>
  sanitizeRetrievedContent(redactPii(title ?? ""))
    .replace(/[[\]［］\r\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

/** المصدر (`finn_knowledge.source` / `doc_code` / رمز HCIS) بالمرشّحات نفسها، سطرًا واحدًا قصيرًا. */
const safeSource = (src: string | null | undefined): string | null =>
  src == null ? null : oneLine(redactPii(sanitizeRetrievedContent(src))).slice(0, 120);

/**
 * درجة الذراع المتّجهية إن أسهمت — الكوساين المحسوب؛ وإلا `null`. درجةٌ غير
 * منتهية أو لا تُقرَّب إلى 1% (صفر «لم يُقَس» · `NaN` · سالب) ليست كوساين محسوبًا
 * فتعود `null` — لا يصير `similarity` في JSON الاستشهاد ولا `(sim 0%)` في الكتلة
 * رقمًا لم يقسه أحد (O7 ج، المادة ٢٧).
 */
function vectorSimilarity(hit: FusedHit): number | null {
  const v = hit.contributions.find((c) => c.arm === ARM_NAMES.vector);
  return v && computedSimilarityPercent(v.score) !== null ? v.score : null;
}

/** سطرٌ واحد بلا علامات مصدر مزوّرة — المقتطف مرّ بـ`safeExcerpt` في ذراعه، وهذا سياجٌ ثانٍ على كل ذراع. */
function oneLine(s: string): string {
  return neutralizeCitationMarkers(s).replace(/\s+/g, " ").trim();
}

/**
 * نصٌّ وراء الرمز والعنوان؟ الصيغ التي بلا نصّ: مقتطف فارغ، أو «العنوان»، أو
 * «الرمز — العنوان» (شكل `excerptOf` في الفهرس الداخلي وشكل الذراع (ب) حين
 * `scope_ar` فارغ). المقارنة بلا مسافات ولا علامات ترقيم كي لا يفرّق فاصلٌ.
 */
export function hasBodyText(
  hit: Pick<FusedHit, "id" | "title" | "excerpt" | "provenance">,
): boolean {
  const bare = (s: string) => oneLine(s).replace(/[\s\p{P}\p{S}]+/gu, "");
  const excerpt = bare(hit.excerpt);
  if (!excerpt) return false;
  const code = hit.provenance.docId ?? hit.id;
  return excerpt !== bare(hit.title) && excerpt !== bare(`${code} ${hit.title}`);
}

/**
 * «مسجَّل» = جمهور `member` **ومعه `userId`** — لا بالجمهور وحده: جمهورٌ
 * `member` بلا هوية كان يبني ج/د/هـ بـ`userId = null` فيعتمد ضمان «لا تستعلم
 * بلا هوية» على نصّ المستدعي في `chat.ts` لا على هذه الدالّة.
 */
function isMember(audience: RetrievalAudience, userId: string | null): boolean {
  return audience === "member" && !!userId;
}

/**
 * أسماء الأذرع القاعدية التي تُسقَط حين يعرف المستدعي أن المخزن معطّل — تُسجَّل
 * `db_unavailable` لا تُحذف من الحدث. والمتّجهية (هـ) منها: نداءاتها `sadeed_match_*`
 * تذهب إلى المخزن نفسه، وكانت تُبنى رغم تعطّله فتدفع تضمينًا وثلاث RPC إلى قاعدة
 * معروفة التعطّل (مراجعة ٢٠٢٦/١٠/٢٩).
 */
export function dbArmNames(audience: RetrievalAudience, userId: string | null): string[] {
  return isMember(audience, userId)
    ? [
        ARM_NAMES.hcisLive,
        ARM_NAMES.finnKnowledge,
        ARM_NAMES.secKnowledge,
        ARM_NAMES.documentChunks,
        ARM_NAMES.vector,
      ]
    : [ARM_NAMES.hcisLive];
}

/**
 * أذرع هذا الدور بحسب الجمهور والبوّابة — معرَّضة للاختبار (الزائر أ+ب فقط؛
 * المسجَّل أ+ب+ج+د+هـ؛ المخزن المعطّل يُسقط القاعدية كلّها ومعها المتّجهية؛
 * `member` بلا `userId` يُعامل زائرًا).
 */
export function buildArmSpecs(
  supabase: SupabaseClient,
  userId: string | null,
  opts: GatherRagOptions,
): ArmSpec[] {
  const audience: RetrievalAudience = opts.audience ?? (userId ? "member" : "anonymous");
  const member = isMember(audience, userId);
  const db = (opts.anonClient ?? supabase) as unknown as LexicalDbClient;
  const caller = supabase as unknown as LexicalDbClient;
  const specs: ArmSpec[] = [];
  // الترتيب يقرّر من يملك حقول النتيجة المدموجة: الحيّة (نصّ النطاق) قبل الفهرس الداخلي.
  if (!opts.dbUnavailable)
    specs.push({ arm: hcisLiveArm(db), deadlineMs: LEXICAL_ARM_DEADLINE_MS });
  specs.push({ arm: seedCorpusArm, deadlineMs: LEXICAL_ARM_DEADLINE_MS });
  if (member && !opts.dbUnavailable) {
    specs.push(
      { arm: finnKnowledgeArm(caller), deadlineMs: LEXICAL_ARM_DEADLINE_MS },
      { arm: secKnowledgeArm(caller), deadlineMs: LEXICAL_ARM_DEADLINE_MS },
      { arm: documentChunksArm(caller, userId), deadlineMs: LEXICAL_ARM_DEADLINE_MS },
    );
  }
  if (member && !opts.dbUnavailable)
    specs.push({
      arm: vectorArm(supabase, userId, { env: opts.env }),
      deadlineMs: VECTOR_ARM_DEADLINE_MS,
    });
  return specs;
}

/** يبني الكتلة والاستشهادات من النتائج المدموجة — نقيّ، معرَّض للاختبار. */
export function assembleRagContext(outcome: AggregateOutcome): RagContext {
  const documents: FusedHit[] = [];
  const knowledge: FusedHit[] = [];
  const unverified: FusedHit[] = [];
  const memories: FusedHit[] = [];
  for (const hit of outcome.fused) {
    if (hit.source === "memory") memories.push(hit);
    else if (!hit.provenance.citable || hit.source === "upload-unverified") unverified.push(hit);
    else if (hit.source === "document") documents.push(hit);
    else knowledge.push(hit);
  }
  const armOf = (h: FusedHit) => h.contributions[0]?.arm ?? "";
  const labelOf = (h: FusedHit): MatchLabel =>
    h.contributions.some((c) => c.arm !== ARM_NAMES.vector) ? LEXICAL_LABEL_AR : "تشابه دلالي";
  // `(sim NN%)` لكوساين محسوب وحده؛ وما عداه يطبع وسم ذراعه بين قوسين —
  // `(مطابقة نصّية)` للمعجمي، ولا نسبة معه أبدًا (O7 ج، المادة ٢٧).
  const simText = (h: FusedHit) => {
    const percent = computedSimilarityPercent(vectorSimilarity(h));
    return percent === null ? `(${labelOf(h)})` : `(sim ${percent}%)`;
  };

  // العنوان والمصدر بالمرشّحات نفسها في الوسم والسطر وJSON — لا حقل خام يصل النموذج أو العميل.
  const citations: RagCitation[] = [
    ...documents.map<RagCitation>((d) => ({
      kind: "document",
      id: d.id,
      title: tagTitle(d.title),
      source: safeSource(d.provenance.table),
      similarity: vectorSimilarity(d),
      tag: `[DOC:${tagTitle(d.title)}]`,
      excerpt: d.excerpt,
      label: labelOf(d),
      arm: armOf(d),
      bodyText: hasBodyText(d),
    })),
    ...knowledge.map<RagCitation>((k) => ({
      kind: "knowledge",
      id: k.id,
      title: tagTitle(k.title),
      source: safeSource(k.provenance.docId ?? k.provenance.table),
      similarity: vectorSimilarity(k),
      tag: `[KB:${tagTitle(k.title)}]`,
      excerpt: k.excerpt,
      label: labelOf(k),
      arm: armOf(k),
      bodyText: hasBodyText(k),
    })),
    ...memories.map<RagCitation>((m) => ({
      kind: "memory",
      id: m.id,
      title: tagTitle(m.title),
      source: "finn_memory",
      similarity: vectorSimilarity(m),
      tag: `[MEM:${tagTitle(m.title)}]`,
      excerpt: m.excerpt,
      label: labelOf(m),
      arm: armOf(m),
      bodyText: hasBodyText(m),
    })),
  ];

  const lines: string[] = [];
  if (documents.length) {
    lines.push("# RELEVANT DOCUMENTS (cite as [DOC:title])");
    for (const d of documents)
      lines.push(`- [DOC:${tagTitle(d.title)}] ${simText(d)}\n  ${oneLine(d.excerpt)}`);
  }
  if (knowledge.length) {
    lines.push(`${lines.length ? "\n" : ""}# KNOWLEDGE BASE (cite as [KB:title])`);
    for (const k of knowledge) {
      const src = safeSource(k.provenance.docId ?? k.provenance.table ?? k.source);
      lines.push(`- [KB:${tagTitle(k.title)}] · ${src} · ${simText(k)}\n  ${oneLine(k.excerpt)}`);
    }
  }
  if (unverified.length) {
    // قرار المالك ⑤: سياقٌ موسوم بلا وسم استشهاد — لا `[DOC:` ولا `[KB:` في هذا القسم.
    lines.push(
      `${lines.length ? "\n" : ""}# UNVERIFIED UPLOADS (${UNVERIFIED_TAG_AR} — context only, never cite, never present as policy)`,
    );
    for (const u of unverified) {
      const chunk =
        u.provenance.chunkIndex !== undefined ? ` (مقطع ${u.provenance.chunkIndex})` : "";
      // الوسم من الذراع التي أنتجته: مقطعٌ جاء من المتّجهية وحدها «تشابه دلالي» لا «مطابقة نصّية».
      lines.push(
        `- «${UNVERIFIED_TAG_AR}» ${tagTitle(u.title)}${chunk} · ${labelOf(u)}\n  ${oneLine(u.excerpt)}`,
      );
    }
  }
  if (memories.length) {
    lines.push(`${lines.length ? "\n" : ""}# PERSISTENT MEMORY (prior executive context)`);
    for (const m of memories) lines.push(`- ${tagTitle(m.title)}: ${oneLine(m.excerpt)}`);
  }

  return {
    embedding: null,
    contextBlock: lines.join("\n"),
    citations,
    counts: {
      memories: memories.length,
      knowledge: knowledge.length,
      documents: documents.length,
      unverified: unverified.length,
    },
    retrieval: {
      servedArms: outcome.servedArms,
      arms: outcome.arms,
      hitCount: outcome.fused.length,
      latencyMs: outcome.latencyMs,
    },
  };
}

/**
 * نقطة الدخول لمسار الإجابة. لا ترمي أبدًا: فشل كل الأذرع ⇐ سياق فارغ مع
 * أسبابه في `retrieval.arms`. `userId` قد يكون `null` (زائر: الأذرع أ+ب).
 */
export async function gatherRagContext(
  supabase: SupabaseClient,
  userId: string | null,
  orgId: string | null,
  query: string,
  opts: GatherRagOptions = {},
): Promise<RagContext> {
  const trimmed = (query ?? "").trim();
  if (!trimmed) return emptyRagContext();
  const audience: RetrievalAudience = opts.audience ?? (userId ? "member" : "anonymous");
  const specs = buildArmSpecs(supabase, userId, { ...opts, audience });
  try {
    const outcome: AggregateOutcome = await runArms(specs, trimmed, { orgId, audience });
    if (opts.dbUnavailable) {
      // الأذرع القاعدية المُسقَطة تُسجَّل بسببها في الحدث لا تغيب عنه (O7).
      for (const arm of dbArmNames(audience, userId))
        outcome.arms.push({ arm, served: false, hits: [], reason: "db_unavailable", latencyMs: 0 });
    }
    // الرصد والبناء داخل السياج نفسه: رميٌ منهما كان يرفض الوعد الذي يسابقه
    // `/api/chat` في `Promise.all` فيصير 500 لا «إجابة بلا سياق».
    observeRagOutcome(outcome, {
      requestId: opts.requestId,
      audience,
      authState: opts.authState,
    });
    return assembleRagContext(outcome);
  } catch (error) {
    // المجمِّع لا يرمي ببنائه؛ هذا سياجٌ أخير: الإجابة تمضي بلا سياق، والسبب في السجلّ.
    console.warn("[sadeed/rag] aggregator threw", {
      event: "rag.arm_failed",
      arm: "aggregate",
      code: error instanceof Error ? error.name : "error",
      requestId: opts.requestId ?? null,
    });
    return emptyRagContext();
  }
}

export async function rememberConversationTurn(
  supabase: SupabaseClient,
  userId: string,
  threadId: string | null,
  userText: string,
  _assistantText: string,
): Promise<void> {
  if (!isGeminiRagReady()) return;

  // Persist user-authored context only. A model answer is not evidence and must
  // never become a self-reinforcing pseudo-fact through the memory retriever.
  const content = `User request: ${userText.slice(0, 1200)}`;
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = `turn:${threadId ?? "ad-hoc"}:${suffix}`;
  const scope = threadId ? `thread:${threadId}` : "conversation";
  const embedding = await embedText(userText, { purpose: "retrieval-document" });
  const { error } = await supabase.from("finn_memory").upsert(
    {
      user_id: userId,
      scope,
      key,
      content,
      importance: 0.55,
      embedding: embedding ? toPgVector(embedding) : null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,scope,key" },
  );
  if (error) console.warn("[sadeed/rag] memory upsert failed", error.message);
}
