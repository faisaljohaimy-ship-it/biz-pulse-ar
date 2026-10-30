/**
 * (هـ) الذراع المتّجهية — RPC اليوم نفسها كما كانت في `gatherRagContext`، خلف
 * الراية `SADEED_GEMINI_RAG_READY` ومفتاح التضمين (قرار المالك ③: الراية
 * بوّابة هذه الذراع وكتابتَي الذاكرة **فقط**؛ الأذرع المعجمية خارجها).
 *
 * **الدوالّ (O4، ٢٠٢٦/١٠/٣٠):** الثلاث صارت `sadeed_match_documents` و
 * `sadeed_match_knowledge` و`sadeed_match_memory` (ترحيل
 * `20261030120000_sadeed_match_functions.sql`) بدل `aria_match_*` التي كانت
 * تفشل `42P01` على الإنتاج (مقيس ٢٠٢٦/١٠/١٢). والمؤسسة **صريحة** `_org_id` في
 * الثلاث، والمستخدم لا يُرسَل: الذاكرة والمستندات تقرآن `auth.uid()` من JWT
 * العميل نفسه (SECURITY INVOKER) — فيجب أن يكون `supabase` هنا عميل المستدعي لا
 * `service_role` (الأخير يقرأ منهما صفرًا بالبناء، فشلٌ مغلق لا قراءة واسعة).
 * **أصناف الفشل** (الرمز كما يصل `reason`، والثلاث معًا تُسقط الذراع):
 * `PGRST202` — الدالّة غير موجودة في ذاكرة المخطط: الكود مدفوع والترحيل لم
 * يُطبَّق بعد (الحالة قبل إذن القاعدة)؛ `42501` — امتياز التنفيذ مسحوب؛
 * `42883` — عامل/دالّة داخلية ناقصة (pgvector)؛ `42P01` — جدول `finn_*` غائب؛
 * `rpc_error` — خطأ بلا رمز. كلها تصل سببًا قصيرًا لا نصًّا حرًّا. مقيس على عميل
 * `@supabase/supabase-js` حقيقي بـ`fetch` مزروع في `multi-arm.contract.test.ts` ②.
 *
 * ما لم يتغيّر: العتبات، وكتابة `last_used_at` للذكريات المعروضة **داخل هذه
 * الذراع** فلا تقع إلا خلف الراية ببناء الكود. ما تغيّر: لا `await embedText` على المسار
 * الحرج للأذرع الأخرى — المجمِّع يشغّلها متزامنةً بموعدها؛ وكل مقتطف **وعنوان**
 * يمرّ بـ`safeExcerpt`؛ والنتائج تحمل `label: "تشابه دلالي"` والدرجة الخام هي
 * الكوساين (تُطبع `(sim NN%)` لها وحدها — رقمٌ محسوب لا مختلَق).
 *
 * **درس المراجعة (٢٠٢٦/١٠/٢٩):** نداء `rpc` يُستدعى **مقيَّدًا بالعميل**
 * (`supabase.rpc(...)`) لا منزوعًا منه — `rpc` في supabase-js دالّة نموذج تقرأ
 * `this.rest`، فنزعها (`const rpc = client.rpc`) كان يرمي
 * `Cannot read properties of undefined (reading 'rest')` قبل أي نداء، فتعود
 * الذراع `threw` دائمًا متى رُفعت الراية، ولا يكتشفه بديلٌ يعرّف `rpc` سهمًا بلا
 * `this`. الحارس يستعمل العميل الحقيقي.
 *
 * **المستندات هنا غير موثّقة كما في الذراع المعجمية (د)** (مراجعة ٢٠٢٦/١٠/٣٠):
 * `source: "upload-unverified"` و`citable: false` معًا، فتصل النموذج سياقًا موسومًا
 * «غير موثّق» ولا تصير `[DOC:]` أبدًا (قرار المالك ⑤ والمادة ٢٥). `sadeed_match_documents`
 * تعيد كل مقطع من مستند `ready` لصاحبه — حالة `ready` حالة استيعاب لا توثيق، ولا
 * بوابة ترقية على المقاطع. والمعرّف **معرّف المقطع** (`chunk_id`) لا المستند: يلتقي
 * بنتيجة الذراع (د) للمقطع نفسه فيندمجان في نتيجة واحدة (RRF) بدل أن يصلا النموذج
 * مرتين، مرةً سياقًا ومرةً استشهادًا.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ARM_NAMES } from "@/lib/retrieval/aggregate.server";
import type { ArmResult, Hit, RetrievalArm } from "@/lib/retrieval/types";
import { embedText, toPgVector } from "../embeddings.server";
import { safeExcerpt } from "./sanitize.server";

export const MIN_SIM_MEMORY = 0.45;
export const MIN_SIM_KNOWLEDGE = 0.4;
export const MIN_SIM_DOCUMENT = 0.4;
/** سقف العنوان ومعرّف المصدر بعد التنقية — كما في `cleanTitle`/`cleanSource` المعجميتين. */
const TITLE_CHARS = 160;
const SOURCE_CHARS = 120;

