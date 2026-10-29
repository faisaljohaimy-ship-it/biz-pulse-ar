/**
 * دمج الرتب المتبادل (RRF) فوق N قائمة مرتّبة، مع حفظ المصدر.
 *
 * `score(d) = Σ_lists 1 / (k + rank_list(d))`، و`k = 60` كما في
 * `sec_kb_hybrid_search` المطبَّقة (`20260727213148`) وفي `RRF_K` بـ
 * `src/lib/rag/tuning.ts` — القيمة من ورقة Cormack et al. 2009، لم تُضبط هنا.
 *
 * ## لماذا الرتب لا الدرجات
 *
 * درجة BM25 ودرجة الكوساين على مقياسين مختلفين؛ جمعهما يطغى به الأكبر.
 * الرتبة تجعل الذراعين قابلتين للمقارنة. الحالة المزروعة في الاختبار تبني
 * «دمجًا خاطئًا» بجمع الدرجات وتُظهر أن ترتيبه يخالف RRF.
 *
 * ## المصدر محفوظ
 *
 * كل نتيجة مدموجة تحمل `contributions`: أي ذراع رتّبتها وبأي رتبة ودرجة. فإن
 * خدمت المعجمية وحدها قرأ المستهلك ذلك من النتيجة لا من افتراض.
 */
import type { Hit } from "./types";

export const FUSE_K = 60;

export interface RankedList {
  arm: string;
  /** بترتيب الذراع؛ الرتبة هي الموضع (1 فأعلى) لا حقل `rank` المُدخل. */
  hits: readonly Hit[];
}

export interface FusionContribution {
  arm: string;
  rank: number;
  score: number;
}

export interface FusedHit extends Hit {
  /** درجة RRF — تُنسخ أيضًا في `score`. */
  fusedScore: number;
  contributions: FusionContribution[];
}

/** إسهام رتبة واحدة. */
export function rrfContribution(rank: number, k = FUSE_K): number {
  if (!Number.isFinite(k) || k <= 0) throw new RangeError(`RRF k يجب أن يكون موجبًا: ${k}`);
  if (!Number.isInteger(rank) || rank < 1) throw new RangeError(`رتبة غير صالحة: ${rank}`);
  return 1 / (k + rank);
}

const keyOf = (h: Hit) => `${h.source}\u0000${h.id}`;

/**
 * الترتيب: الدرجة المدموجة تنازليًّا ثم المفتاح (مصدر + معرّف) تصاعديًّا —
 * حتمي. حقول النتيجة من أول ظهور لها؛ `rank` يُعاد ترقيمه بعد الدمج.
 */
export function fuseRankedLists(
  lists: readonly RankedList[],
  opts: { k?: number; limit?: number } = {},
): FusedHit[] {
  const k = opts.k ?? FUSE_K;
  const merged = new Map<string, FusedHit>();
  for (const list of lists) {
    list.hits.forEach((hit, i) => {
      const rank = i + 1;
      const key = keyOf(hit);
      const c = rrfContribution(rank, k);
      const existing = merged.get(key);
      if (existing) {
        existing.fusedScore += c;
        existing.score = existing.fusedScore;
        existing.contributions.push({ arm: list.arm, rank, score: hit.score });
      } else {
        merged.set(key, {
          ...hit,
          provenance: { ...hit.provenance },
          score: c,
          fusedScore: c,
          contributions: [{ arm: list.arm, rank, score: hit.score }],
        });
      }
    });
  }
  const out = Array.from(merged.entries())
    .sort(([ka, a], [kb, b]) => b.fusedScore - a.fusedScore || (ka < kb ? -1 : ka > kb ? 1 : 0))
    .map(([, h], i) => ({ ...h, rank: i + 1 }));
  return opts.limit === undefined ? out : out.slice(0, Math.max(0, opts.limit));
}
