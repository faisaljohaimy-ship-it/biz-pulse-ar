/**
 * RAG operational health — the read side of public.rag_health().
 *
 * ONE RULE GOVERNS THIS FILE: a metric that was never measured renders as
 * «لم يُقَس» and is never substituted with a number. Not 0, not a baseline,
 * not "—" with a green tick beside it. A dashboard that shows 0 ms latency
 * and a 0% failure rate for a system that has never served a request is worse
 * than a blank dashboard, because it reads as health.
 *
 * The database enforces the same rule (every unmeasured column returns NULL
 * rather than a zero-filled aggregate), so `null` arriving here is meaningful
 * data, not a missing field to be defaulted away.
 */

/** Row shape of public.rag_health(_days). NULL ⇒ never measured. */
export interface RagHealthRow {
  windowDays: number;
  retrievalP50Ms: number | null;
  retrievalP95Ms: number | null;
  retrievals: number;
  insufficientRate: number | null;
  gapsOpen: number;
  gapsResolved: number;
  gapCoverage: number | null;
  chunksTotal: number;
  chunksStale: number;
  chunksAdded: number;
  candidatesTotal: number;
  candidatesVerified: number;
  lastEvalAt: string | null;
  measuredQuestions: number | null;
  hitAt5: number | null;
  citationAccuracy: number | null;
  corpusVerified: boolean;
}

/**
 * Operating limits. These are targets for the retrieval layer only; they say
 * nothing about SADEED's own latency, which this layer does not touch.
 */
export const HEALTH_LIMITS = {
  /** Above this p95, retrieval is too slow to sit in front of an answer. */
  p95WarnMs: 800,
  p95CriticalMs: 2000,
  /** Sustained "no evidence found" means the corpus, not the query, is wrong. */
  insufficientWarnRate: 0.2,
  insufficientCriticalRate: 0.5,
  /** A stale-vector share this high means the re-embed job is not draining. */
  staleWarnShare: 0.1,
  staleCriticalShare: 0.3,
} as const;

export type HealthSeverity = "ok" | "warn" | "critical";
/** `unmeasured` is a FIRST-CLASS status, not a variant of ok. */
export type HealthStatus = "unmeasured" | "ok" | "warn" | "critical";

export interface HealthFinding {
  code: string;
  severity: HealthSeverity;
  /** Arabic, user-facing. Never contains an unmeasured number. */
  messageAr: string;
}

export interface HealthAssessment {
  status: HealthStatus;
  findings: HealthFinding[];
  /** True when nothing in the window was measured at all. */
  unmeasured: boolean;
}

const worst = (a: HealthSeverity, b: HealthSeverity): HealthSeverity =>
  a === "critical" || b === "critical" ? "critical" : a === "warn" || b === "warn" ? "warn" : "ok";

/**
 * Assess health. Returns `unmeasured` — not `ok` — when the window contains
 * no retrievals and no evaluation, because those are the same shape as a
 * perfectly healthy idle system and must not be reported as one.
 */
