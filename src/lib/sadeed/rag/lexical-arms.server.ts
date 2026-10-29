/**
 * الأذرع المعجمية فوق القاعدة — (ب) `hcis_*` الحيّة، (ج) `finn_knowledge` و
 * `sec_knowledge_articles`، (د) `finn_document_chunks` — خادمٌ فقط، بلا مزوّد.
 *
 * ## لماذا هنا لا في `src/lib/retrieval/`
 *
 * عقد البنية (`retrieval.architecture.contract.test.ts` ②) يمنع في النواة أي
 * ذكرٍ للقاعدة أو الشبكة. فالنواة تملك التقطيع وBM25 والدمج والمجمِّع،
 * وهذه الوحدة تجلب **مرشّحين** من القاعدة بعميل المستدعي ثم ترتّبهم بنواة
 * BM25 نفسها محليًّا — ترتيبٌ حتمي واحد لكل الأذرع، لا `ILIKE` يرتّب بالصدفة.
 *
 * ## جلب المرشّحين
 *
 * الاستعلام سؤالٌ طبيعي لا عبارة بحث: `ilike '%السؤال كلّه%'` لا يطابق شيئًا،
 * و`plainto_tsquery` يعطف الكلمات AND فكلمة واحدة غائبة تُفرغ الذراع (التدقيق
 * §٢.٣). فتُنتزع من السؤال كلماتُ محتوى قليلة (`ilikeTerms`: بلا كلمات وصل، بلا
 * أداة التعريف، الأطول أولًا، حتى `ILIKE_MAX_TERMS`) وتُعطف OR على أعمدة
 * النصّ، بسقف صفوف، ثم يرتّب BM25 المحلّي. الحدود المعروفة (تُكتب في القياس
 * لا تُخفى؛ ما لم يُجلب لا يُرتَّب):
 *
 * - `ilike` يطابق الحرف كما كُتب — «الأسوار» لا «الاسوار» — فالمطبِّع الصارم
 *   يُطبَّق على الترتيب لا على الجلب (همزة/تاء مربوطة/ياء).
 * - **الأرقام تُطوى إلى ASCII في الجلب** (مراجعة ٢٠٢٦/١٠/٢٩): كانت «٢٠٢٦»
 *   تُرسل هندية إلى `ilike` فلا يُجلب صفٌّ يخزن `2026`، بينما الفهرس يطويها.
 *   والعكس (صفّ يخزن «٢٠٢٦» وسؤال بـ`2026`) ما زال خارج الجلب.
 * - **نافذة الترتيب والمقتطف:** BM25 يقصّ الوثيقة عند `BM25_MAX_DOC_CHARS`
 *   (8,000 حرف)، فصفٌّ جُلب لأن كلمته بعد الحرف 8,000 كان يُرتَّب صفرًا ومقتطفه
 *   رأس النصّ لا موضع المطابقة (قاسه المراجع: 40 صفًّا بـ10,000 حرف ⇐ 0 نتيجة).
 *   فتُقصّ نافذة الترتيب والمقتطف حول أول كلمة `ilike` واردة (`matchWindow`)؛
 *   الحدّ الباقي: كلمة ثانية أبعد من النافذة لا تُرى.
 *
 * ## الجمهور
 *
 * (ب) للزائر والمسجَّل بعميل `anon` — سياسة `hcis_*` `using(true)` للدورين
 * **بحسب الترحيل** `20260719200000_hcis_framework_tables_seed_anon.sql:74-99`
 * (`grant select … to anon` + `*_read_anon`)؛ والترحيلات ليست مصدر الحقيقة
 * لـRLS الإنتاج (CLAUDE.md «قاعدة مصدر الحقيقة المكتسَبة») فسياسة anon على
 * `hcis_*` في الإنتاج **لم يُقَس**. اللقطة تُخزَّن لأنها لا تعتمد على هوية — لا
 * كاش عبر JWT مستدعٍ. (ج) و(د) للمسجَّل وحده تحت JWT المستدعي: RLS هي الحاجز،
 * والذراع لا تعطي الزائر شيئًا ولا تستعلم له (`reason: "guest"`) — وفوق RLS
 * تقيّد (د) الصفوف بـ`user_id = المستدعي` في الكود (دفاعٌ في العمق: الـRPC
 * المتّجهية كانت تمرّر `_user_id` داخل SQL، وRLS الإنتاج على
 * `finn_document_chunks` **لم يُقَس**).
 *
 * ## قرار المالك ⑤ — المقاطع المرفوعة
 *
 * (د) تقرأ `finn_document_chunks` ⋈ `finn_documents.status = 'ready'` **سياقًا
 * موسومًا «غير موثّق»** (`source: "upload-unverified"`, `citable: false`) ولا
 * يصير شيءٌ منها استشهاد `[DOC:]` — المادة ٢٥: الترقية `verified` بوابتها
 * trigger في القاعدة لا كود التطبيق. والحارس في `assembleRagContext` يقرأ
 * **الحقلين معًا** (`!citable || source === "upload-unverified"`)، فارتداد أحدهما
 * وحده لا يفتح الاستشهاد؛ ويثبّت `multi-arm.contract.test.ts` ③ أن كل نتيجة من
 * هذه الذراع تحمل الحقلين. **و`finn_documents.is_official` لا يُقرأ هنا:** الرسمي
 * وغير الرسمي معًا سياق «غير موثّق» بلا استشهاد حتى قرار مالك لاحق (المادة
 * ٢٥(أ) تسمّي المادّة الرسمية `is_official = true`، وقرار ⑤ لم يفرّق).
 *
 * ## القاطع والكاش السالب لذراع الزائر
 *
 * أول اعتمادٍ للزائر على القاعدة في مسار الدردشة: مع خلفية موقوفة كان كل دور
 * زائر سيدفع موعد الذراع كاملًا. فللّقطة الحيّة كاشٌ موجب (`HCIS_SNAPSHOT_TTL_MS`
 * — الجداول بذرة ثابتة) وكاشٌ سالب بعد أي فشل (`HCIS_NEGATIVE_CACHE_MS`) وقاطعٌ
 * على شكل قاطع بوّابة المعدّل (`rate-limit.server.ts`): خمسة فشلٍ متتالية **بلا
 * فجوة تتجاوز 60 ث بين فشلين** (لا «خمسة خلال 60 ث»: الكاش السالب يباعد بين
 * الفشلين 30 ث فالخمسة تستغرق ≥ 120 ث) يفتحه `HCIS_BREAKER_OPEN_MS` ثم فحصٌ واحد
 * نصف مفتوح. **وفشل الفحص نصف المفتوح يعيد الفتح نافذةً كاملة** مهما بلغت الفجوة
 * (مراجعة ثالثة ٢٠٢٦/١٠/٢٩: كانت نافذة الفشل تساوي نافذة الفتح فيأتي الفحص بعد
 * فجوة > 60 ث ويُصفَّر العدّ إلى 1 ولا يُعاد الفتح — المقيس بساعة مزيّفة: بعد
 * فشل الفحص كانت الحالة `half-open` ثم فحصٌ كل 30 ث (فترة الكاش السالب) بدل
 * فحصٍ كل 60 ث؛ هذا ما يفعله قاطع البوّابة بأن نافذة فتحه أقصر من نافذة فشله،
 * وهنا يُفعل صراحةً: `openedAt !== null` عند الفشل ⇐ إعادة فتح وعدٌّ لا يُصفَّر).
 * **نافذة الفتح أطول من الكاش السالب** (60 ث مقابل 30 ث — مراجعة
 * ٢٠٢٦/١٠/٢٩: لمّا تساويا كان كل دور داخل نافذة الفتح يُردّ `negative_cache`
 * أولًا وعند انقضائها يكون القاطع نصف مفتوح، فـ`breaker_open` لا يُرى تسلسليًّا
 * إلا تحت تزامنٍ وفحصٌ جارٍ). **وموعد المجمِّع فشلٌ أيضًا**: إطلاق إشارة
 * الإلغاء يُسجَّل فشلًا من داخل الذراع لا اعتمادًا على رفض العميل — عميلٌ يتجاهل
 * الإشارة كان يترك كل دورٍ تالٍ يدفع الموعد كاملًا ويُبقي فحص نصف المفتوح
 * معلّقًا إلى الأبد (مراجعة ٢٠٢٦/١٠/٢٩). والكاش السالب يُفحص **قبل** حجز فحص
 * نصف المفتوح كي لا يُحجز الفحص ثم يُردّ بالكاش. والبوّابة التي تعرف أصلًا أن
 * المخزن معطّل (`rate.unavailable`) تُسقط الأذرع القاعدية كلّها قبل أن تُشغَّل
 * وتُسجّلها `db_unavailable` في حدث الرصد (`rag.server.ts`).
 *
 * **واللقطة الباردة رحلةٌ واحدة (single-flight):** أدوارٌ متزامنة على معزولٍ
 * بارد كانت تقرأ الجداول الثلاث كلٌّ لنفسها (قاسه المراجع: 10 أدوار متزامنة
 * ⇐ 30 قراءة)؛ الآن أول دور يملك الجلب ويحتفظ بوعده في `hcisState.inflight`،
 * والمتزامنون ينتظرونه (كلٌّ محدود بموعد مجمِّعه)، والنجاح/الفشل يُحتسب مرّةً
 * من مالكه.
 *
 * ## الهوية والسلامة
 *
 * كل مقتطف **وعنوان ومعرّف مصدر** يمرّ بـ`safeExcerpt` (حذف PII وتحييد الحقن
 * **وعلامات المصدر المزوّرة** `[DOC:`/`[KB:`/`(sim NN%)`)، ومقتطفات `finn_*` تمرّ
 * قبله بـ`stripPersonIdentity` (SEC-01: لا «أنشأه:» ولا رقم وظيفي). المطابقة
 * نفسها تقع على النصّ بعد الحجب — مطابقةٌ على الهوية تؤكّدها. والعنوان
 * (`cleanTitle`) كان يُنزع منه القوسان فقط فيصل «(sim 99%)» ونصّ الحقن خامًا إلى
 * الوسم (مراجعة ٢٠٢٦/١٠/٢٩) — والبناء في `rag.server.ts` يعيد التنقية سياجًا
 * ثانيًا. **و`provenance.docId`** (`finn_knowledge.source` · `doc_code` · رمز HCIS)
 * كان الحقل النصّي الوحيد من الصفّ الذي يخرج من الذراع خامًا (البناء وحده ينقّيه
 * بـ`safeSource`): لا تسرّب اليوم لأن `retrieval.arms` لا يُسجَّل ولا يُبثّ، لكن
 * القاعدة «كل نصّ من الصفّ يُنقّى في الذراع» صارت بلا استثناء (`cleanSource`،
 * مراجعة ثالثة ٢٠٢٦/١٠/٢٩).
 */
