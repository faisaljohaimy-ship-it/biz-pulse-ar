/**
 * إدخال أجزاء ملف فِن في مكتبة المعرفة (أمر المالك ٢٠٢٦/١٠/٣١) — خادمٌ فقط.
 *
 * ## ما يفعله وما لا يفعله
 *
 * يأخذ أجزاءً نصّية **محجوبة الأنماط الشخصية سلفًا** (من `to-text.server.ts`) ويُنشئ لكلٍّ منها
 * صفًّا في `finn_documents` **بهوية المالك نفسه** (عميل Supabase مربوط برمزه ⇒ تسري RLS)، ثم يستدعي
 * خطّاف الفهرسة العامّ `sadeed-docs-ingest` (تقطيعٌ وتضمينٌ بمفتاح الخدمة) — المسار نفسه الذي يمرّ به
 * `enqueueKnowledgeIngest` في صفحة رفع المعرفة. لا بايتات ملف ولا خلايا ولا مسار تخزين: النصّ
 * المحجوب وعنوانه فقط، وهو ما يراه المالك في مكتبته أصلًا.
 *
 * ## لماذا إعادة تنفيذ لا استخراج نواة مشتركة
 *
 * `enqueueKnowledgeIngest` دالّة خادم (`createServerFn`) يرتبط جسمها بوسيط الجلسة و`getRequest()`،
 * وتعبّر عن أخطائها برمي استثناءات تحمل نصّ PostgREST في عمود `error` وفي الرسالة، ولا اختبار قائمًا
 * يحرس سلوكها. استخراجها يمسّ مسار رفع سَدِيد الحيّ لغرضٍ لا يخصّه؛ أمّا هنا فالمطلوب نقيضها:
 * **لا نصّ خطأ يصل عمودًا ولا استجابة** (قد يحوي عنوانًا أو قيمة). فأُعيد المسار الأدنى (إدراج ← فحص
 * تكرار بالبصمة ← إسقاط الصفّ المكرَّر ← استدعاء الخطّاف) مع **الوحدات النقية نفسها** من
 * `knowledge-ingest-core` (البصمة · اختيار المكرَّر · السقف) ومن `self-call-origin.server`، فلا
 * تتباعد القواعد. أيّ تغيير في قاعدة التكرار هناك يسري هنا.
 *
 * ## الصدق في الحالة
 *
 * الفهرسة غير متزامنة: الخطّاف يقطّع ويضمّن قبل أن يردّ (قد يطول دقائق)، فلا يُنتظر ردّه كاملًا.
 * يُنتظر `settleMs` فقط لالتقاط الفشل الفوري (سرّ ناقص · 401/503 · انقطاع شبكة) ويُعلَّم صفّه
 * `failed` بسببٍ عربيّ ثابت؛ وما لم يردّ بعد فهو «قيد الفهرسة» والخطّاف نفسه يملك صفّه (يكتب
 * `processing` ثم `ready` أو `failed`). فنتيجة هذا الملف **لا تقول «جاهز» أبدًا**:
 *  - `queued`: صفٌّ أُدرج وبدأت فهرسته (أو لم يفشل فورًا).
 *  - `deduped`: المحتوى نفسه موجود في المكتبة (جاهز أو قيد الفهرسة) — لا صفّ جديد ولا تضمين مدفوع.
 *  - `failed`: لا صفّ صالح (فشل الإدراج) أو رُفضت الفهرسة فورًا.
 * وفشل جزءٍ لا يُسقط الباقي ولا يُخفى: العدّادات الثلاثة تُجمع إلى `total`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { bearerToken } from "@/lib/finn-agent/owner-gate";
import {
  KNOWLEDGE_MAX_TEXT_CHARS,
  knowledgeRevisionHash,
  pickDuplicateDocument,
} from "@/lib/sadeed/knowledge-ingest-core";
import { resolveSelfCallOrigin } from "@/lib/sadeed/self-call-origin.server";

/** وسمٌ يميّز ما أدخله فِن من ملفات (يظهر في المكتبة ويسهّل حذفه جملةً لاحقًا). */
export const FINN_IMPORT_TAG = "fnn-import";

/** مسار الخطّاف العامّ المحميّ بـ`x-cron-secret` (لا يُستدعى من خارج الخادم). */
export const KNOWLEDGE_HOOK_PATH = "/api/public/hooks/sadeed-docs-ingest";

/**
 * أقصى انتظارٍ لردّ الخطّاف: يكفي لاكتشاف الفشل الفوري، ويقصر عن تقطيع وتضمين مستندٍ كامل. بعده
 * يُعدّ الجزء «قيد الفهرسة» ويبقى الطلب يعمل عند الخطّاف حتى يكتمل.
 */
export const INGEST_HOOK_SETTLE_MS = 6_000;

/** أقصى طول عنوان في `finn_documents` (كما في مدخل رفع المعرفة). */
const TITLE_MAX = 300;

