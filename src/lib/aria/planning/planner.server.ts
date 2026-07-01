/**
 * Main planning entry point.
 *
 *   User goal → Goal Parser → Mission Builder → Decomposition
 *     → Dependency Graph → Marketplace Capability Resolution
 *     → Strategy Selection → Constraint Validation → Optimization
 *     → Risk Analysis → Recovery Plan → Reflection → Verification
 *     → Approval Check → ExecutionPlan
 *
 * The planner never executes agents, never touches memory, never
 * dispatches tasks. It produces an ExecutionPlan for the Orchestrator.
 */
import type {
  ExecutionPlan,
  PlanningDecision,
  SuccessCriterion,
} from "./types";
import { PlanMissionInputSchema, type PlanMissionInput } from "./contracts";
import { parseGoal, deriveObjectives } from "./goal.server";
import { buildMissionTree } from "./decomposition.server";
import { buildDependencyGraph } from "./dependency.server";
import { resolveBindings } from "./routing.server";
import { chooseStrategy, planStages } from "./strategy.server";
import { validateConstraints } from "./constraint.server";
import { optimize } from "./optimization.server";
import { estimatePlan } from "./estimation.server";
import { analyzeRisks, scoreRisk } from "./risk.server";
import { planRecovery } from "./recovery.server";
import { verifyPlan } from "./verification.server";
import { resolveApprovals } from "./approval.server";
import { evaluatePolicies } from "./policy.server";
import { emitPlanning } from "./events";
import {
  PLANNER_VERSION,
  noteActive,
  notePlanFailure,
  notePlanSuccess,
} from "./metrics.server";
import { bootMarketplace } from "../marketplace";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function decision(
  stage: PlanningDecision["stage"],
  summary: string,
  reasoning: string,
  evidence: string[],
  confidence: number,
): PlanningDecision {
  return {
    id: uid("dec"),
    stage,
    summary,
    reasoning,
    evidence,
    confidence,
    ts: new Date().toISOString(),
  };
}

