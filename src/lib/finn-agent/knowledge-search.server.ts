/**
 * أداة فِن الرابعة `knowledge_search` — **قراءةٌ فقط، على الفهرس الداخلي في المستودع وحده.**
 *
 * أمر المالك ٢٠٢٦/١٠/٢٩ (تدقيق RAG، O8(أ)، القرار ① «كلاهما»): إحكام الاسترجاع في وكيل فِن
 * أيضًا. ما تفعله الأداة وما لا تفعله، والحدّ الذي تحرسه الوحدة نفسها لا الموجِّه وحده:
 *
 * 1. **الفهرس الداخلي وحده**: `searchSeedCorpus` من نواة الاسترجاع (`src/lib/retrieval`) —
 *    مراجع المنصّة العامة المضمّنة وأسماء توجيهات HCIS المبذورة، من بياناتٍ مصدَّرة في الريبو.
 *    **لا قاعدة** (لا يُستورد عميل Supabase ولا يُقرأ `hcis_*` ولا `finn_*`)، **ولا شبكة**،
 *    **ولا نموذج تضمين**. سببه وعدُ الموجِّه «ولا ترى قاعدة الإنتاج»، فالأداة لا تنقضه.
 *    (وفي الإنتاج، المقيس ٢٠٢٦/١٠/٣٠: دور `anon` لا يقرأ صفًّا من تلك الجداول أصلًا.)
 * 2. **وسمٌ صادق**: الذراع معجمية (BM25) فالوسم «مطابقة نصّية» ولا حقل درجة ولا نسبة تشابه
 *    في الناتج (المادة ٢٧). الترتيب في المصفوفة هو كل ما يُقال عن الأفضلية.
 * 3. **مخرجاتٌ محدودة ومعقَّمة**: العنوان والمقتطف يمرّان بـ`safeExcerpt` (حذف PII وتحييد حقن
 *    التعليمات وعلامات الاستشهاد المزوّرة) ثم يُحجب أيُّ شكل سرٍّ معروف، ويُطوى الفراغ وتُنزع
 *    محارف التحكّم ويُقصّ الطول.
 * 4. **صدقٌ عند الفراغ**: فهرسٌ بلا مداخل ⇒ `not_configured`؛ استعلامٌ بلا مطابقة ⇒
 *    `no_results` (نجاحُ بحثٍ لم يجد، لا فشل). لا بديلٌ مكتوب ولا مرجعٌ مؤلَّف.
 * 5. **لا نصّ استعلام في أي سجلّ**: التدقيق (`audited` في `tools.server.ts`) يكتب اسم الأداة
 *    والنتيجة والزمن فقط، وهذه الوحدة لا تطبع شيئًا.
 *
 * وحدةٌ خادمية (`.server.ts`) فلا يصل العميلَ منها شيء، ولا يستوردها غير `tools.server.ts`.
 */
import {
  listSeedCorpusEntries,
  searchSeedCorpus,
} from "@/lib/retrieval/sources/seed-corpus.server";
import type { Hit } from "@/lib/retrieval/types";
import { safeExcerpt } from "@/lib/sadeed/rag/sanitize.server";
import { maskSecrets } from "./secret-shapes";

/** سقف طول الاستعلام الذي يُطابَق (حرف) — ما بعده يُقصّ قبل البحث. */
export const KNOWLEDGE_QUERY_MAX_CHARS = 300;
/** أقصى عدد نتائج تعيده الأداة، والافتراضي حين لا يحدّد المستدعي. */
export const KNOWLEDGE_MAX_LIMIT = 5;
export const KNOWLEDGE_DEFAULT_LIMIT = 3;
const TITLE_MAX_CHARS = 120;
const EXCERPT_MAX_CHARS = 240;

/** وسم الذراع كما يُطبع: مطابقةٌ نصّية، لا «تشابه» ولا نسبة. */
export const KNOWLEDGE_MATCH_LABEL = "مطابقة نصّية" as const;
export const KNOWLEDGE_SOURCE = "in-repo-index" as const;

export type KnowledgeItem = {
  readonly id: string;
  readonly kind: "seed" | "hcis";
  readonly title: string;
  readonly excerpt: string;
  /** يجوز الاستشهاد به (مرجعٌ مضمّن مراجَع) — ليس حالة `verified` في القاعدة. */
  readonly citable: boolean;
};

export type KnowledgeSearchResult =
  | {
      readonly ok: true;
      readonly source: typeof KNOWLEDGE_SOURCE;
      /** نصٌّ مسترجَع بياناتٌ تُقتبس لا تعليماتٌ تُتّبع (يوجب الموجِّه ذلك). */
      readonly untrusted: true;
      readonly match: typeof KNOWLEDGE_MATCH_LABEL;
      readonly total: number;
      readonly items: readonly KnowledgeItem[];
      /** `no_results` حين لا مطابقة؛ غائب حين وُجدت نتائج. */
      readonly reason?: "no_results";
    }
  | { readonly ok: false; readonly configured: false; readonly reason: "not_configured" };

/** ما تحتاجه الأداة من الفهرس — يُحقن في الاختبار لتجربة الفراغ والنصّ المسموم. */
export type KnowledgeIndex = {
  readonly entryCount: () => number;
  readonly search: (query: string, limit: number) => Hit[];
};

const internalIndex: KnowledgeIndex = {
  entryCount: () => listSeedCorpusEntries().length,
  search: (query, limit) => searchSeedCorpus(query, limit),
};

/** محارف التحكّم وفواصل الأسطر الأحادية ⇒ مسافة (بدالةٍ لا تعبيرٍ نمطيّ: يمنعه no-control-regex). */
function stripControl(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f || code === 0x2028 || code === 0x2029 ? " " : ch;
  }
  return out;
}

/** حقلٌ معروض: تعقيم الاسترجاع ثم سطرٌ واحد مقصوص. */
function cleanField(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const oneLine = stripControl(maskSecrets(safeExcerpt(value, max * 2)))
    .replace(/\s+/g, " ")
    .trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

function clampLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isInteger(limit)) return KNOWLEDGE_DEFAULT_LIMIT;
  return Math.min(KNOWLEDGE_MAX_LIMIT, Math.max(1, limit));
}

/** البحث الفعلي — متزامن وبلا شبكة. لا يرمي لمدخلٍ غريب: استعلامٌ فارغ يعطي `no_results`. */
export function knowledgeSearch(
  input: { query: string; limit?: number },
  index: KnowledgeIndex = internalIndex,
): KnowledgeSearchResult {
  if (index.entryCount() <= 0) {
    return { ok: false, configured: false, reason: "not_configured" };
  }
  const query =
    typeof input.query === "string" ? input.query.slice(0, KNOWLEDGE_QUERY_MAX_CHARS) : "";
  const limit = clampLimit(input.limit);
  const items: KnowledgeItem[] = index
    .search(query, limit)
    .slice(0, limit)
    .map((hit) => ({
      id: cleanField(hit.id, 80),
      kind: hit.source === "hcis" ? ("hcis" as const) : ("seed" as const),
      title: cleanField(hit.title, TITLE_MAX_CHARS),
      excerpt: cleanField(hit.excerpt, EXCERPT_MAX_CHARS),
      citable: hit.provenance.citable === true,
    }));
  return {
    ok: true,
    source: KNOWLEDGE_SOURCE,
    untrusted: true,
    match: KNOWLEDGE_MATCH_LABEL,
    total: items.length,
    items,
    ...(items.length === 0 ? { reason: "no_results" as const } : {}),
  };
}
