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
 * to jhutlofapjfjjeajawie, so no retrieval run exists — any score would be
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
 * The 41 seeded anchors — complete and non-invented.
 *
 * Growth decision (owner, ٢٠٢٦/٠٨/٠٥): the gate needs >= 30 measured
 * questions, but the anchor stood at 21 directives, so 21 < 30 kept it
 * STRUCTURALLY shut. The gap is closed by SEEDED CORPUS GROWTH, never by
 * authoring questions: migration 20260805120000_rag_corpus_growth.sql
 * ingests rows that already exist in the base — the 21 directives, the 7
 * approval-cycle stages, the 13 regulated sectors — and every probe below
 * is the VERBATIM name of one of those rows.
 *   21 directives + 7 stages + 13 sectors = 41 >= 30.
 * Any further expansion still requires new seed rows, never invention.
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

  // دورة الاعتماد السبع — من بذرة hcis_approval_stages (name_ar حرفيًّا).
  { code: "STAGE-01", probeAr: "تصنيف المنشأة وتقييم الثغرات الأمنية" },
  { code: "STAGE-02", probeAr: "التصميم المفاهيمي 10%" },
  { code: "STAGE-03", probeAr: "التصميم الهندسي الأولي 30%" },
  { code: "STAGE-04", probeAr: "التصميم التفصيلي 60%" },
  { code: "STAGE-05", probeAr: "التصميم التفصيلي 90%" },
  { code: "STAGE-06", probeAr: "الإصدار للتنفيذ 100%" },
  { code: "STAGE-07", probeAr: "اختبارات القبول" },

  // القطاعات الخاضعة للتنظيم — من بذرة hcis_sectors (name_ar حرفيًّا).
  { code: "SECTOR-01", probeAr: "الكهرباء — التوليد والنقل والتوزيع" },
  { code: "SECTOR-02", probeAr: "البترول" },
  { code: "SECTOR-03", probeAr: "البتروكيماويات" },
  { code: "SECTOR-04", probeAr: "الغاز" },
  { code: "SECTOR-05", probeAr: "المياه والتحلية" },
  { code: "SECTOR-06", probeAr: "الاتصالات" },
  { code: "SECTOR-07", probeAr: "التعدين" },
  { code: "SECTOR-08", probeAr: "الصناعات الكيميائية" },
  { code: "SECTOR-09", probeAr: "المتفجرات المدنية" },
  { code: "SECTOR-10", probeAr: "الصناعات المعدنية" },
  { code: "SECTOR-11", probeAr: "الموانئ والواجهات البحرية الصناعية" },
  { code: "SECTOR-12", probeAr: "السكك الحديدية" },
  { code: "SECTOR-13", probeAr: "الخدمات الصناعية والمدن الصناعية" },
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

/**
 * Scores are `number | null`. NULL means NOTHING WAS SCORED — it is not the
 * same fact as "scored, and got zero", and collapsing the two is how an
 * unmeasured system starts reporting a 0% hit rate as though it had been
 * tested. `public.rag_eval_runs` enforces the identical distinction with a
 * CHECK constraint, and `decideAutoEnable` refuses both — but for different
 * stated reasons.
 */
export interface RetrievalMetrics {
  total: number;
  scored: number;
  hitAt1: number | null;
  hitAt5: number | null;
  mrr: number | null;
  coverage: number | null;
  insufficientRate: number | null;
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
  if (scored === 0) {
    // Deliberately NOT `x / 1`. Dividing by a phantom denominator would turn
    // "no anchor was ever run" into a clean set of zeros that reads exactly
    // like a measured, catastrophic result — and today, with the migrations
    // staged and the database unapplied, this is the branch that runs.
    return {
      total: runs.length,
      scored: 0,
      hitAt1: null,
      hitAt5: null,
      mrr: null,
      coverage: null,
      insufficientRate: null,
      misses,
    };
  }
  return {
    total: runs.length,
    scored,
    hitAt1: hit1 / scored,
    hitAt5: hit5 / scored,
    mrr: rrSum / scored,
    coverage: covered / scored,
    insufficientRate: insufficient / scored,
    misses,
  };
}

/**
 * Shape a scored run for `public.rag_eval_runs`. The bridge exists so the
 * ledger can never be written by hand-assembling fields: `measuredQuestions`
 * comes from `scored` (anchors actually run), never from the size of the
 * golden set, and the scores travel as NULL when nothing was scored — which
 * is precisely what the table's CHECK constraint requires.
 */
export interface EvalRunRow {
  anchorsAvailable: number;
  measuredQuestions: number;
  hitAt5: number | null;
  citationAccuracy: number | null;
  corpusVerified: boolean;
}

export function toEvalRunRow(
  metrics: RetrievalMetrics,
  opts: { corpusVerified: boolean },
): EvalRunRow {
  return {
    anchorsAvailable: GOLDEN_ANCHORS.length,
    measuredQuestions: metrics.scored,
    hitAt5: metrics.hitAt5,
    // Citation accuracy is hit@1 against the anchor's own document code: the
    // top citation is either the right directive or it is not.
    citationAccuracy: metrics.hitAt1,
    corpusVerified: opts.corpusVerified,
  };
}