export async function planMission(
  input: PlanMissionInput,
): Promise<ExecutionPlan> {
  bootMarketplace();
  const validated = PlanMissionInputSchema.parse(input);
  const constraints = validated.constraints.map((c) => ({ ...c, id: uid("con") }));
  const missionId = uid("mission");
  const started = Date.now();
  noteActive(1);
  emitPlanning("GoalReceived", missionId, { utterance: validated.utterance });
  emitPlanning("PlanningStarted", missionId);

  try {
    const decisions: PlanningDecision[] = [];

    // 1. Goal + objectives
    const goal = parseGoal(validated);
    emitPlanning("GoalParsed", missionId, { goal_id: goal.id });
    decisions.push(
      decision(
        "goal_parsing",
        `Parsed goal "${goal.intent}" in domain "${goal.domain}"`,
        goal.reasoning,
        [`utterance=${validated.utterance}`],
        0.95,
      ),
    );

    const objectives = deriveObjectives(goal, validated);
    emitPlanning("ObjectivesCreated", missionId, {
      count: objectives.length,
    });

    // 2. Decomposition
    const rawTree = buildMissionTree(missionId, goal, objectives);
    emitPlanning("MissionExpanded", missionId, {
      depth: rawTree.depth,
      atomic: rawTree.atomic_ids.length,
    });

    // 3. Dependency graph
    const rawGraph = buildDependencyGraph(rawTree);
    emitPlanning("DependenciesBuilt", missionId, {
      nodes: rawGraph.nodes.length,
      edges: rawGraph.edges.length,
    });

    // 4. Marketplace routing
    const rawBindings = resolveBindings(rawTree);
    decisions.push(
      decision(
        "routing",
        `Resolved ${rawBindings.filter((b) => b.resolved_agent).length}/${rawBindings.length} bindings`,
        "Marketplace capability index queried per atomic node; unresolved nodes deferred to recovery.",
        rawBindings.map(
          (b) => `${b.node_id}=${b.capability}:${b.match_kind}`,
        ),
        rawBindings.length
          ? rawBindings.reduce((s, b) => s + b.score, 0) / rawBindings.length
          : 0,
      ),
    );

    // 5. Optimization (may drop redundant nodes/edges)
    const opt = optimize(rawTree, rawGraph, rawBindings);
    const tree = opt.tree;
    const graph = opt.graph;
    const bindings = opt.bindings;
    emitPlanning("OptimizationFinished", missionId, {
      removed_edges: opt.removed_edges,
      merged_nodes: opt.merged_nodes,
      gain: opt.gain,
    });
    decisions.push(
      decision(
        "optimization",
        `Parallelism ${opt.parallelism_before} → ${opt.parallelism_after} (gain=${opt.gain.toFixed(2)})`,
        opt.reasoning,
        [
          `removed_edges=${opt.removed_edges}`,
          `merged_nodes=${opt.merged_nodes}`,
        ],
        0.9,
      ),
    );

    // 6. Strategy + stages
    const strategy = chooseStrategy(goal, graph, constraints);
    const stages = planStages(graph, strategy);
    emitPlanning("StrategyChosen", missionId, { strategy });
    decisions.push(
      decision(
        "strategy",
        `Strategy = ${strategy}`,
        "Derived from graph width, edge density, and hard constraints.",
        [
          `layers=${graph.layers.length}`,
          `edges=${graph.edges.length}`,
          `hard_constraints=${constraints.filter((c) => c.hard).length}`,
        ],
        0.85,
      ),
    );

    // 7. Estimation
    const estimation = estimatePlan(graph, bindings, constraints);
    decisions.push(
      decision(
        "constraint",
        `Estimated duration ${estimation.duration_ms}ms, cost ${estimation.cost_units}, confidence ${estimation.confidence.toFixed(2)}`,
        estimation.reasoning,
        [
          `retries_expected=${estimation.retries_expected}`,
          `failure_probability=${estimation.failure_probability.toFixed(2)}`,
        ],
        estimation.confidence,
      ),
    );

    // 8. Constraint feasibility
    const constraintIssues = validateConstraints(
      constraints,
      estimation,
      bindings,
    );

    // 9. Risks
    const risks = analyzeRisks(graph, bindings, estimation, constraints);
    const riskScore = scoreRisk(risks);
    emitPlanning("RiskCalculated", missionId, {
      count: risks.length,
      score: riskScore,
    });
    decisions.push(
      decision(
        "risk",
        `${risks.length} risk(s) identified; aggregate score ${riskScore.toFixed(2)}`,
        "Evidence-backed analysis over graph, bindings, marketplace telemetry, and constraints.",
        risks.slice(0, 5).map((r) => `${r.kind}:${r.severity}`),
        1 - riskScore,
      ),
    );

    // 10. Recovery
    const { options: recovery, rollback } = planRecovery(tree, bindings, risks);
    emitPlanning("RecoveryGenerated", missionId, { options: recovery.length });
    decisions.push(
      decision(
        "recovery",
        `${recovery.length} recovery option(s), ${rollback.length} rollback step(s)`,
        "Each recovery option targets a specific node with a bounded strategy; rollback provides per-atomic compensation.",
        recovery.slice(0, 5).map((r) => `${r.target_node_id}:${r.strategy}`),
        0.8,
      ),
    );

    // 11. Approvals
    const approvals = resolveApprovals(tree, bindings, constraints);
    if (approvals.some((a) => a.mode === "required"))
      emitPlanning("ApprovalRequired", missionId);

    // 12. Policy evaluation
    const policyIssues = evaluatePolicies(goal, bindings, constraints);

    // 13. Verification (adds reflection issues)
    const verification = verifyPlan(objectives, tree, graph, bindings);
    verification.issues.push(...constraintIssues, ...policyIssues);
    verification.ok = !verification.issues.some((i) => i.fatal);
    decisions.push(
      decision(
        "verification",
        verification.ok ? "Verification passed" : "Verification failed",
        "Combined cycle detection, routing completeness, objective coverage, reflection, constraints, and policy.",
        verification.issues.slice(0, 8).map((i) => i.code),
        verification.ok ? 1 : 0.4,
      ),
    );
    if (verification.ok)
      emitPlanning("VerificationPassed", missionId);

    if (!verification.ok) {
      const reason = verification.issues
        .filter((i) => i.fatal)
        .map((i) => i.code)
        .join(",");
      throw new Error(`plan verification failed: ${reason}`);
    }

    const success_criteria: SuccessCriterion[] = objectives.map((o) => ({
      id: uid("crit"),
      description: `Objective "${o.title}" completed with all acceptance criteria satisfied`,
      reasoning:
        "Success derives from objective-level acceptance criteria — the plan cannot succeed unless every objective's evidence is produced.",
    }));

    const plan: ExecutionPlan = {
      mission_id: missionId,
      goal,
      objectives,
      constraints,
      tree,
      graph,
      stages,
      bindings,
      strategy,
      success_criteria,
      approvals,
      risks,
      recovery,
      rollback,
      estimation,
      verification,
      decisions,
      created_at: new Date().toISOString(),
      planner_version: PLANNER_VERSION,
    };

    const latency = Date.now() - started;
    notePlanSuccess({
      latency_ms: latency,
      depth: tree.depth,
      optimization_gain: opt.gain,
      risk_score: riskScore,
      confidence: estimation.confidence,
      cost: estimation.cost_units,
      duration_ms: estimation.duration_ms,
    });
    emitPlanning("PlanningCompleted", missionId, { latency_ms: latency });
    return plan;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    notePlanFailure(reason);
    emitPlanning("PlanningFailed", missionId, { reason });
    throw err;
  } finally {
    noteActive(-1);
  }
}
