/**
 * الذراع المعجمية فوق المتن المضمّن في المستودع — تخدم بصفر مزوّد وصفر قاعدة.
 *
 * ## المصدران (توصية التدقيق §٦ ④ وتعليمة الخطوة: لا نسخ نصّ، الفهرس من
 * البيانات المصدَّرة — وقرار المالك في ④ لم يُسجَّل بعد)
 *
 * ١. `SADEED_SAFE_REFERENCE_CORPUS` (`src/lib/sadeed/seed-corpus.data.ts`): ستة
 *    مداخل مرجعية عامة، تُفهرس بعنوانها ومحتواها كما صُدّرت.
 * ٢. `GOLDEN_ANCHORS` (`src/lib/rag/evaluation.ts`): ٤١ اسمًا حرفيًّا من بذرة
 *    `hcis_directives`/`hcis_approval_stages`/`hcis_sectors` مع رموزها. **النصّ
 *    العربي الوحيد لـHCIS المنسوخ إلى TypeScript هو الاسم**؛ أمّا `scope_ar` فلم
 *    يُنسخ من ملف البذرة (`20260719200000`) — المقترح في الخطوة ٢ قراءته من
 *    القاعدة حيًّا (`hcis_*` بسياسة `anon`). ويسبق الرمزَ والاسمَ **كلمة فئة**
 *    مشتقّة من اسم جدول البذرة لا من نصّه (`HCIS_FAMILY_AR`: مرحلة · قطاع ·
 *    توجيه) كي يصل «المرحلة 4» إلى `STAGE-04` — فلا اسم مرحلة يحوي «مرحلة»،
 *    وكان السؤال يرتّبها ثالثةً بعد قطاع الغاز وSEC-04 على الرقم وحده (قاسه
 *    المراجع ٢٠٢٦/١٠/٢٩). فمدخل HCIS هنا «فئةٌ ورمز واسم» بلا نصّ نطاق، وهذا
 *    يُكتب في كل قياس يخرج من هذه الذراع لا يُخفى.
 *
 * ## مطابقة على رقم الرمز وحده ليست إصابة
 *
 * التقطيع يفصل الحرف عن الرقم (`SECTOR-04` ⇐ «sector» + «4»)، فيصير رقم الرمز
 * مقطع محتوى نادرًا ثقيلًا بالـIDF: كان «٤ كاميرات» يعيد قطاع الغاز وSEC-04
 * وSTAGE-04 «مطابقة نصّية» قابلة للاستشهاد، و«10%» يعيد SECTOR-10 وSTAGE-02
 * (قاسه المراجع ٢٠٢٦/١٠/٢٩). القاعدة في `searchSeedCorpus`: نتيجة HCIS تُحتسب
 * فقط إذا طابقت مقطعًا واحدًا على الأقل **ليس سلسلة أرقام** — حروف الرمز
 * («sec» في «SEC-02») أو كلمة من الاسم أو الفئة. ومدخل البذرة لا يُصفّى:
 * أرقامه محتوى. والتصفية **بعد** طلب الفهرس كلّه ثم القصّ إلى `limit` — لا
 * قصٌّ ثم تصفية، وإلا نقصت النتائج الصالحة عن المطلوب.
 *
 * ## ما لا تفعله
 *
 * لا نداء شبكة ولا قاعدة ولا نموذج؛ لا `assertAiEnabled` لأنها ليست نداءً
 * مدفوعًا (التدقيق §٥ «الاسترجاع المعجمي ليس نداءً مدفوعًا فيبقى خارج
 * مفتاح الإيقاف بالتصميم»). ولا توصيل بـ`/api/chat` في الخطوة ١.
 */
import { GOLDEN_ANCHORS } from "@/lib/rag/evaluation";
import { SADEED_SAFE_REFERENCE_CORPUS } from "@/lib/sadeed/seed-corpus.data";
import {
  assertSearchLimit,
  buildBm25Index,
  isDigitRun,
  searchBm25,
  type Bm25Index,
} from "../bm25.server";
import { ARM_NAMES } from "../aggregate.server";
import type { ArmResult, Hit, HitSource, RetrievalArm, RetrievalContext } from "../types";

export const SEED_CORPUS_ARM_NAME = ARM_NAMES.seed;
export const EXCERPT_MAX_CHARS = 240;

export type HcisTable = "hcis_directives" | "hcis_approval_stages" | "hcis_sectors";

export interface SeedCorpusEntry {
  id: string;
  source: Extract<HitSource, "seed" | "hcis">;
  title: string;
  /** النصّ المفهرس — عنوان + محتوى للبذرة، فئة + رمز + اسم لـHCIS. */
  text: string;
  docId: string;
  /** الجدول الذي بُذر منه الاسم (HCIS) — للبذرة لا جدول. */
  table: HcisTable | undefined;
}

