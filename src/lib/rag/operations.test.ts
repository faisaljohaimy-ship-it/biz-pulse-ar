/**
 * Phase ⑤ + constitution §2/§3.
 *
 * The tests that matter here are the ones that fail when the system starts
 * flattering itself: an unmeasured metric rendered as a number, an emergency
 * reserve that can be spent, a health check that passes because nobody ran
 * it, or a flag rollback used to paper over a broken deployment.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assessHealth,
  formatMetricAr,
  describeEvaluationAr,
  HEALTH_LIMITS,
  type RagHealthRow,
} from "./health";
import {
  selectDestination,
  checkBudget,
  evaluatePostDeployHealth,
  decideRollback,
  formatDeploymentLogEntry,
  EMERGENCY_RESERVE,
  POST_DEPLOY_WINDOW_MS,
  REGRESSION_TOLERANCE,
} from "./deployment";

const EMPTY: RagHealthRow = {
  windowDays: 7,
  retrievalP50Ms: null,
  retrievalP95Ms: null,
  retrievals: 0,
  insufficientRate: null,
  gapsOpen: 0,
  gapsResolved: 0,
  gapCoverage: null,
  chunksTotal: 0,
  chunksStale: 0,
  chunksAdded: 0,
  candidatesTotal: 0,
  candidatesVerified: 0,
  lastEvalAt: null,
  measuredQuestions: null,
  hitAt5: null,
  citationAccuracy: null,
  corpusVerified: false,
};

describe("health — an unmeasured system must not read as a healthy one", () => {
  it("reports `unmeasured`, not `ok`, when nothing exists", () => {
    const a = assessHealth(EMPTY);
    expect(a.status).toBe("unmeasured");
    expect(a.unmeasured).toBe(true);
  });

  it("never renders a number for a metric that was never measured", () => {
    expect(formatMetricAr(null)).toBe("لم يُقَس");
    expect(formatMetricAr(null, { percent: true })).toBe("لم يُقَس");
    expect(formatMetricAr(null, { unit: "مللي ثانية" })).toBe("لم يُقَس");
    // A real zero is a measurement and MUST still print as zero.
    expect(formatMetricAr(0, { percent: true })).toBe("0٪");
  });

  it("states the constitutional declaration verbatim when nothing ran", () => {
    expect(describeEvaluationAr(EMPTY)).toBe("لم يُشغَّل — القاعدة غير مطبَّقة");
    // Anchors available but zero measured is still «لم يُشغَّل».
    expect(
      describeEvaluationAr({ ...EMPTY, lastEvalAt: "2026-07-28T00:00:00Z", measuredQuestions: 0 }),
    ).toBe("لم يُشغَّل — القاعدة غير مطبَّقة");
  });

  it("flags slow retrieval, thin evidence and stale vectors by severity", () => {
    const a = assessHealth({
      ...EMPTY,
      retrievals: 100,
      retrievalP95Ms: HEALTH_LIMITS.p95CriticalMs,
      insufficientRate: HEALTH_LIMITS.insufficientWarnRate,
      chunksTotal: 10,
      chunksStale: 4,
    });
    expect(a.status).toBe("critical");
    expect(a.findings.map((f) => f.code)).toEqual(
      expect.arrayContaining([
        "latency_critical",
        "insufficient_evidence_warn",
        "stale_vectors_critical",
      ]),
    );
  });

  it("does not invent a latency finding from zero retrievals", () => {
    const a = assessHealth({ ...EMPTY, chunksTotal: 5, chunksStale: 0 });
    expect(a.findings.map((f) => f.code)).not.toContain("latency_warn");
    expect(a.findings.map((f) => f.code)).not.toContain("latency_critical");
  });
});

describe("§2 — destination selection fails closed", () => {
  const green = {
    touchesMigrations: false,
    touchesEdgeFunctions: false,
    changesFeatureFlag: false,
    touchesAnswerPath: false,
    qualityGateGreen: true,
  };

  it("refuses ANY destination for a change touching the answer path", () => {
    const d = selectDestination({ ...green, touchesAnswerPath: true });
    expect(d.destination).toBe("none");
    expect(d.reasons).toContain("touches_answer_path_forbidden");
  });

  it("refuses to deploy while the quality gate is down", () => {
    expect(selectDestination({ ...green, qualityGateGreen: false }).destination).toBe("none");
  });

  it("sends schema, server-surface and flag changes to preview first", () => {
    expect(selectDestination({ ...green, touchesMigrations: true }).destination).toBe("preview");
    expect(selectDestination({ ...green, touchesEdgeFunctions: true }).destination).toBe("preview");
    expect(selectDestination({ ...green, changesFeatureFlag: true }).destination).toBe("preview");
  });

  it("allows production only for a green, low-blast-radius change", () => {
    expect(selectDestination(green).destination).toBe("production");
  });
});

describe("§2 — the emergency reserve is a constraint, not a note", () => {
  it("refuses routine work that would eat into the reserve", () => {
    const d = checkBudget({ total: 10, spent: 8 }, "routine");
    expect(d.allowed).toBe(false);
    expect(d.reasons).toContain("would_consume_emergency_reserve");
    expect(d.remaining).toBe(EMERGENCY_RESERVE);
    expect(d.routineRemaining).toBe(0);
  });

  it("lets a rollback and a hotfix spend the reserve — that is what it is for", () => {
    expect(checkBudget({ total: 10, spent: 8 }, "rollback").allowed).toBe(true);
    const hot = checkBudget({ total: 10, spent: 9 }, "hotfix");
    expect(hot.allowed).toBe(true);
    expect(hot.reasons).toContain("spending_from_reserve");
  });

  it("refuses everything, reserve included, once the budget is gone", () => {
    for (const p of ["routine", "rollback", "hotfix"] as const) {
      const d = checkBudget({ total: 10, spent: 10 }, p);
      expect(d.allowed).toBe(false);
      expect(d.reasons).toContain("budget_exhausted");
    }
  });

  it("keeps routine work flowing while the reserve is intact", () => {
    const d = checkBudget({ total: 10, spent: 3 }, "routine");
    expect(d.allowed).toBe(true);
    expect(d.routineRemaining).toBe(5);
  });
});

describe("§2 — the 90-second window", () => {
  it("treats an unrun check as inconclusive, NOT healthy", () => {
    expect(evaluatePostDeployHealth([]).verdict).toBe("inconclusive");
  });

  it("ignores samples taken after the window closes", () => {
    const r = evaluatePostDeployHealth([
      { atMs: 1_000, ok: true },
      { atMs: POST_DEPLOY_WINDOW_MS + 1, ok: false },
    ]);
    expect(r.verdict).toBe("healthy");
    expect(r.samplesInWindow).toBe(1);
  });

  it("counts a sample exactly on the boundary as inside the window", () => {
    expect(evaluatePostDeployHealth([{ atMs: POST_DEPLOY_WINDOW_MS, ok: false }]).verdict).toBe(
      "unhealthy",
    );
  });

  it("fails on any failure — a service that flaps has not passed", () => {
    const r = evaluatePostDeployHealth([
      { atMs: 10_000, ok: true },
      { atMs: 40_000, ok: false },
      { atMs: 80_000, ok: true },
    ]);
    expect(r.verdict).toBe("unhealthy");
    expect(r.failures).toBe(1);
  });
});

describe("§3 — the two rollbacks are never interchangeable", () => {
  it("a failed health check rolls back the DEPLOYMENT, never the flag", () => {
    const d = decideRollback({
      postDeploy: "unhealthy",
      hitAt5: 0.2,
      baselineHitAt5: 0.9,
      flagEnabled: true,
    });
    // Both signals are bad; only the artifact one may act. Reading the score
    // from a broken deploy would hide an outage behind a flag change.
    expect(d.kind).toBe("deployment");
    expect(d.reasons).toContain("post_deploy_health_failed");
  });

  it("an unverified health check is treated as a failure, not a pass", () => {
    expect(
      decideRollback({
        postDeploy: "inconclusive",
        hitAt5: 0.95,
        baselineHitAt5: 0.9,
        flagEnabled: true,
      }).kind,
    ).toBe("deployment");
  });

  it("a measurement regression rolls back the FLAG and leaves the deploy alone", () => {
    const d = decideRollback({
      postDeploy: "healthy",
      hitAt5: 0.9 - REGRESSION_TOLERANCE - 0.01,
      baselineHitAt5: 0.9,
      flagEnabled: true,
    });
    expect(d.kind).toBe("flag");
  });

  it("turns the flag off when measurement stops while it is on", () => {
    const d = decideRollback({
      postDeploy: "healthy",
      hitAt5: null,
      baselineHitAt5: 0.9,
      flagEnabled: true,
    });
    expect(d.kind).toBe("flag");
    expect(d.reasons).toContain("measurement_lost_while_enabled");
  });

  it("does nothing on a healthy deploy within tolerance", () => {
    expect(
      decideRollback({
        postDeploy: "healthy",
        hitAt5: 0.88,
        baselineHitAt5: 0.9,
        flagEnabled: true,
      }).kind,
    ).toBe("none");
  });

  it("never rolls back a flag that is already off", () => {
    expect(
      decideRollback({
        postDeploy: "healthy",
        hitAt5: 0.1,
        baselineHitAt5: 0.9,
        flagEnabled: false,
      }).kind,
    ).toBe("none");
  });
});

describe("§3 — the deployment log carries every required field", () => {
  it("logs time · destination · hash · reason · health · budget", () => {
    const line = formatDeploymentLogEntry({
      at: "2026-07-28T09:15:00Z",
      destination: "preview",
      hash: "d74b36b1c2d3e4f5",
      purpose: "routine",
      reason: "schema_change_requires_preview",
      health: "healthy",
      budgetRemaining: 6,
    });
    expect(line).toBe(
      "2026-07-28T09:15:00Z · preview · d74b36b · routine:schema_change_requires_preview · health=healthy · budget=6",
    );
  });

  it("records the rollback kind when one happened", () => {
    const line = formatDeploymentLogEntry({
      at: "2026-07-28T09:20:00Z",
      destination: "production",
      hash: "abcdef1234567",
      purpose: "rollback",
      reason: "post_deploy_health_failed",
      health: "unhealthy",
      budgetRemaining: 1,
      rollback: "deployment",
    });
    expect(line).toContain("rollback=deployment");
    expect(line).toContain("health=unhealthy");
  });

  it("records a not-yet-checked deployment as not_run, never as healthy", () => {
    const line = formatDeploymentLogEntry({
      at: "2026-07-28T09:25:00Z",
      destination: "preview",
      hash: "0000000",
      purpose: "routine",
      reason: "low_blast_radius",
      health: "not_run",
      budgetRemaining: 5,
    });
    expect(line).toContain("health=not_run");
  });
});

describe("the SQL side of phase ⑤ stages what these tests assume", () => {
  const sql = readFileSync(
    join(__dirname, "..", "..", "..", "supabase/migrations/20260728170000_rag_operations.sql"),
    "utf8",
  );

  it("gives chunks the staleness provenance the re-embed queue needs", () => {
    expect(sql).toContain("add column if not exists embedded_hash");
    expect(sql).toContain("create or replace view public.rag_reembed_queue");
    expect(sql).toContain("embedded_hash is distinct from c.content_hash");
  });

  it("forbids an evaluation row that claims a score it did not measure", () => {
    expect(sql).toContain("rag_eval_scores_require_measurement");
    expect(sql).toContain(
      "measured_questions > 0 or (hit_at_5 is null and citation_accuracy is null)",
    );
  });

  it("revokes eval writes from members so the gate cannot be hand-fed", () => {
    expect(sql).toContain(
      "revoke insert, update, delete on public.rag_eval_runs from authenticated, anon",
    );
  });

  it("returns NULL rather than zero for unmeasured health metrics", () => {
    expect(sql).toContain("case when r.n = 0 then null");
  });
});