import { stripPersonIdentity } from "@/lib/maintenance/person-identity.server";
import { ARM_NAMES } from "@/lib/retrieval/aggregate.server";
import {
  assertSearchLimit,
  BM25_MAX_DOC_CHARS,
  buildBm25Index,
  isDigitRun,
  searchBm25,
  tokenize,
} from "@/lib/retrieval/bm25.server";
import { normalizeArLight } from "@/lib/retrieval/normalize-ar.server";
import { HCIS_FAMILY_AR, type HcisTable } from "@/lib/retrieval/sources/seed-corpus.server";
import type { ArmResult, Hit, RetrievalArm, RetrievalContext } from "@/lib/retrieval/types";
import { isHcisReferenceQuery } from "../hcis-reference";
import { safeExcerpt } from "./sanitize.server";

/** عميل قراءة بأدنى شكل — `SupabaseClient` يفي به، والاختبار يمرّر بديلًا. */
export interface LexicalDbClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- سلاسل postgrest غير منمّطة هنا عمدًا
  from: (table: string) => any;
}

type Row = Record<string, unknown>;
type QueryOutcome = { data: Row[] | null; error: { code?: string; message?: string } | null };

export const ILIKE_MAX_TERMS = 6;
export const ILIKE_MIN_WORD_LENGTH = 3;
/**
 * سقف صفوف المرشّحين لكل جدول — الجداول صغيرة اليوم (`finn_knowledge` 46 ·
 * `finn_document_chunks` 18 — المقيس على الإنتاج ٢٠٢٦/١٠/١٢، التدقيق §٢.٣؛
 * `sec_knowledge_articles` **لم يُقَس**) والسقف يحمي الغد.
 */