export function assessHealth(row: RagHealthRow): HealthAssessment {
  const findings: HealthFinding[] = [];

  // ── Latency ──
  if (row.retrievals > 0 && row.retrievalP95Ms !== null) {
    if (row.retrievalP95Ms >= HEALTH_LIMITS.p95CriticalMs) {
      findings.push({
        code: "latency_critical",
        severity: "critical",
        messageAr: `زمن الاسترجاع (p95) ${row.retrievalP95Ms} مللي ثانية — تجاوز الحد الحرج.`,
      });
    } else if (row.retrievalP95Ms >= HEALTH_LIMITS.p95WarnMs) {
      findings.push({
        code: "latency_warn",
        severity: "warn",
        messageAr: `زمن الاسترجاع (p95) ${row.retrievalP95Ms} مللي ثانية — فوق الحد المستهدف.`,
      });
    }
  }

  // ── Evidence sufficiency ──
  if (row.retrievals > 0 && row.insufficientRate !== null) {
    const pct = Math.round(row.insufficientRate * 100);
    if (row.insufficientRate >= HEALTH_LIMITS.insufficientCriticalRate) {
      findings.push({
        code: "insufficient_evidence_critical",
        severity: "critical",
        messageAr: `${pct}٪ من عمليات الاسترجاع لم تجد سنداً كافياً — المتن ناقص، لا الأسئلة.`,
      });
    } else if (row.insufficientRate >= HEALTH_LIMITS.insufficientWarnRate) {
      findings.push({
        code: "insufficient_evidence_warn",
        severity: "warn",
        messageAr: `${pct}٪ من عمليات الاسترجاع بلا سند كافٍ — راجع تقرير الفجوات.`,
      });
    }
  }

  // ── Stale vectors ──
  if (row.chunksTotal > 0) {
    const share = row.chunksStale / row.chunksTotal;
    if (share >= HEALTH_LIMITS.staleCriticalShare) {
      findings.push({
        code: "stale_vectors_critical",
        severity: "critical",
        messageAr: `${row.chunksStale} من ${row.chunksTotal} مقطعاً متجهُها متأخر عن نصه — مهمة إعادة التضمين متوقفة.`,
      });
    } else if (share >= HEALTH_LIMITS.staleWarnShare) {
      findings.push({
        code: "stale_vectors_warn",
        severity: "warn",
        messageAr: `${row.chunksStale} من ${row.chunksTotal} مقطعاً بحاجة إلى إعادة تضمين.`,
      });
    }
  }

  // ── Corpus verification ──
  if (row.candidatesTotal > 0 && row.candidatesVerified === 0) {
    findings.push({
      code: "no_verified_candidates",
      severity: "warn",
      messageAr: `${row.candidatesTotal} مرشّحاً مخزّناً ولا واحد موثّق — الحاجز يعمل، والمراجعة متوقفة.`,
    });
  }

  // ── Evaluation ──
  if (row.lastEvalAt === null) {
    findings.push({
      code: "never_evaluated",
      severity: "warn",
      messageAr: "لم يُشغَّل أي تقييم بعد — لا توجد أرقام استدعاء أو دقة استشهاد.",
    });
  }

  const unmeasured = row.retrievals === 0 && row.lastEvalAt === null && row.chunksTotal === 0;
  if (unmeasured) {
    return {
      status: "unmeasured",
      unmeasured: true,
      findings: [
        {
          code: "not_running",
          severity: "warn",
          messageAr: "لم يُشغَّل — لا متن ولا استرجاع ولا تقييم في هذه النافذة.",
        },
      ],
    };
  }

  const severity = findings.reduce<HealthSeverity>((acc, f) => worst(acc, f.severity), "ok");
  return { status: severity, unmeasured: false, findings };
}

/**
 * Render a metric for display. The single choke point that makes the honesty
 * rule mechanical: callers cannot accidentally print a default, because the
 * null branch lives here rather than at every call site.
 */
export function formatMetricAr(
  value: number | null,
  opts: { unit?: string; percent?: boolean; digits?: number } = {},
): string {
  if (value === null || Number.isNaN(value)) return "لم يُقَس";
  if (opts.percent) return `${Math.round(value * 100)}٪`;
  const n = opts.digits === undefined ? value : Number(value.toFixed(opts.digits));
  return opts.unit ? `${n} ${opts.unit}` : String(n);
}

/**
 * Summarise the evaluation for display. Returns the literal declaration the
 * constitution requires whenever the database has not actually been measured
 * — it is not a fallback string, it is the accurate statement.
 */
export function describeEvaluationAr(row: RagHealthRow): string {
  if (row.lastEvalAt === null || row.measuredQuestions === null || row.measuredQuestions === 0) {
    return "لم يُشغَّل — القاعدة غير مطبَّقة";
  }
  return [
    `${row.measuredQuestions} سؤالاً مقيساً`,
    `استدعاء@5 ${formatMetricAr(row.hitAt5, { percent: true })}`,
    `دقة الاستشهاد ${formatMetricAr(row.citationAccuracy, { percent: true })}`,
    row.corpusVerified ? "على متن موثّق" : "على متن غير موثّق",
  ].join(" · ");
}