/** الراية كما وثّقتها `rag.server.ts`: لا تُرفع إلا بعد إعادة تضمين مقيسة. */
export function isGeminiRagReady(env: Record<string, string | undefined> = process.env): boolean {
  return env.SADEED_GEMINI_RAG_READY?.trim().toLowerCase() === "true";
}

type Rpc = (
  name: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown[] | null; error: { code?: string; message: string } | null }> & {
  abortSignal?: (s: AbortSignal) => PromiseLike<{
    data: unknown[] | null;
    error: { code?: string; message: string } | null;
  }>;
};

function withSignal<T extends { abortSignal?: (s: AbortSignal) => unknown }>(
  b: T,
  signal?: AbortSignal,
) {
  return (
    signal && typeof b.abortSignal === "function" ? b.abortSignal(signal) : b
  ) as PromiseLike<{
    data: unknown[] | null;
    error: { code?: string; message: string } | null;
  }>;
}

function rpcCode(error: { code?: string; message: string } | null): string | null {
  if (!error) return null;
  return typeof error.code === "string" && error.code ? error.code : "rpc_error";
}

/**
 * الذراع تحتاج `userId` و`orgId` (الفشل المغلق على التباس المستأجر باقٍ كما
 * كان: بلا مؤسسة ⇐ `no_org`). `lastUsedWrite` يُعطَّل في القياس وحده.
 */
