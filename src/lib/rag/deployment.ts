/**
 * Self-deployment governance (constitution §2) and rollback (§3).
 *
 * Pure decision logic. Nothing here performs a deployment, calls a provider
 * API, or flips a flag — it decides WHETHER those are permitted and records
 * WHY. Keeping the judgement separate from the act is what makes it testable
 * and what makes the deployment log trustworthy: the log records the same
 * decision object the gate produced, not a retrospective description of it.
 *
 * §2 — three questions, in order:
 *   ① WHERE may this change go?            → selectDestination()
 *   ② may the budget afford it?            → checkBudget()
 *   ③ did it survive 90 seconds?           → evaluatePostDeployHealth()
 *
 * §3 — two rollbacks that must never be confused:
 *   • DEPLOYMENT rollback — the post-deploy health check failed. Revert the
 *     artifact. Says nothing about retrieval quality.
 *   • FLAG rollback — measurement regressed. Set rag_enabled = false. The
 *     deployed artifact is fine and STAYS.
 *   Conflating them is the expensive mistake: reverting a healthy deployment
 *   because a score dipped throws away unrelated work, and flipping the flag
 *   because a container failed to boot hides a real outage behind a
 *   feature-flag change nobody will think to look at.
 */

// ── §2① Destination ────────────────────────────────────────────────────────

export type Destination = "preview" | "production" | "none";

export interface ChangeShape {
  /** Touches supabase/migrations/** — schema change. */
  touchesMigrations: boolean;
  /** Touches supabase/functions/** — server surface. */
  touchesEdgeFunctions: boolean;
  /** Would change rag_enabled / any feature flag default. */
  changesFeatureFlag: boolean;
  /** Touches the SADEED / Gemini answer path. FORBIDDEN — never deployable. */
  touchesAnswerPath: boolean;
  /** tsc + lint + tests + build all green. */
  qualityGateGreen: boolean;
}

export interface DestinationDecision {
  destination: Destination;
  reasons: string[];
}

/**
 * Pick the destination. Fail-closed: anything unproven, unclear or forbidden
 * lands on `none`, and only a fully green, low-blast-radius change reaches
 * production directly.
 */
export function selectDestination(change: ChangeShape): DestinationDecision {
  const reasons: string[] = [];

  // The one absolute. No destination, at any budget, under any approval.
  if (change.touchesAnswerPath) {
    return { destination: "none", reasons: ["touches_answer_path_forbidden"] };
  }
  if (!change.qualityGateGreen) {
    return { destination: "none", reasons: ["quality_gate_not_green"] };
  }

  // Blast radius decides preview-vs-production. A schema change or a server
  // surface cannot be reverted by rolling back a static artifact, so it is
  // never allowed to skip the preview step.
  if (change.touchesMigrations) reasons.push("schema_change_requires_preview");
  if (change.touchesEdgeFunctions) reasons.push("server_surface_requires_preview");
  if (change.changesFeatureFlag) reasons.push("flag_change_requires_preview");

  if (reasons.length > 0) return { destination: "preview", reasons };
  return { destination: "production", reasons: ["low_blast_radius"] };
}

// ── §2② Budget ─────────────────────────────────────────────────────────────

/**
 * The reserve is the point of the budget. Ordinary work may spend down to it
 * and no further, so that when something breaks there are always two
 * deployments left: one to ship the fix, one in case the fix is wrong.
 */
export const EMERGENCY_RESERVE = 2;

/** Why a deployment is being spent. Only these two may touch the reserve. */
export type DeployPurpose = "routine" | "rollback" | "hotfix";

export interface BudgetState {
  /** Total deployments allotted for the period. */
  total: number;
  /** Deployments already spent. */
  spent: number;
}

export interface BudgetDecision {
  allowed: boolean;
  remaining: number;
  /** Deployments available to ROUTINE work — excludes the reserve. */
  routineRemaining: number;
  reasons: string[];
}

export function checkBudget(state: BudgetState, purpose: DeployPurpose): BudgetDecision {
  const remaining = Math.max(0, state.total - state.spent);
  const routineRemaining = Math.max(0, remaining - EMERGENCY_RESERVE);
  const reasons: string[] = [];

  if (remaining === 0) {
    return {
      allowed: false,
      remaining,
      routineRemaining,
      reasons: ["budget_exhausted"],
    };
  }

  if (purpose === "routine" && routineRemaining === 0) {
    // The refusal that gives the reserve its meaning. Without it the reserve
    // is a number in a document rather than a constraint.
    return {
      allowed: false,
      remaining,
      routineRemaining,
      reasons: ["would_consume_emergency_reserve"],
    };
  }

  if (purpose !== "routine" && routineRemaining === 0) reasons.push("spending_from_reserve");
  return { allowed: true, remaining, routineRemaining, reasons };
}

// ── §2③ Post-deploy health check ───────────────────────────────────────────

/** The constitutional window: 90 seconds after the deployment completes. */
export const POST_DEPLOY_WINDOW_MS = 90_000;

export interface HealthSample {
  /** Milliseconds since the deployment completed. */
  atMs: number;
  ok: boolean;
  /** HTTP status or synthetic code; for the log, not the decision. */
  detail?: string;
}