export const CANDIDATE_ROW_LIMIT = 40;
export const HCIS_REFERENCE_ROW_LIMIT = 12;
export const LEXICAL_HIT_LIMIT = 8;
export const KNOWLEDGE_EXCERPT_CHARS = 500;
export const CHUNK_EXCERPT_CHARS = 400;
export const HCIS_SCOPE_EXCERPT_CHARS = 320;

/** لقطة `hcis_*` تبقى صالحة خمس دقائق — بذرة ثابتة، لا بياناتٍ حيّة تتغيّر. */
export const HCIS_SNAPSHOT_TTL_MS = 300_000;
/** بعد أي فشل تُتخطّى الذراع هذه المدّة بلا نداء. */
export const HCIS_NEGATIVE_CACHE_MS = 30_000;
/**
 * قاطع على شكل `rate-limit.server.ts`: خمسة فشلٍ متتالية بلا فجوة تتجاوز 60 ث
 * بين فشلين ⇐ مفتوح 60 ث ⇐ فحصٌ واحد؛ وفشل الفحص يعيد الفتح 60 ث أخرى بلا
 * تصفير (الترويسة). نافذة الفتح أطول من الكاش السالب عمدًا كي تكون حالة
 * `breaker_open` حالةً حقيقية لا اسمًا.
 */
export const HCIS_BREAKER_FAILURE_THRESHOLD = 5;
export const HCIS_BREAKER_FAILURE_WINDOW_MS = 60_000;
export const HCIS_BREAKER_OPEN_MS = 60_000;

const ARTICLE_PREFIXES = [
  "وبال",
  "فبال",
  "وكال",
  "فكال",
  "ولل",
  "فلل",
  "وال",
  "بال",
  "فال",
  "كال",
  "ال",
  "لل",
];
const WORD_RUN = /[\p{L}\p{N}]+/gu;
// الأرقام الهندية ٠–٩ والفارسية ۰–۹ ⇐ ASCII في كلمات الجلب (الطيّ الخفيف لا يمسّها).
const NON_ASCII_DIGIT = /[٠-٩۰-۹]/g;
const foldDigits = (w: string) =>
  w.replace(NON_ASCII_DIGIT, (d) => {
    const cp = d.codePointAt(0)!;
    return String.fromCharCode((cp >= 0x06f0 ? cp - 0x06f0 : cp - 0x0660) + 0x30);
  });