/** أسباب فشل ثابتة تُكتب في عمود `error` — عربية بلا نصّ ملف ولا نصّ استثناء. */
const REASON_DUPLICATE_CHECK = "تعذّر التحقق من تكرار المستند قبل فهرسته. (duplicate_check_failed)";
const REASON_DUPLICATE_DROP = "نسخة مكررة من مستند قائم بالنص نفسه. (duplicate_not_dropped)";
const REASON_INDEX_START = "تعذّر بدء فهرسة المستند. أعد تحميل الملف. (index_start_failed)";

export interface IngestPartInput {
  title: string;
  text: string;
}

export type IngestPartState = "queued" | "deduped" | "failed";

export interface IngestResult {
  total: number;
  /** أجزاء أُدرجت وبدأت فهرستها. هذا ما يُحسب «محمَّلًا» — لا أكثر. */
  queued: number;
  /** أجزاء محتواها موجود أصلًا في المكتبة (لم يُنشأ لها صفّ). */
  deduped: number;
  /** أجزاء بلا صفٍّ صالح. */
  failed: number;
  /** حالة كل جزء بترتيب الإدخال. */
  parts: IngestPartState[];
}

export interface IngestDeps {
  /** عميل المالك المربوط برمزه (RLS). لا يُمرَّر هنا عميل الخدمة أبدًا. */
  supabase: SupabaseClient<Database>;
  userId: string;
  /** أصل النداء الذاتي (`resolveSelfCallOrigin`). */
  origin: string;
  /** سرّ الخطّاف `CRON_HOOK_SECRET`. */
  hookSecret: string;
  tags?: readonly string[];
  fetchImpl?: typeof fetch;
  settleMs?: number;
}

/** أدوات بيئة الإدخال: العميل المربوط + أصل النداء الذاتي + سرّ الخطّاف. */
export type IngestRuntime =
  | {
      ok: true;
      supabase: SupabaseClient<Database>;
      origin: string;
      hookSecret: string;
    }
  | { ok: false };

type EnvLike = Record<string, string | undefined>;

/**
 * يهيّئ ما يحتاجه الإدخال **قبل أي كتابة وقبل استهلاك رمز التأكيد**: خلل الضبط (سرّ الخطّاف أو
 * مفاتيح Supabase أو غياب الرمز الحامل) يجب ألّا يحرق رمزًا ولا يترك صفًّا معلّقًا. القراءة من
 * البيئة كما في `requireSupabaseAuth` (الأسماء الجديدة والقديمة)؛ والهوية لا تُحسم هنا — المسار
 * تحقّق من المالك سلفًا (`resolveFinnOwner`)، وهذا العميل ينفّذ بصلاحياته هو فقط.
 */
export function prepareIngest(request: Request, env: EnvLike = process.env): IngestRuntime {
  const hookSecret = env.CRON_HOOK_SECRET;
  if (!hookSecret || hookSecret.length < 16) return { ok: false };
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return { ok: false };
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key =
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ok: false };
  try {
    const supabase = createClient<Database>(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    return { ok: true, supabase, origin: resolveSelfCallOrigin(request.url, env), hookSecret };
  } catch {
    return { ok: false };
  }
}