export type PostDeployVerdict = "healthy" | "unhealthy" | "inconclusive";

export interface PostDeployResult {
  verdict: PostDeployVerdict;
  samplesInWindow: number;
  failures: number;
  reasons: string[];
}

/**
 * Judge the 90-second window.
 *
 * `inconclusive` exists deliberately and is NOT treated as healthy: zero
 * samples means the checker never ran, which is itself a failure to verify.
 * Only an affirmative all-clear counts as healthy, and any failure in the
 * window is unhealthy — a service that flaps within 90 seconds of deploying
 * has not passed.
 */
export function evaluatePostDeployHealth(samples: readonly HealthSample[]): PostDeployResult {
  const inWindow = samples.filter((s) => s.atMs >= 0 && s.atMs <= POST_DEPLOY_WINDOW_MS);
  const failures = inWindow.filter((s) => !s.ok).length;

  if (inWindow.length === 0) {
    return {
      verdict: "inconclusive",
      samplesInWindow: 0,
      failures: 0,
      reasons: ["no_samples_in_window"],
    };
  }
  if (failures > 0) {
    return {
      verdict: "unhealthy",
      samplesInWindow: inWindow.length,
      failures,
      reasons: [`failed_${failures}_of_${inWindow.length}`],
    };
  }
  return {
    verdict: "healthy",
    samplesInWindow: inWindow.length,
    failures: 0,
    reasons: ["all_samples_ok"],
  };
}

// ── §3 Rollback — two kinds, never interchangeable ────────────────────────

export type RollbackKind = "deployment" | "flag" | "none";

export interface RollbackInput {
  /** Result of the 90-second window. */
  postDeploy: PostDeployVerdict;
  /** Latest measured hit@5, or null when never measured. */
  hitAt5: number | null;
  /** The hit@5 the flag was enabled on, or null if the flag is off. */
  baselineHitAt5: number | null;
  /** Whether rag_enabled is currently true. */
  flagEnabled: boolean;
}

export interface RollbackDecision {
  kind: RollbackKind;
  reasons: string[];
}

/** A drop larger than this against the enabling baseline is a regression. */
export const REGRESSION_TOLERANCE = 0.05;

/**
 * Decide which rollback — if either — the situation calls for.
 *
 * The health check is evaluated FIRST and returns immediately: when the
 * artifact is unhealthy, quality numbers from it are not evidence about
 * retrieval, they are noise from a broken deploy. Reading them would produce
 * a flag rollback that masks an outage.
 */
export function decideRollback(input: RollbackInput): RollbackDecision {
  // ① Artifact health → DEPLOYMENT rollback. Never a flag change.
  if (input.postDeploy === "unhealthy") {
    return { kind: "deployment", reasons: ["post_deploy_health_failed"] };
  }
  if (input.postDeploy === "inconclusive") {
    // Unverified is not verified. Roll back rather than assume.
    return { kind: "deployment", reasons: ["post_deploy_unverified"] };
  }

  // ② Measurement regression → FLAG rollback. The artifact stays deployed.
  if (!input.flagEnabled) return { kind: "none", reasons: ["flag_already_off"] };
  if (input.baselineHitAt5 === null) return { kind: "none", reasons: ["no_baseline"] };
  if (input.hitAt5 === null) {
    // The flag is on and measurement has stopped: we can no longer show the
    // quality that justified enabling it, so it does not stay on.
    return { kind: "flag", reasons: ["measurement_lost_while_enabled"] };
  }
  if (input.baselineHitAt5 - input.hitAt5 > REGRESSION_TOLERANCE) {
    return {
      kind: "flag",
      reasons: [
        `hit_at_5_regressed_${input.baselineHitAt5.toFixed(2)}_to_${input.hitAt5.toFixed(2)}`,
      ],
    };
  }
  return { kind: "none", reasons: ["within_tolerance"] };
}

// ── §3 Deployment log ──────────────────────────────────────────────────────

export interface DeploymentLogEntry {
  /** ISO-8601. Passed in, never read from the clock here — keeps this pure. */
  at: string;
  destination: Destination;
  /** Commit hash of the deployed artifact. */
  hash: string;
  purpose: DeployPurpose;
  reason: string;
  health: PostDeployVerdict | "not_run";
  /** Deployments left AFTER this one, reserve included. */
  budgetRemaining: number;
  rollback?: RollbackKind;
}

/**
 * One line per deployment, in the order the constitution names the fields:
 * وقت · وجهة · بصمة · سبب · نتيجة الصحة · المتبقي من الميزانية.
 * Short hash only — the full hash is in git, and a log line is for reading.
 */
export function formatDeploymentLogEntry(e: DeploymentLogEntry): string {
  const parts = [
    e.at,
    e.destination,
    e.hash.slice(0, 7),
    `${e.purpose}:${e.reason}`,
    `health=${e.health}`,
    `budget=${e.budgetRemaining}`,
  ];
  if (e.rollback && e.rollback !== "none") parts.push(`rollback=${e.rollback}`);
  return parts.join(" · ");
}