/**
 * كلمات المحتوى من السؤال لصياغة `ilike`: الطيّ الخفيف (لا طيّ حروف — كما
 * كُتبت في القاعدة) مع طيّ الأرقام إلى ASCII، بلا كلمات وصل (يحكم بها
 * `tokenize`)، بلا أداة التعريف، بطول ≥ `ILIKE_MIN_WORD_LENGTH`، الأطول أولًا،
 * بلا تكرار، حتى `ILIKE_MAX_TERMS`. حروفٌ وأرقام فقط — فلا فاصلة ولا قوس يكسر
 * سلسلة `.or()`.
 */
export function ilikeTerms(query: string): string[] {
  const words = normalizeArLight(query).match(WORD_RUN) ?? [];
  const out = new Set<string>();
  for (const raw of words) {
    if (tokenize(raw).length === 0) continue; // كلمة وصل أو أقصر من مقطع
    let w = foldDigits(raw);
    const p = ARTICLE_PREFIXES.find((x) => w.startsWith(x) && w.length - x.length >= 3);
    if (p) w = w.slice(p.length);
    if (w.length >= ILIKE_MIN_WORD_LENGTH) out.add(w);
  }
  return Array.from(out)
    .sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, ILIKE_MAX_TERMS);
}

/** سلسلة `.or()` بصيغة PostgREST: `col.ilike.*w*` لكل عمود وكلمة. */
export function ilikeOrFilter(columns: readonly string[], terms: readonly string[]): string {
  return terms.flatMap((w) => columns.map((c) => `${c}.ilike.*${w}*`)).join(",");
}

/**
 * نافذة النصّ حول أول كلمة جلب واردة: نصٌّ أطول من `maxChars` تُقصّ منه
 * نافذة بطول `maxChars` تبدأ قبل أول مطابقة بربع النافذة (ولو كانت المطابقة
 * في الرأس فالرأس). المقارنة على الحالة الصغيرة كما يطابق `ilike`؛ كلمةٌ لا
 * تُرى (مثلًا تحت التشكيل) ⇐ الرأس كما كان. تُعيد النافذة وهل قُصّ رأسها.
 */
export function matchWindow(
  text: string,
  terms: readonly string[],
  maxChars: number,
): { text: string; cutHead: boolean } {
  if (text.length <= maxChars) return { text, cutHead: false };
  const lower = text.toLowerCase();
  let first = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0 && (first < 0 || i < first)) first = i;
  }
  const start =
    first < 0 ? 0 : Math.max(0, Math.min(first - (maxChars >> 2), text.length - maxChars));
  return { text: text.slice(start, start + maxChars), cutHead: start > 0 };
}

/** مقتطف محدود حول المطابقة لا رأس النصّ، بعلامة «…» حين قُصّ الرأس. */
function excerptAround(text: string, terms: readonly string[], chars: number): string {
  const w = matchWindow(text, terms, chars);
  return safeExcerpt(w.cutHead ? `…${w.text}` : w.text, chars + 1);
}

/** رمز الخطأ بلا رسالته — الرسالة قد تحمل نصّ الاستعلام وتصل سجلّ الأحداث. */
export function errorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^[A-Za-z0-9_]{1,16}$/.test(code)) return code;
    const name = (error as { name?: unknown }).name;
    if (name === "AbortError") return "aborted";
  }
  return "error";
}

interface Candidate {
  id: string;
  text: string;
  hit: Omit<Hit, "score" | "rank">;
  /** HCIS: مطابقة على أرقام الرمز وحدها لا تُحتسب (درس المتن المبذور). */
  requireNonDigitMatch?: boolean;
}

