/**
 * RAG retrieval evaluation — golden set + pure rank metrics.
 *
 * GOLDEN SET: one Arabic query per real SEC directive (codes/titles taken
 * verbatim from the hcis_directives seed — nothing invented), plus three PTW
 * queries. Several queries deliberately carry tashkeel / hamza / ta-marbuta
 * variance to exercise the normalization path end-to-end. This targets the
 * declared risk «استرجاع ضعيف للرموز»: every SEC code must be retrievable
 * from a natural Arabic question about its topic.
 *
 * METRICS (pure, unit-tested): hit@1, hit@5, MRR, coverage, insufficient
 * rate. Rank metrics fit citation retrieval (the right document cited, high).
 * Rejected: nDCG (needs graded relevance judgments we don't have yet) and
 * LLM-as-judge (nondeterministic, costs quota on the production Gemini path).
 *
 * The runner that feeds real responses into these metrics lives in
 * src/test/rag-live-eval.test.ts and only runs when the operator provides
 * RAG_EVAL_JWT — this module itself never touches the network.
 */

export interface GoldenExpectation {
  /** Exact citation codes that count as a hit (SEC directives). */
  codes?: readonly string[];
  /** OR a code prefix (PTW docs — codes are operator-assigned at ingest). */
  prefix?: string;
}

export interface GoldenQuery {
  id: string;
  queryAr: string;
  expect: GoldenExpectation;
}

/** 19 SEC (real seed titles) + 3 PTW = 22 queries. */
export const GOLDEN_SET: readonly GoldenQuery[] = [
  {
    id: "sec-01",
    queryAr: "ما المتطلبات العامة للتوجيهات الأمنية وتصنيف المنشآت؟",
    expect: { codes: ["SEC-01"] },
  },
  { id: "sec-02", queryAr: "اشتراطات الأسوار الأمنيّة حول المنشأة", expect: { codes: ["SEC-02"] } },
  { id: "sec-03", queryAr: "ما ضوابط البوابات الأمنية؟", expect: { codes: ["SEC-03"] } },
  { id: "sec-04", queryAr: "متطلبات الإنارة الأمنية في المواقع", expect: { codes: ["SEC-04"] } },
  {
    id: "sec-05",
    queryAr: "ما هي الأنظمة الأمنيّة المتكاملة المطلوبة؟",
    expect: { codes: ["SEC-05"] },
  },
  { id: "sec-06", queryAr: "اشتراطات الأجهزة الأمنية المعتمدة", expect: { codes: ["SEC-06"] } },
  {
    id: "sec-07",
    queryAr: "متطلبات التغذية الكهربائية للأنظمة الأمنية",
    expect: { codes: ["SEC-07"] },
  },
  {
    id: "sec-08",
    queryAr: "ضوابط الاتصالات الأمنية وشبكات البيانات",
    expect: { codes: ["SEC-08"] },
  },
  {
    id: "sec-09",
    queryAr: "اشتراطات المباني الحاضنة للمعدات الأمنية",
    expect: { codes: ["SEC-09"] },
  },
  {
    id: "sec-10",
    queryAr: "عمليات السكك الحديدية داخل المنشآت الصناعية",
    expect: { codes: ["SEC-10"] },
  },
  {
    id: "sec-11",
    queryAr: "كيف يتم التحقق من الهوية الشخصية للداخلين؟",
    expect: { codes: ["SEC-11"] },
  },
  { id: "sec-12", queryAr: "ما ضوابط بطاقات التعريف؟", expect: { codes: ["SEC-12"] } },
  {
    id: "sec-13",
    queryAr: "متطلبات الأمن السيبراني للأنظمة الصناعية",
    expect: { codes: ["SEC-13"] },
  },
  { id: "sec-14", queryAr: "اشتراطات المنشآت ذات الواجهة البحرية", expect: { codes: ["SEC-14"] } },
  { id: "sec-15", queryAr: "ضوابط إدارة المشاريع الأمنية", expect: { codes: ["SEC-15"] } },
  {
    id: "sec-16",
    queryAr: "العمليات الأمنية في المنشآت الصناعية ومتطلباتها",
    expect: { codes: ["SEC-16"] },
  },
  { id: "sec-17", queryAr: "حماية خطوط الأنابيب وممرّاتها", expect: { codes: ["SEC-17"] } },
  {
    id: "sec-18",
    queryAr: "ما نطاق توجيه محطات التحويل الكهربائية؟",
    expect: { codes: ["SEC-18"] },
  },
  { id: "sec-19", queryAr: "متطلبات أمن المدن الصناعية", expect: { codes: ["SEC-19"] } },
  { id: "ptw-chain", queryAr: "ما سلسلة اعتماد تصريح العمل؟", expect: { prefix: "PTW" } },
  { id: "ptw-types", queryAr: "ما أنواع تصاريح العمل المعتمدة؟", expect: { prefix: "PTW" } },
  { id: "ptw-suspend", queryAr: "متى يُعلَّق تصريح العمل طارئًا؟", expect: { prefix: "PTW" } },
];

/** One retrieval run to score: the ranked citation codes for a golden query. */
export interface RetrievalRun {
  queryId: string;
  /** Citation codes in rank order (null codes filtered by the caller). */
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

function matches(exp: GoldenExpectation, code: string | null): boolean {
  if (code == null) return false;
  if (exp.codes && exp.codes.includes(code)) return true;
  if (exp.prefix && code.startsWith(exp.prefix)) return true;
  return false;
}

/** First 1-based rank at which the expectation is satisfied; 0 = no hit. */
export function firstHitRank(exp: GoldenExpectation, ranked: readonly (string | null)[]): number {
  for (let i = 0; i < ranked.length; i += 1) {
    if (matches(exp, ranked[i])) return i + 1;
  }
  return 0;
}

/** Pure aggregation. Runs referencing unknown query ids are ignored (and
 *  reduce `scored`) — the caller sees the discrepancy via total vs scored. */
export function evaluateRetrieval(runs: readonly RetrievalRun[]): RetrievalMetrics {
  const byId = new Map(GOLDEN_SET.map((g) => [g.id, g]));
  let scored = 0;
  let hit1 = 0;
  let hit5 = 0;
  let rrSum = 0;
  let covered = 0;
  let insufficient = 0;
  const misses: string[] = [];
  for (const run of runs) {
    const golden = byId.get(run.queryId);
    if (!golden) continue;
    scored += 1;
    if (run.insufficient) insufficient += 1;
    const rank = firstHitRank(golden.expect, run.rankedCodes);
    if (rank === 1) hit1 += 1;
    if (rank >= 1 && rank <= 5) hit5 += 1;
    if (rank >= 1) {
      covered += 1;
      rrSum += 1 / rank;
    } else {
      misses.push(golden.id);
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
