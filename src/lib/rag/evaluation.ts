/**
 * RAG retrieval evaluation — seed-verbatim anchors + pure rank metrics.
 *
 * 🛑 CONSTRAINT THAT SHAPED THIS FILE: authoring evaluation questions is
 * FORBIDDEN. The HCIS seed
 * (supabase/migrations/20260719200000_hcis_framework_tables_seed_anon.sql)
 * contains NO question field at all — hcis_directives is
 * (code, category, name_ar, name_en, scope_ar, issue_note_ar, sort_order).
 * Therefore ZERO questions are available from the seed, and a 30-question
 * golden set cannot exist without invention. See the session report.
 *
 * What IS available verbatim, and what this file uses: the 21 directive
 * NAMES (name_ar) with their real codes, copied character-for-character from
 * the seed. Each anchor's probe text IS the seed's own label — it is a
 * retrieval probe, NOT an authored question. Nothing here is composed.
 *
 * METRICS are pure and DB-free: hit@1, hit@5, MRR, coverage. Rank metrics fit
 * citation retrieval (right document cited, ranked high). Rejected: nDCG
 * (needs graded relevance judgments that do not exist yet) and LLM-as-judge
 * (nondeterministic and would consume the production Gemini path).
 *
 * NOTHING in this module has been measured. The rag_* tables are NOT applied
 * to khytdwgyrnztqabhfgbb, so no retrieval run exists — any score would be
 * fabricated. The runner (src/test/rag-live-eval.test.ts) stays skipped until
 * the operator applies the migrations and supplies a session JWT.
 */

/** One retrieval anchor, sourced verbatim from the hcis_directives seed. */
export interface GoldenAnchor {
  /** Real directive code (primary key in hcis_directives). */
  code: string;
  /** VERBATIM name_ar from the seed — used as the retrieval probe. */
  probeAr: string;
}

/**
 * The 21 seeded directives — the complete, non-invented anchor set.
 * 19 SEC + SEC-RC + SAF-GEN. Any expansion beyond 21 requires either new
 * seed rows or operator-approved question authoring; neither is assumed.
 */
export const GOLDEN_ANCHORS: readonly GoldenAnchor[] = [
  { code: "SEC-01", probeAr: "المتطلبات العامة للتوجيهات الأمنية" },
  { code: "SEC-02", probeAr: "الأسوار الأمنية" },
  { code: "SEC-03", probeAr: "البوابات الأمنية" },
  { code: "SEC-04", probeAr: "الإنارة الأمنية" },
  { code: "SEC-05", probeAr: "الأنظمة الأمنية المتكاملة" },
  { code: "SEC-06", probeAr: "الأجهزة الأمنية" },
  { code: "SEC-07", probeAr: "التغذية الكهربائية" },
  { code: "SEC-08", probeAr: "الاتصالات الأمنية وشبكات البيانات" },
  { code: "SEC-09", probeAr: "المباني الحاضنة للمعدات الأمنية" },
  { code: "SEC-10", probeAr: "عمليات السكك الحديدية داخل المنشآت الصناعية" },
  { code: "SEC-11", probeAr: "التحقق من الهوية الشخصية" },
  { code: "SEC-12", probeAr: "بطاقات التعريف" },
  { code: "SEC-13", probeAr: "الأمن السيبراني" },
  { code: "SEC-14", probeAr: "المنشآت ذات الواجهة البحرية" },
  { code: "SEC-15", probeAr: "إدارة المشاريع الأمنية" },
  { code: "SEC-16", probeAr: "العمليات الأمنية في المنشآت الصناعية" },
  { code: "SEC-17", probeAr: "خطوط الأنابيب وممراتها" },
  { code: "SEC-18", probeAr: "محطات التحويل الكهربائية" },
  { code: "SEC-19", probeAr: "أمن المدن الصناعية" },
  { code: "SEC-RC", probeAr: "المجمعات السكنية التابعة للمنشآت الصناعية" },
  { code: "SAF-GEN", probeAr: "توجيهات السلامة والحماية من الحريق — نظرة عامة" },
];

/** Honest inventory of what the seed can and cannot supply. */
export const SEED_INVENTORY = {
  /** Directive rows in hcis_directives (verified by reading the seed). */
  directives: 21,
  /** Seeded permit_types names (PTW demo seed) — labels, not documents. */
  permitTypes: 4,
  /** Seeded approval stages. */
  approvalStages: 7,
  /** Seeded sectors. */
  sectors: 13,
  /** Questions present anywhere in the seed. There is no question column. */
  questions: 0,
} as const;

/** One retrieval run to score: ranked citation codes for one anchor. */
export interface RetrievalRun {
  /** Must match a GOLDEN_ANCHORS code. */
  code: string;
  /** Citation codes in rank order (null = chunk had no document code). */
  rankedCodes: readonly (string | null)[];
  insufficient: boolean;
}

export interface RetrievalMetrics {
  total: number;
  scored: number;
  hitAt1: number;
  hitAt5: number;
  mrr: number;
  coverage: number;
  insufficientRate: number;
  misses: string[];
}

/** First 1-based rank where the expected code appears; 0 = no hit. */
export function firstHitRank(code: string, ranked: readonly (string | null)[]): number {
  for (let i = 0; i < ranked.length; i += 1) {
    if (ranked[i] === code) return i + 1;
  }
  return 0;
}

/**
 * Pure aggregation over runs. Runs whose code is not a known anchor are
 * ignored and lower `scored` — the caller sees the gap via total vs scored.
 * This computes nothing on its own: without real runs it returns zeros.
 */
export function evaluateRetrieval(runs: readonly RetrievalRun[]): RetrievalMetrics {
  const known = new Set(GOLDEN_ANCHORS.map((a) => a.code));
  let scored = 0;
  let hit1 = 0;
  let hit5 = 0;
  let rrSum = 0;
  let covered = 0;
  let insufficient = 0;
  const misses: string[] = [];
  for (const run of runs) {
    if (!known.has(run.code)) continue;
    scored += 1;
    if (run.insufficient) insufficient += 1;
    const rank = firstHitRank(run.code, run.rankedCodes);
    if (rank === 1) hit1 += 1;
    if (rank >= 1 && rank <= 5) hit5 += 1;
    if (rank >= 1) {
      covered += 1;
      rrSum += 1 / rank;
    } else {
      misses.push(run.code);
    }
  }
  const denom = scored || 1;
  return {
    total: runs.length,
    scored,
    hitAt1: hit1 / denom,
    hitAt5: hit5 / denom,
    mrr: rrSum / denom,
    coverage: covered / denom,
    insufficientRate: insufficient / denom,
    misses,
  };
}