/** الترتيب المحلّي الحتمي بنواة BM25 — واحدٌ لكل الأذرع. */
export function rankCandidates(
  candidates: readonly Candidate[],
  query: string,
  limit: number,
): Hit[] {
  assertSearchLimit(limit);
  if (candidates.length === 0) return [];
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const index = buildBm25Index(candidates.map((c) => ({ id: c.id, text: c.text })));
  return searchBm25(index, query, candidates.length)
    .filter((h) => {
      const c = byId.get(h.id)!;
      return !c.requireNonDigitMatch || h.matched.some((t) => !isDigitRun(t));
    })
    .slice(0, limit)
    .map((h, i) => ({ ...byId.get(h.id)!.hit, score: h.score, rank: i + 1 }));
}

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
export const TITLE_CHARS = 160;
export const SOURCE_CHARS = 120;
/** العنوان بالمرشّحات نفسها التي يمرّ بها المقتطف، ثم بلا أقواس (ضيّقة أو عريضة) ولا أسطر. */
const cleanTitle = (v: unknown): string =>
  safeExcerpt(str(v), TITLE_CHARS)
    .replace(/[[\]［］\r\n<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TITLE_CHARS);
/** معرّف المصدر (`source`/`doc_code`/رمز) بالمرشّحات نفسها، سطرًا واحدًا قصيرًا — كما `safeSource` في البناء. */
const cleanSource = (v: unknown): string =>
  safeExcerpt(str(v), SOURCE_CHARS).replace(/\s+/g, " ").trim().slice(0, SOURCE_CHARS);

async function runQuery(pending: PromiseLike<QueryOutcome>): Promise<Row[]> {
  const { data, error } = await pending;
  if (error) throw error;
  return data ?? [];
}

function unserved(arm: string, reason: string, started: number): ArmResult {
  return { arm, served: false, hits: [], reason, latencyMs: Date.now() - started };
}

// ── (ب) hcis_* الحيّة ───────────────────────────────────────────────────────

interface HcisDoc {
  code: string;
  table: HcisTable;
  title: string;
  text: string;
  scope: string;
}

const hcisState = {
  snapshot: null as { at: number; docs: HcisDoc[] } | null,
  negativeUntil: 0,
  consecutiveFailures: 0,
  lastFailureAt: null as number | null,
  openedAt: null as number | null,
  probing: false,
  /** الجلب الجاري على معزولٍ بارد — المتزامنون ينتظرونه بدل تكرار القراءات. */
  inflight: null as Promise<HcisDoc[]> | null,
};

function hcisBreakerSkip(now: number): boolean {
  if (hcisState.openedAt === null) return false;
  if (now - hcisState.openedAt < HCIS_BREAKER_OPEN_MS) return true;
  if (hcisState.probing) return true;
  hcisState.probing = true;
  return false;
}

function hcisNoteFailure(now: number): void {
  // فشلٌ والقاطع مفتوح أو نصف مفتوح = فشل الفحص: يُعاد الفتح نافذةً كاملة ولا
  // يُصفَّر العدّ بالفجوة (الفحص يأتي بعد فجوة ≥ نافذة الفتح بالبناء — الترويسة).
  const probeFailed = hcisState.openedAt !== null;
  if (
    !probeFailed &&
    hcisState.lastFailureAt !== null &&
    now - hcisState.lastFailureAt > HCIS_BREAKER_FAILURE_WINDOW_MS
  )
    hcisState.consecutiveFailures = 0;
  hcisState.consecutiveFailures += 1;
  hcisState.lastFailureAt = now;
  hcisState.probing = false;
  hcisState.negativeUntil = now + HCIS_NEGATIVE_CACHE_MS;
  if (probeFailed || hcisState.consecutiveFailures >= HCIS_BREAKER_FAILURE_THRESHOLD)
    hcisState.openedAt = now;
}

function hcisNoteSuccess(now: number, docs: HcisDoc[]): void {
  hcisState.consecutiveFailures = 0;
  hcisState.openedAt = null;
  hcisState.probing = false;
  hcisState.negativeUntil = 0;
  hcisState.snapshot = { at: now, docs };
}

/** حالة ذراع HCIS للمراقبة والاختبار — أعدادٌ وطوابع لا غير. */
export function hcisLiveArmState() {
  const now = Date.now();
  return {
    breaker:
      hcisState.openedAt === null
        ? "closed"
        : now - hcisState.openedAt < HCIS_BREAKER_OPEN_MS
          ? "open"
          : "half-open",
    consecutiveFailures: hcisState.consecutiveFailures,
    negativeCached: hcisState.negativeUntil > now,
    snapshotDocs: hcisState.snapshot?.docs.length ?? 0,
    inflight: hcisState.inflight !== null,
  } as const;
}

/** للاختبارات وحدها. */
export function resetLexicalArmsStateForTests(): void {
  hcisState.snapshot = null;
  hcisState.negativeUntil = 0;
  hcisState.consecutiveFailures = 0;
  hcisState.lastFailureAt = null;
  hcisState.openedAt = null;
  hcisState.probing = false;
  hcisState.inflight = null;
}

/**
 * الجلب البارد الوحيد: يملكه الدور الذي بدأه (إشارته هي التي تهجره، وفشله
 * ونجاحه يُحتسبان مرّةً هنا)، ويُحفظ وعده في `hcisState.inflight` حتى يُحسم.
 * موعد المجمِّع فشلٌ يُحتسب من داخل الذراع لا من رفض العميل (انظر الترويسة).
 */
function startHcisFetch(client: LexicalDbClient, signal?: AbortSignal): Promise<HcisDoc[]> {
  let settled = false;
  let p: Promise<HcisDoc[]> | null = null;
  const onAbort = () => {
    if (settled) return;
    settled = true;
    hcisNoteFailure(Date.now());
    // عميلٌ لا يردّ أبدًا كان يُبقي الرحلة «جارية» فينضمّ كل دورٍ تالٍ إلى وعدٍ ميّت بدل الكاش السالب.
    if (hcisState.inflight === p) hcisState.inflight = null;
  };
  if (signal?.aborted) onAbort();
  else signal?.addEventListener("abort", onAbort, { once: true });
  p = (async () => {
    try {
      const fetched = await fetchHcisSnapshot(client, signal);
      // لقطةٌ وصلت بعد الهجر بياناتٌ حقيقية تُخزَّن للدور التالي — والدور الحالي قد مضى.
      hcisNoteSuccess(Date.now(), fetched);
      if (settled) throw Object.assign(new Error("aborted"), { name: "AbortError" });
      settled = true;
      return fetched;
    } catch (error) {
      if (!settled) {
        settled = true;
        hcisNoteFailure(Date.now());
      }
      throw error;
    } finally {
      signal?.removeEventListener("abort", onAbort);
      if (hcisState.inflight === p) hcisState.inflight = null;
    }
  })();
  hcisState.inflight = settled ? null : p;
  return p;
}

async function fetchHcisSnapshot(
  client: LexicalDbClient,
  signal?: AbortSignal,
): Promise<HcisDoc[]> {
  const q = (table: string, columns: string) => {
    let b = client.from(table).select(columns);
    if (signal && typeof b.abortSignal === "function") b = b.abortSignal(signal);
    return runQuery(b as PromiseLike<QueryOutcome>);
  };
  const [directives, stages, sectors] = await Promise.all([
    q("hcis_directives", "code,category,name_ar,scope_ar"),
    q("hcis_approval_stages", "stage_no,name_ar,description_ar"),
    q("hcis_sectors", "id,name_ar"),
  ]);
  const docs: HcisDoc[] = [];
  for (const r of directives) {
    const code = cleanSource(r.code);
    if (!code) continue;
    docs.push({
      code,
      table: "hcis_directives",
      title: cleanTitle(r.name_ar),
      scope: str(r.scope_ar),
      text: `${HCIS_FAMILY_AR.hcis_directives} ${code} ${str(r.category)} ${str(r.name_ar)}\n${str(r.scope_ar)}`,
    });
  }
  for (const r of stages) {
    const n = Number(r.stage_no);
    if (!Number.isInteger(n)) continue;
    const code = `STAGE-${String(n).padStart(2, "0")}`;
    docs.push({
      code,
      table: "hcis_approval_stages",
      title: cleanTitle(r.name_ar),
      scope: str(r.description_ar),
      text: `${HCIS_FAMILY_AR.hcis_approval_stages} ${code} ${str(r.name_ar)}\n${str(r.description_ar)}`,
    });
  }
  for (const r of sectors) {
    const n = Number(r.id);
    if (!Number.isInteger(n)) continue;
    const code = `SECTOR-${String(n).padStart(2, "0")}`;
    docs.push({
      code,
      table: "hcis_sectors",
      title: cleanTitle(r.name_ar),
      scope: "",
      text: `${HCIS_FAMILY_AR.hcis_sectors} ${code} ${str(r.name_ar)}`,
    });
  }
  return docs;
}

/**
 * (ب) — المعرّف `SEC-02`/`STAGE-04`/`SECTOR-03` بالمصدر `hcis` **هو معرّف
 * الفهرس الداخلي نفسه**، فيدمجهما RRF نتيجةً واحدة بإسهامين، وتفوز هذه
 * الذراع بحقول النصّ (نطاق التوجيه الحيّ) حين تُرتَّب أولًا في القوائم.
 */
export function hcisLiveArm(client: LexicalDbClient): RetrievalArm {
  return {
    name: ARM_NAMES.hcisLive,
    async run(query, _ctx, _deadlineMs, signal) {
      const started = Date.now();
      let docs =
        hcisState.snapshot && started - hcisState.snapshot.at < HCIS_SNAPSHOT_TTL_MS
          ? hcisState.snapshot.docs
          : null;
      if (!docs) {
        // جلبٌ جارٍ لدورٍ متزامن ⇐ ننتظره بلا قراءة جديدة (رحلة واحدة للمعزول البارد).
        const joined = hcisState.inflight;
        if (joined) {
          try {
            docs = await joined;
          } catch (error) {
            // رحلة المالك هُجرت عند موعده ⇐ سبب المنضمّ `timeout` (السبب موعدٌ لا
            // إلغاءٌ مستقلّ): كان يُردّ `aborted` فينذر كل منضمّ `rag.arm_failed` برمز
            // غير موثَّق ويشقّ حدث موعدٍ واحد إلى رمزين (مراجعة ثالثة ٢٠٢٦/١٠/٢٩).
            const code = errorCode(error);
            return unserved(ARM_NAMES.hcisLive, code === "aborted" ? "timeout" : code, started);
          }
        } else {
          // الكاش السالب قبل حجز فحص نصف المفتوح: الحجز ثم الردّ بالكاش كان يترك
          // `probing = true` فيُردّ كل دورٍ تالٍ `breaker_open` حتى إعادة التشغيل.
          if (hcisState.negativeUntil > started)
            return unserved(ARM_NAMES.hcisLive, "negative_cache", started);
          if (hcisBreakerSkip(started))
            return unserved(ARM_NAMES.hcisLive, "breaker_open", started);
          try {
            docs = await startHcisFetch(client, signal);
          } catch (error) {
            return unserved(ARM_NAMES.hcisLive, errorCode(error), started);
          }
        }
      }
      const hits = rankCandidates(
        docs.map<Candidate>((d) => ({
          id: d.code,
          text: d.text,
          requireNonDigitMatch: true,
          hit: {
            id: d.code,
            source: "hcis",
            title: d.title,
            excerpt: safeExcerpt(
              d.scope ? `${d.code} — ${d.title}: ${d.scope}` : `${d.code} — ${d.title}`,
              HCIS_SCOPE_EXCERPT_CHARS,
            ),
            provenance: { table: d.table, docId: d.code, citable: true, label: "مطابقة نصّية" },
          },
        })),
        query,
        LEXICAL_HIT_LIMIT,
      );
      return {
        arm: ARM_NAMES.hcisLive,
        served: true,
        hits,
        reason: null,
        latencyMs: Date.now() - started,
      };
    },
  };
}

// ── (ج) finn_knowledge ───────────────────────────────────────────────────────

function withSignal(builder: { abortSignal?: (s: AbortSignal) => unknown }, signal?: AbortSignal) {
  return signal && typeof builder.abortSignal === "function"
    ? builder.abortSignal(signal)
    : builder;
}

/**
 * (ج) `finn_knowledge` تحت JWT المستدعي. تطوي قراءة HCIS المباشرة القديمة
 * (`chat.ts` ~:922-973، `similarity: 1` المختلَق): حين يكون السؤال مرجعيًّا
 * (`isHcisReferenceQuery`) تُضاف صفوف `source like 'hcis/%'` إلى المرشّحين،
 * وما لم يطابق منها معجميًّا يُلحق بعد المطابق — بالوسم `[KB:title]` نفسه
 * و«مطابقة نصّية» لا رقمًا.
 */
export function finnKnowledgeArm(client: LexicalDbClient): RetrievalArm {
  return {
    name: ARM_NAMES.finnKnowledge,
    async run(query, ctx, _deadlineMs, signal) {
      const started = Date.now();
      if (ctx.audience !== "member") return unserved(ARM_NAMES.finnKnowledge, "guest", started);
      const terms = ilikeTerms(query);
      const hcisQuery = isHcisReferenceQuery(query);
      try {
        const reads: Promise<Row[]>[] = [];
        if (terms.length)
          reads.push(
            runQuery(
              withSignal(
                client
                  .from("finn_knowledge")
                  .select("id,title,source,content")
                  .or(ilikeOrFilter(["title", "content"], terms))
                  .limit(CANDIDATE_ROW_LIMIT),
                signal,
              ) as PromiseLike<QueryOutcome>,
            ),
          );
        if (hcisQuery)
          reads.push(
            runQuery(
              withSignal(
                client
                  .from("finn_knowledge")
                  .select("id,title,source,content")
                  .like("source", "hcis/%")
                  .order("source", { ascending: true })
                  .limit(HCIS_REFERENCE_ROW_LIMIT),
                signal,
              ) as PromiseLike<QueryOutcome>,
            ),
          );
        const rows = new Map<string, Row>();
        for (const batch of await Promise.all(reads))
          for (const r of batch) if (typeof r.id === "string") rows.set(r.id, r);
        const candidates = Array.from(rows.values()).map<Candidate>((r) => {
          const content = stripPersonIdentity(str(r.content));
          return {
            id: str(r.id),
            text: matchWindow(`${str(r.title)}\n${content}`, terms, BM25_MAX_DOC_CHARS).text,
            hit: {
              id: str(r.id),
              source: "knowledge",
              title: cleanTitle(r.title),
              excerpt: excerptAround(content, terms, KNOWLEDGE_EXCERPT_CHARS),
              provenance: {
                table: "finn_knowledge",
                docId: cleanSource(r.source) || str(r.id),
                citable: true,
                label: "مطابقة نصّية",
              },
            },
          };
        });
        const ranked = rankCandidates(candidates, query, LEXICAL_HIT_LIMIT);
        if (hcisQuery && ranked.length < LEXICAL_HIT_LIMIT) {
          // صفوف HCIS التي لم تطابق مقطعًا تُلحق كما كانت تُحقن كلّها قبل الطيّ — لكن بعد المطابق وبدرجة صفر.
          const seen = new Set(ranked.map((h) => h.id));
          for (const c of candidates) {
            if (ranked.length >= LEXICAL_HIT_LIMIT) break;
            if (seen.has(c.id) || !(c.hit.provenance.docId ?? "").startsWith("hcis/")) continue;
            ranked.push({ ...c.hit, score: 0, rank: ranked.length + 1 });
          }
        }
        return {
          arm: ARM_NAMES.finnKnowledge,
          served: true,
          hits: ranked,
          reason: null,
          latencyMs: Date.now() - started,
        };
      } catch (error) {
        return unserved(ARM_NAMES.finnKnowledge, errorCode(error), started);
      }
    },
  };
}

// ── (ج) sec_knowledge_articles ───────────────────────────────────────────────

/** مقالات المعرفة المنشورة: عامّة (`org_id is null`) أو لمؤسسة المستدعي. */
export function secKnowledgeArm(client: LexicalDbClient): RetrievalArm {
  return {
    name: ARM_NAMES.secKnowledge,
    async run(query, ctx, _deadlineMs, signal) {
      const started = Date.now();
      if (ctx.audience !== "member") return unserved(ARM_NAMES.secKnowledge, "guest", started);
      const terms = ilikeTerms(query);
      if (terms.length === 0)
        return { arm: ARM_NAMES.secKnowledge, served: true, hits: [], reason: null, latencyMs: 0 };
      try {
        let b = client
          .from("sec_knowledge_articles")
          .select("id,doc_code,title_ar,summary_ar,purpose_ar,keywords_ar,org_id")
          .eq("status", "published");
        b = ctx.orgId ? b.or(`org_id.is.null,org_id.eq.${ctx.orgId}`) : b.is("org_id", null);
        b = b
          .or(ilikeOrFilter(["title_ar", "summary_ar", "search_text_ar"], terms))
          .limit(CANDIDATE_ROW_LIMIT);
        const rows = await runQuery(withSignal(b, signal) as PromiseLike<QueryOutcome>);
        const candidates = rows
          .filter((r) => typeof r.id === "string")
          .map<Candidate>((r) => {
            const keywords = Array.isArray(r.keywords_ar) ? r.keywords_ar.map(str).join(" ") : "";
            const body = str(r.summary_ar) || str(r.purpose_ar);
            return {
              id: str(r.id),
              text: matchWindow(
                `${str(r.title_ar)}\n${str(r.summary_ar)}\n${str(r.purpose_ar)}\n${keywords}`,
                terms,
                BM25_MAX_DOC_CHARS,
              ).text,
              hit: {
                id: str(r.id),
                source: "knowledge",
                title: cleanTitle(r.title_ar),
                excerpt: excerptAround(body, terms, KNOWLEDGE_EXCERPT_CHARS),
                provenance: {
                  table: "sec_knowledge_articles",
                  docId: cleanSource(r.doc_code) || str(r.id),
                  citable: true,
                  label: "مطابقة نصّية",
                },
              },
            };
          });
        return {
          arm: ARM_NAMES.secKnowledge,
          served: true,
          hits: rankCandidates(candidates, query, LEXICAL_HIT_LIMIT),
          reason: null,
          latencyMs: Date.now() - started,
        };
      } catch (error) {
        return unserved(ARM_NAMES.secKnowledge, errorCode(error), started);
      }
    },
  };
}

// ── (د) finn_document_chunks — سياقٌ «غير موثّق» ────────────────────────────

/**
 * قرار المالك ⑤: المقاطع تُقرأ سياقًا موسومًا «غير موثّق» فقط — الحقلان
 * `source: "upload-unverified"` و`citable: false` **معًا** هما ما يمنع
 * `rag.server.ts` من جعلها `[DOC:]` (الحارس يقرأ الحقلين، ترويسة الملف).
 * و`userId` يقيّد الصفوف بصاحبها فوق RLS (دفاعٌ في العمق): بلا `userId` لا
 * استعلام (`guest`).
 */
export function documentChunksArm(client: LexicalDbClient, userId: string | null): RetrievalArm {
  return {
    name: ARM_NAMES.documentChunks,
    async run(query, ctx, _deadlineMs, signal) {
      const started = Date.now();
      if (ctx.audience !== "member" || !userId)
        return unserved(ARM_NAMES.documentChunks, "guest", started);
      const terms = ilikeTerms(query);
      if (terms.length === 0)
        return {
          arm: ARM_NAMES.documentChunks,
          served: true,
          hits: [],
          reason: null,
          latencyMs: 0,
        };
      try {
        const rows = await runQuery(
          withSignal(
            client
              .from("finn_document_chunks")
              .select("id,document_id,chunk_index,content,finn_documents!inner(title,status)")
              .eq("user_id", userId)
              .eq("finn_documents.status", "ready")
              .or(ilikeOrFilter(["content"], terms))
              .limit(CANDIDATE_ROW_LIMIT),
            signal,
          ) as PromiseLike<QueryOutcome>,
        );
        const candidates = rows
          .filter((r) => typeof r.id === "string")
          .map<Candidate>((r) => {
            const doc = (r.finn_documents ?? {}) as Row;
            const content = stripPersonIdentity(str(r.content));
            const chunkIndex = Number(r.chunk_index);
            return {
              id: str(r.id),
              text: matchWindow(content, terms, BM25_MAX_DOC_CHARS).text,
              hit: {
                id: str(r.id),
                source: "upload-unverified",
                title: cleanTitle(doc.title) || "مستند مرفوع",
                excerpt: excerptAround(content, terms, CHUNK_EXCERPT_CHARS),
                provenance: {
                  table: "finn_document_chunks",
                  docId: str(r.document_id),
                  chunkIndex: Number.isInteger(chunkIndex) ? chunkIndex : undefined,
                  citable: false,
                  label: "مطابقة نصّية",
                },
              },
            };
          });
        return {
          arm: ARM_NAMES.documentChunks,
          served: true,
          hits: rankCandidates(candidates, query, LEXICAL_HIT_LIMIT),
          reason: null,
          latencyMs: Date.now() - started,
        };
      } catch (error) {
        return unserved(ARM_NAMES.documentChunks, errorCode(error), started);
      }
    },
  };
}
