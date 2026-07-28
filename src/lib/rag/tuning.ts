/**
 * Self-tuning — RRF weights and chunk size derived from recorded feedback.
 *
 * SCOPE, stated plainly: this tunes RETRIEVAL PARAMETERS only. It never
 * retrains, fine-tunes or alters the weights of any model — that is forbidden
 * and nothing here touches a model.
 *
 * The tuner is pure and bounded. It reads feedback rows (which paths produced
 * a result, and whether the result was helpful) and proposes weights. Bounds
 * exist because an unbounded feedback loop is itself a poisoning vector: a
 * burst of clicks on one path could collapse retrieval onto that path and
 * silently blind the system to the other two.
 */

export interface FeedbackRow {
  /** How many of the three paths produced this chunk (1..3). */
  matchedPaths: number;
  /** Rank the user acted on (1-based), if known. */
  rank: number | null;
  helpful: boolean;
}

/** The shipped defaults — the baseline every proposal is anchored to. */
export const BASELINE_WEIGHTS = { vector: 1.0, fts: 1.0, trgm: 0.5 } as const;
/** RRF k. Fixed: rank-based fusion is what makes the scales comparable. */
export const RRF_K = 60;
/** No weight may leave this band, however lopsided the feedback. */
export const WEIGHT_MIN = 0.25;
export const WEIGHT_MAX = 2.0;
/** Below this, feedback is noise — keep the baseline. Rejected: tuning from
 *  the first few rows, which would swing wildly on a handful of clicks. */
export const MIN_FEEDBACK_ROWS = 30;

export interface WeightProposal {
  weights: { vector: number; fts: number; trgm: number };
  /** True when the sample was too small and the baseline was kept. */
  keptBaseline: boolean;
  sampleSize: number;
  helpfulRate: number;
}

const clamp = (v: number) => Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Propose RRF weights from feedback.
 *
 * Signal: results confirmed helpful while corroborated by MANY paths argue
 * the fusion is working; helpful results that came from FEW paths argue that
 * the lexical/fuzzy side is carrying weight the vector path is missing. We
 * nudge — never leap — and always within the band.
 */
export function proposeWeights(rows: readonly FeedbackRow[]): WeightProposal {
  const sampleSize = rows.length;
  const helpful = rows.filter((r) => r.helpful);
  const helpfulRate = sampleSize === 0 ? 0 : helpful.length / sampleSize;

  if (sampleSize < MIN_FEEDBACK_ROWS) {
    return { weights: { ...BASELINE_WEIGHTS }, keptBaseline: true, sampleSize, helpfulRate };
  }

  // Mean corroboration among helpful results, normalised to [0,1] over 1..3.
  const meanPaths =
    helpful.length === 0 ? 1 : helpful.reduce((s, r) => s + r.matchedPaths, 0) / helpful.length;
  const corroboration = Math.min(1, Math.max(0, (meanPaths - 1) / 2));

  // Low corroboration ⇒ single-path (usually lexical) hits are doing the work
  // ⇒ lift fts/trgm slightly. High corroboration ⇒ leave the balance alone.
  const lexicalLift = (1 - corroboration) * 0.4; // ≤ +0.4, a nudge not a leap
  return {
    weights: {
      vector: round2(clamp(BASELINE_WEIGHTS.vector)),
      fts: round2(clamp(BASELINE_WEIGHTS.fts + lexicalLift)),
      trgm: round2(clamp(BASELINE_WEIGHTS.trgm + lexicalLift / 2)),
    },
    keptBaseline: false,
    sampleSize,
    helpfulRate,
  };
}

// ── Auto-enable gate ──────────────────────────────────────────────────────

/** The two thresholds the constitution sets for flipping rag_enabled on. */
export const AUTO_ENABLE = {
  minHitAt5: 0.85,
  minCitationAccuracy: 0.95,
  minMeasuredQuestions: 30,
} as const;

export interface AutoEnableInput {
  /** NULL until measured — a score of 0 is a result, absence is not. */
  hitAt5: number | null;
  citationAccuracy: number | null;
  /** Questions ACTUALLY measured against a live, ingested corpus. */
  measuredQuestions: number;
  /** False whenever the corpus behind the measurement isn't verified. */
  corpusVerified: boolean;
}

export interface AutoEnableDecision {
  enable: boolean;
  blockers: string[];
}

/**
 * Decide whether rag_enabled may flip to true.
 *
 * `null` means NO EVALUATION HAS EVER RUN — which is the project's actual
 * state while the migrations are staged and unapplied. That case yields
 * exactly one blocker, `not_measured`, and no threshold blockers: NULL scores
 * would trip those too, and a gate whose SQL and TypeScript halves disagree
 * about WHY it refused is a gate nobody can reason about. This mirrors
 * public.rag_should_enable() blocker-for-blocker; the harness at
 * supabase/preflight/rag_operations_check.sql asserts the SQL side, and
 * tuning.test.ts asserts this side against the same expected sets.
 */
export function decideAutoEnable(input: AutoEnableInput | null): AutoEnableDecision {
  if (input === null) return { enable: false, blockers: ["not_measured"] };

  const blockers: string[] = [];
  if (!input.corpusVerified) blockers.push("corpus_not_verified");
  if (input.measuredQuestions < AUTO_ENABLE.minMeasuredQuestions) {
    blockers.push("measured_questions_below_30");
  }
  if (input.hitAt5 === null || input.hitAt5 < AUTO_ENABLE.minHitAt5) {
    blockers.push("hit_at_5_below_threshold");
  }
  if (input.citationAccuracy === null || input.citationAccuracy < AUTO_ENABLE.minCitationAccuracy) {
    blockers.push("citation_accuracy_below_threshold");
  }
  return { enable: blockers.length === 0, blockers };
}