/** يستدعي الخطّاف ويعيد حالة HTTP (أو 0 عند انقطاع الشبكة). لا يُرمى منه شيء ولا يُقرأ جسمه. */
async function callHook(deps: IngestDeps, documentId: string, text: string): Promise<number> {
  const doFetch = deps.fetchImpl ?? fetch;
  try {
    const res = await doFetch(`${deps.origin}${KNOWLEDGE_HOOK_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": deps.hookSecret },
      body: JSON.stringify({ document_id: documentId, text }),
    });
    // الجسم لا يُقرأ ولا يُسجَّل؛ يُلغى فقط ليُفرَج عن الاتصال.
    try {
      void res.body?.cancel().catch(() => undefined);
    } catch {
      /* لا شيء */
    }
    return res.status;
  } catch {
    return 0;
  }
}

/** ينتظر الخطّاف حتى `settleMs`؛ `null` ⇒ ما زال يعمل (قيد الفهرسة). */
async function settleHook(
  deps: IngestDeps,
  documentId: string,
  text: string,
): Promise<number | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending = callHook(deps, documentId, text);
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), deps.settleMs ?? INGEST_HOOK_SETTLE_MS);
  });
  try {
    return await Promise.race([pending, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function markFailed(
  deps: IngestDeps,
  documentId: string,
  reason: string,
  onlyWhenPending: boolean,
): Promise<void> {
  try {
    let query = deps.supabase
      .from("finn_documents")
      .update({ status: "failed", error: reason })
      .eq("id", documentId);
    // بعد فشل الخطّاف الفوري يبقى الصفّ `pending` إن لم يبلغه؛ أمّا إن بلغه فهو يكتب حالته بنفسه
    // (`processing`/`ready`/`failed`) فلا يُكتب فوقها.
    if (onlyWhenPending) query = query.eq("status", "pending");
    await query;
  } catch {
    /* تعذّر وسم الصفّ: يبقى pending وتنتهي مهلته في الواجهة؛ لا نصّ يُسجَّل. */
  }
}

/** جزءٌ واحد: إدراج ← تكرار ← خطّاف. لا يرمي أبدًا. */
async function ingestOne(
  part: IngestPartInput,
  deps: IngestDeps,
): Promise<{ state: IngestPartState; documentId?: string; text: string }> {
  const { supabase, userId } = deps;
  const text = part.text;
  const title = part.title.trim().slice(0, TITLE_MAX);
  if (!title || !text.trim() || text.length > KNOWLEDGE_MAX_TEXT_CHARS) {
    return { state: "failed", text };
  }

  let revisionHash: string;
  let doc: { id: string; org_id: string; created_at: string } | null = null;
  try {
    revisionHash = await knowledgeRevisionHash(text);
    // 1) الصفّ تحت RLS المالك (status=pending). يُدرج قبل فحص التكرار ليُحصر الفحص بـ`org_id`
    //    الذي تُسنده القاعدة لا بتخمين — كما في `enqueueKnowledgeIngest`.
    const inserted = await supabase
      .from("finn_documents")
      .insert({
        user_id: userId,
        title,
        source: "text",
        mime_type: "text/plain",
        storage_path: null,
        size_bytes: text.length,
        page_count: 0,
        status: "pending",
        revision_hash: revisionHash,
        tags: [...(deps.tags ?? [FINN_IMPORT_TAG])],
      })
      .select("id, org_id, created_at")
      .single();
    if (inserted.error || !inserted.data) return { state: "failed", text };
    doc = inserted.data;
  } catch {
    return { state: "failed", text };
  }

  // 2) التكرار: المالك نفسه ونفس المؤسسة والبصمة نفسها ⇒ يُعاد القائم ولا يُدفع تضمينٌ ثانٍ.
  //    الأقدم يفوز (`pickDuplicateDocument` بـ`self`)، فلا يُسقط رفعان متزامنان صفَّيهما معًا.
  let duplicateId: string | null = null;
  try {
    const found = await supabase
      .from("finn_documents")
      .select("id, status, created_at")
      .eq("user_id", userId)
      .eq("org_id", doc.org_id)
      .eq("revision_hash", revisionHash)
      .in("status", ["ready", "processing", "pending"])
      .neq("id", doc.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (found.error) {
      await markFailed(deps, doc.id, REASON_DUPLICATE_CHECK, false);
      return { state: "failed", text };
    }
    duplicateId = pickDuplicateDocument(found.data ?? [], Date.now(), doc)?.id ?? null;
  } catch {
    await markFailed(deps, doc.id, REASON_DUPLICATE_CHECK, false);
    return { state: "failed", text };
  }

  if (duplicateId) {
    // أسقط الصفّ الذي أنشأه هذا النداء. RLS قد ترفض الحذف بصمت (بلا خطأ وبلا صفوف)، فعدد الصفوف
    // المعادة — لا غياب الخطأ — هو الدليل؛ وإن لم يُحذف يُترك نهائيًّا `failed` بسببٍ واضح.
    try {
      const dropped = await supabase.from("finn_documents").delete().eq("id", doc.id).select("id");
      if (dropped.error || !dropped.data?.length) {
        await markFailed(deps, doc.id, REASON_DUPLICATE_DROP, false);
      }
    } catch {
      await markFailed(deps, doc.id, REASON_DUPLICATE_DROP, false);
    }
    return { state: "deduped", documentId: duplicateId, text };
  }

  return { state: "queued", documentId: doc.id, text };
}

/**
 * يُدرج الأجزاء بالتسلسل (≤ `maxParts`)، ثم يبدأ فهرستها **معًا**. فشل جزءٍ لا يوقف الباقي.
 * لا يرمي أبدًا، ولا يسجّل شيئًا.
 */
export async function ingestKnowledgeParts(
  parts: readonly IngestPartInput[],
  deps: IngestDeps,
): Promise<IngestResult> {
  const staged: Array<Awaited<ReturnType<typeof ingestOne>>> = [];
  for (const part of parts) staged.push(await ingestOne(part, deps));

  const states: IngestPartState[] = staged.map((s) => s.state);
  // الفهرسة معًا: كل خطّاف مستقلّ، وانتظاره محدود بـ`settleMs` فلا يتراكم زمنها.
  await Promise.all(
    staged.map(async (s, i) => {
      if (s.state !== "queued" || !s.documentId) return;
      const status = await settleHook(deps, s.documentId, s.text);
      if (status === null) return; // ما زال يعمل ⇒ قيد الفهرسة
      if (status >= 200 && status < 300) return;
      await markFailed(deps, s.documentId, REASON_INDEX_START, true);
      states[i] = "failed";
    }),
  );

  return {
    total: states.length,
    queued: states.filter((s) => s === "queued").length,
    deduped: states.filter((s) => s === "deduped").length,
    failed: states.filter((s) => s === "failed").length,
    parts: states,
  };
}