/** جدول بذرة كل رمز HCIS بحسب بادئته — كما في `evaluation.ts`. */
function hcisTableOf(code: string): HcisTable {
  if (code.startsWith("STAGE-")) return "hcis_approval_stages";
  if (code.startsWith("SECTOR-")) return "hcis_sectors";
  return "hcis_directives";
}

/**
 * كلمة فئة كل جدول بذرة — من **اسم الجدول** لا من نصّ البذرة (ترويسة الملف):
 * `approval_stages` ⇐ مرحلة، `sectors` ⇐ قطاع، `directives` ⇐ توجيه.
 */
export const HCIS_FAMILY_AR: Readonly<Record<HcisTable, string>> = {
  hcis_directives: "توجيه",
  hcis_approval_stages: "مرحلة",
  hcis_sectors: "قطاع",
};

export function listSeedCorpusEntries(): SeedCorpusEntry[] {
  const seed: SeedCorpusEntry[] = SADEED_SAFE_REFERENCE_CORPUS.map((e) => ({
    id: e.source,
    source: "seed",
    title: e.title,
    text: `${e.title}\n${e.content}`,
    docId: e.source,
    table: undefined,
  }));
  const hcis: SeedCorpusEntry[] = GOLDEN_ANCHORS.map((a) => {
    const table = hcisTableOf(a.code);
    return {
      id: a.code,
      source: "hcis",
      title: a.probeAr,
      text: `${HCIS_FAMILY_AR[table]} ${a.code} ${a.probeAr}`,
      docId: a.code,
      table,
    };
  });
  return [...seed, ...hcis];
}

/**
 * مقتطف محدود: مداخل البذرة تبدأ بتنبيهٍ مشترك يسبق `\n\n` (شكل
 * `seed-corpus.data.ts`)، فيُقتطف ما بعده؛ وHCIS اسمه مقتطفه.
 */
export function excerptOf(entry: SeedCorpusEntry): string {
  if (entry.source === "hcis") return `${entry.docId} — ${entry.title}`;
  const content = entry.text.slice(entry.title.length + 1);
  const sep = content.indexOf("\n\n");
  const body = (sep >= 0 ? content.slice(sep + 2) : content).replace(/\s+/g, " ").trim();
  return body.length > EXCERPT_MAX_CHARS ? `${body.slice(0, EXCERPT_MAX_CHARS - 1)}…` : body;
}

let cached: { index: Bm25Index; byId: Map<string, SeedCorpusEntry> } | null = null;

/** يُبنى مرّة من البيانات المصدَّرة (ثابتة في العملية) — ٤٧ وثيقة، لا سقف يُمسّ. */
function corpus() {
  if (!cached) {
    const entries = listSeedCorpusEntries();
    cached = {
      index: buildBm25Index(entries.map((e) => ({ id: e.id, text: e.text }))),
      byId: new Map(entries.map((e) => [e.id, e])),
    };
  }
  return cached;
}

/**
 * النواة المتزامنة — للقياس وللذراع معًا. استعلام فارغ ⇐ `[]`. نتيجة HCIS
 * مطابقةٍ على أرقامٍ وحدها تُسقَط (ترويسة الملف)، والقصّ إلى `limit` بعد ذلك.
 */
export function searchSeedCorpus(query: string, limit = 5): Hit[] {
  assertSearchLimit(limit);
  const { index, byId } = corpus();
  return searchBm25(index, query, index.docLengths.size)
    .filter((h) => {
      const entry = byId.get(h.id)!;
      return entry.source !== "hcis" || h.matched.some((t) => !isDigitRun(t));
    })
    .slice(0, limit)
    .map((h, i) => {
      const entry = byId.get(h.id)!;
      return {
        id: entry.id,
        source: entry.source,
        title: entry.title,
        excerpt: excerptOf(entry),
        score: h.score,
        rank: i + 1,
        provenance: {
          table: entry.table,
          docId: entry.docId,
          citable: true,
          label: "مطابقة نصّية",
        },
      };
    });
}

/**
 * الذراع. متزامنة داخليًّا فلا تتجاوز موعدًا معقولًا؛ موعدٌ غير موجب يُردّ
 * قبل العمل بسبب صريح، وما عداه يُخدَم ويُقاس كمونه.
 */
export const seedCorpusArm: RetrievalArm = {
  name: SEED_CORPUS_ARM_NAME,
  async run(query: string, _ctx: RetrievalContext, deadlineMs: number): Promise<ArmResult> {
    const started = Date.now();
    if (!(deadlineMs > 0)) {
      return {
        arm: SEED_CORPUS_ARM_NAME,
        served: false,
        hits: [],
        reason: "deadline",
        latencyMs: 0,
      };
    }
    const hits = searchSeedCorpus(query, 5);
    return {
      arm: SEED_CORPUS_ARM_NAME,
      served: true,
      hits,
      reason: null,
      latencyMs: Date.now() - started,
    };
  },
};