export function vectorArm(
  supabase: SupabaseClient,
  userId: string | null,
  opts: { env?: Record<string, string | undefined> } = {},
): RetrievalArm {
  return {
    name: ARM_NAMES.vector,
    async run(query, ctx, _deadlineMs, signal): Promise<ArmResult> {
      const started = Date.now();
      const done = (served: boolean, hits: Hit[], reason: string | null): ArmResult => ({
        arm: ARM_NAMES.vector,
        served,
        hits,
        reason,
        latencyMs: Date.now() - started,
      });
      if (!isGeminiRagReady(opts.env)) return done(false, [], "flag_off");
      if (!userId || !ctx.orgId) return done(false, [], "no_org");
      // الإشارة تصل نداء التضمين نفسه (`httpFetch` يدمجها بمؤقّت المحاولة ويوقف
      // الإعادة): الذراع المهجورة عند موعدها لا تُبقي نداءً مدفوعًا يعمل بعدها.
      const embedding = await embedText(query, { purpose: "retrieval-query", signal });
      if (signal?.aborted) return done(false, [], "aborted");
      if (!embedding) return done(false, [], "embed_unavailable");
      const qvec = toPgVector(embedding);
      // المؤسسة صريحة في الثلاث (`_org_id`)؛ والمستخدم من JWT العميل لا من وسيط.
      const orgId = ctx.orgId;
      // مقيَّد بالعميل — لا `const rpc = supabase.rpc` (يفقد `this`، انظر الترويسة).
      const rpc: Rpc = (name, args) => (supabase as unknown as { rpc: Rpc }).rpc(name, args);
      const [memR, knowR, docR] = await Promise.all([
        withSignal(
          rpc("sadeed_match_memory", { _org_id: orgId, _query: qvec, _scope: null, _limit: 6 }),
          signal,
        ),
        withSignal(
          rpc("sadeed_match_knowledge", { _org_id: orgId, _query: qvec, _tags: null, _limit: 5 }),
          signal,
        ),
        withSignal(
          rpc("sadeed_match_documents", { _org_id: orgId, _query: qvec, _limit: 5 }),
          signal,
        ),
      ]);
      const codes = [memR, knowR, docR].map((r) => rpcCode(r.error)).filter(Boolean) as string[];
      for (const [name, r] of [
        ["memory", memR],
        ["knowledge", knowR],
        ["documents", docR],
      ] as const)
        if (r.error) console.warn(`[sadeed/rag] ${name} rpc`, { code: rpcCode(r.error) });
      // الثلاث فشلت ⇐ لم تخدم، بسبب أول رمز (PGRST202 قبل تطبيق الترحيل). بعضها خدم ⇐ خدمت بما وصل.
      if (codes.length === 3) return done(false, [], codes[0]);

      const memories = (
        (memR.data ?? []) as { id: string; key: string; content: string; similarity: number }[]
      )
        .filter((r) => Number(r.similarity) >= MIN_SIM_MEMORY)
        .slice(0, 6);
      const knowledge = (
        (knowR.data ?? []) as {
          id: string;
          title: string;
          source: string;
          content: string;
          similarity: number;
        }[]
      )
        .filter((r) => Number(r.similarity) >= MIN_SIM_KNOWLEDGE)
        .slice(0, 5);
      const documents = (
        (docR.data ?? []) as {
          chunk_id: string;
          document_id: string;
          title: string;
          content: string;
          similarity: number;
        }[]
      )
        .filter((r) => Number(r.similarity) >= MIN_SIM_DOCUMENT)
        .slice(0, 5);

      // تحديث `last_used_at` للذكريات المعروضة — كتابة في مسار القراءة كما كانت، خلف الراية وحدها.
      if (memories.length) {
        try {
          await supabase
            .from("finn_memory")
            .update({ last_used_at: new Date().toISOString() })
            .eq("user_id", userId)
            .in(
              "id",
              memories.map((m) => m.id),
            );
        } catch (e) {
          console.warn("[sadeed/rag] last_used_at update failed", {
            code: e instanceof Error ? e.name : "error",
          });
        }
      }

      const hits: Hit[] = [
        ...documents.map<Hit>((d, i) => ({
          // معرّف المقطع ومصدر «غير موثّق» وcitable=false: كما في documentChunksArm (انظر الترويسة).
          id: d.chunk_id,
          source: "upload-unverified",
          title: safeExcerpt(d.title, TITLE_CHARS),
          excerpt: safeExcerpt(d.content, 600),
          score: Number(d.similarity),
          rank: i + 1,
          provenance: {
            table: "finn_document_chunks",
            docId: d.document_id,
            citable: false,
            label: "تشابه دلالي",
          },
        })),
        ...knowledge.map<Hit>((k, i) => ({
          id: k.id,
          source: "knowledge",
          title: safeExcerpt(k.title, TITLE_CHARS),
          excerpt: safeExcerpt(k.content, 500),
          score: Number(k.similarity),
          rank: i + 1,
          provenance: {
            table: "finn_knowledge",
            // معرّف المصدر نصٌّ من الصفّ كالعنوان — يُنقّى في الذراع لا في البناء وحده.
            docId: safeExcerpt(k.source, SOURCE_CHARS).replace(/\s+/g, " ").trim(),
            citable: true,
            label: "تشابه دلالي",
          },
        })),
        ...memories.map<Hit>((m, i) => ({
          id: m.id,
          source: "memory",
          title: safeExcerpt(m.key, TITLE_CHARS),
          excerpt: safeExcerpt(m.content, 400),
          score: Number(m.similarity),
          rank: i + 1,
          provenance: { table: "finn_memory", docId: m.id, citable: false, label: "تشابه دلالي" },
        })),
      ]
        .sort((a, b) => b.score - a.score)
        .map((h, i) => ({ ...h, rank: i + 1 }));
      return done(true, hits, null);
    },
  };
}
