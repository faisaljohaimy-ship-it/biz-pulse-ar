/**
 * Phase 8.1 — Agent Orchestrator (server-only).
 *
 * Runs a mission across specialist agents. Reuses the Executive Brain
 * as the Chief Agent — never replaces it. Aggregates specialist
 * contributions (evidence, risks, recommendations, decisions,
 * confidence) into a single `ExecutiveBrainAnswer`. Never invents data.
 */
import { getAgent, listAgents } from "./registry";
// Import specialist agents so their `registerAgent(...)` side effects run.
import "./agents";
import { planMission } from "./router.server";
import { toBrainRequest } from "./context.server";
import { loadSharedMemory, recordMissionRef } from "./memory.server";
import { emitOrchestrationEvent } from "./events";
import type { AgentId, AgentResult, MissionOutcome, MissionPlan, MissionRequest } from "./types";
import type {
  ExecutiveBrainAnswer,
  RiskSignal,
  Recommendation,
  DecisionProposal,
  ConfidenceBreakdown,
} from "../executive-brain/types";
import type { AgentRunContext } from "./agent.interface";

const DEFAULT_TIMEOUT = 60_000;

function newMissionId(): string {
  return `mis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function skipped(agentId: AgentId, reason: string): AgentResult {
  const ts = new Date().toISOString();
  return {
    agent_id: agentId,
    ok: false,
    status: "skipped",
    contribution: {},
    unavailable: true,
    error: reason,
    started_at: ts,
    finished_at: ts,
    duration_ms: 0,
  };
}

async function runWithTimeout<T>(
  p: Promise<T>,
  ms: number,
  onTimeout: () => T,
  signal: AbortSignal,
): Promise<T> {
  return await new Promise<T>((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(onTimeout());
    }, ms);
    const abortHandler = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(onTimeout());
    };
    signal.addEventListener("abort", abortHandler, { once: true });
    p.then(
      (v) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", abortHandler);
        resolve(v);
      },
      () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", abortHandler);
        resolve(onTimeout());
      },
    );
  });
}

async function runSingleAgent(agentId: AgentId, ctx: AgentRunContext): Promise<AgentResult> {
  const agent = getAgent(agentId);
  if (!agent) return skipped(agentId, "agent not registered");

  emitOrchestrationEvent("AgentStarted", ctx.mission_id, undefined, agentId);
  const started = Date.now();

  const attempts = Math.max(1, agent.contract.retry_policy.max_attempts);
  const backoff = Math.max(0, agent.contract.retry_policy.backoff_ms);
  const budget = Math.max(1_000, agent.contract.estimated_latency_ms * 3);

  let lastError = "unknown";
  for (let i = 0; i < attempts; i++) {
    const result = await runWithTimeout(
      agent.run(ctx).catch((e: unknown) => {
        lastError = e instanceof Error ? e.message : String(e);
        const ts = new Date().toISOString();
        return {
          agent_id: agentId,
          ok: false,
          status: "failed" as const,
          contribution: {},
          error: lastError,
          started_at: ts,
          finished_at: ts,
          duration_ms: 0,
        };
      }),
      budget,
      () => {
        const ts = new Date().toISOString();
        return {
          agent_id: agentId,
          ok: false,
          status: "timeout" as const,
          contribution: {},
          error: `timeout after ${budget}ms`,
          started_at: ts,
          finished_at: ts,
          duration_ms: budget,
        };
      },
      ctx.signal,
    );

    if (result.ok) {
      emitOrchestrationEvent(
        "AgentCompleted",
        ctx.mission_id,
        { duration_ms: Date.now() - started },
        agentId,
      );
      return result;
    }
    if (result.status === "timeout") {
      emitOrchestrationEvent("AgentTimeout", ctx.mission_id, undefined, agentId);
      return result;
    }
    if (i < attempts - 1 && backoff) {
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  emitOrchestrationEvent("AgentFailed", ctx.mission_id, { error: lastError }, agentId);
  const ts = new Date().toISOString();
  return {
    agent_id: agentId,
    ok: false,
    status: "failed",
    contribution: {},
    error: lastError,
    started_at: ts,
    finished_at: ts,
    duration_ms: Date.now() - started,
  };
}

function mergeConfidence(list: ConfidenceBreakdown[]): ConfidenceBreakdown | undefined {
  if (!list.length) return undefined;
  const avg = (k: keyof ConfidenceBreakdown) =>
    list.reduce((s, c) => s + (c[k] ?? 0), 0) / list.length;
  return {
    evidence_completeness: avg("evidence_completeness"),
    data_freshness: avg("data_freshness"),
    cross_validation: avg("cross_validation"),
    rule_confidence: avg("rule_confidence"),
    historical_similarity: avg("historical_similarity"),
    overall: avg("overall"),
  };
}

function assembleAnswer(results: AgentResult[]): ExecutiveBrainAnswer {
  // The Chief (executive_brain) always contributes a full answer. If it
  // failed, we degrade gracefully to "unavailable".
  const chief = results.find((r) => r.agent_id === "executive_brain" && r.contribution.answer);
  const base: ExecutiveBrainAnswer = chief?.contribution.answer ?? {
    text_ar: "بيانات غير متوفرة",
    text_en: "Data unavailable",
    question: "",
    intent: "question",
    reasoning_type: "executive",
    required_data: [],
    evidence: [],
    reasoning: "",
    assumptions: [],
    risks: [],
    confidence: {
      evidence_completeness: 0,
      data_freshness: 0,
      cross_validation: 0,
      rule_confidence: 0,
      historical_similarity: 0,
      overall: 0.2,
    },
    recommendation: null,
    decision: null,
    next_action: null,
    business_impact_en: "",
    business_impact_ar: "",
    plan: [],
    insights: [],
    sources: [],
  };

  const extraEvidence = new Set<string>(base.evidence);
  const extraSources = new Set<string>(base.sources);
  const extraRisks: RiskSignal[] = [...base.risks];
  const recs: Recommendation[] = base.recommendation ? [base.recommendation] : [];
  const decs: DecisionProposal[] = base.decision ? [base.decision] : [];
  const confs: ConfidenceBreakdown[] = [base.confidence];

  for (const r of results) {
    if (r.agent_id === "executive_brain") continue;
    if (!r.ok) continue;
    const c = r.contribution;
    c.evidence?.forEach((e) => extraEvidence.add(e));
    c.sources?.forEach((s) => extraSources.add(s));
    if (c.risks) extraRisks.push(...c.risks);
    if (c.recommendation) recs.push(c.recommendation);
    if (c.decision) decs.push(c.decision);
    if (c.confidence) confs.push(c.confidence);
  }

  // Merge — keep highest-priority recommendation, most conservative decision.
  const rankPriority = { critical: 3, high: 2, medium: 1, low: 0 } as const;
  recs.sort((a, b) => rankPriority[b.priority] - rankPriority[a.priority]);
  const decision = decs.find((d) => d.requires_human_approval) ?? decs[0] ?? null;

  extraRisks.sort((a, b) => b.score - a.score);

  return {
    ...base,
    evidence: Array.from(extraEvidence).slice(0, 12),
    sources: Array.from(extraSources),
    risks: extraRisks.slice(0, 8),
    recommendation: recs[0] ?? null,
    decision,
    confidence: mergeConfidence(confs) ?? base.confidence,
  };
}

export interface RunAgentMissionOptions {
  apiKey?: string;
}

export async function runAgentMission(
  req: MissionRequest,
  opts: RunAgentMissionOptions = {},
): Promise<MissionOutcome> {
  const mission_id = req.missionId ?? newMissionId();
  const started_at = new Date().toISOString();
  const startedMs = Date.now();

  emitOrchestrationEvent("MissionStarted", mission_id, {
    question: req.question.slice(0, 200),
  });

  // Ensure at least one agent is registered (chief).
  if (!listAgents().length) {
    emitOrchestrationEvent("MissionCompleted", mission_id, { empty: true });
    const answer = assembleAnswer([]);
    return {
      mission_id,
      plan: { mission_id, intent: "question", nodes: [], layers: [] },
      results: [],
      answer,
      started_at,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedMs,
      cancelled: false,
    };
  }

  const plan: MissionPlan = planMission(mission_id, req.question, req.agents);
  const brainReq = toBrainRequest(req);
  const memory = loadSharedMemory(req.sessionId);

  const external = req.signal;
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onExternalAbort, { once: true });
  }
  const missionTimeout = setTimeout(() => controller.abort(), req.timeoutMs ?? DEFAULT_TIMEOUT);

  let results: AgentResult[] = [];
  let cancelled = false;

  try {
    const { runScheduledMission } = await import("../task-bus/scheduler.server");
    const nodesById = new Map(plan.nodes.map((n) => [n.agent_id, n]));
    const taskIdByAgent = new Map<string, string>();
    const busRun = await runScheduledMission(
      mission_id,
      {
        request: { ...req, ...brainReq } as MissionRequest,
        memory,
        signal: controller.signal,
        apiKey: opts.apiKey,
      },
      (enqueue) => {
        // Enqueue in topological order so dependency ids are known.
        for (const layer of plan.layers) {
          for (const agentId of layer) {
            const node = nodesById.get(agentId);
            if (!node) continue;
            const agent = listAgents().find((a) => a.contract.id === agentId);
            const deps = node.depends_on
              .map((d) => taskIdByAgent.get(d as string))
              .filter((v): v is string => !!v);
            const t = enqueue({
              missionId: mission_id,
              agentId,
              intent: plan.intent,
              priority: agent?.contract.priority === "critical" ? "critical" : "medium",
              dependencies: deps,
              approvalRequired: agent?.contract.requires_human_approval ?? false,
              timeout: Math.max(3_000, (agent?.contract.estimated_latency_ms ?? 3_000) * 3),
              estimatedCost: agent?.contract.estimated_cost,
              estimatedLatency: agent?.contract.estimated_latency_ms,
              contextSignature: req.sessionId ?? "",
              memoryScope: req.sessionId ?? mission_id,
              payload: { question: req.question },
              metadata: { reason: node.reason },
            });
            taskIdByAgent.set(agentId as string, t.taskId);
          }
        }
      },
    );
    results = busRun.results;
    cancelled = busRun.cancelled;
    // Emit orchestrator-level events for tasks that never produced a result.
    for (const t of busRun.tasks) {
      if (t.status === "cancelled")
        emitOrchestrationEvent("AgentSkipped", mission_id, { reason: "cancelled" }, t.agentId);
    }
  } finally {
    clearTimeout(missionTimeout);
    if (external) external.removeEventListener("abort", onExternalAbort);
  }

  const answer = assembleAnswer(results);
  const finished_at = new Date().toISOString();

  if (req.sessionId) {
    recordMissionRef(req.sessionId, {
      mission_id,
      intent: plan.intent,
      ts: finished_at,
    });
  }

  emitOrchestrationEvent(cancelled ? "MissionCancelled" : "MissionCompleted", mission_id, {
    duration_ms: Date.now() - startedMs,
    agents: results.map((r) => ({ id: r.agent_id, status: r.status })),
  });

  return {
    mission_id,
    plan,
    results,
    answer,
    started_at,
    finished_at,
    duration_ms: Date.now() - startedMs,
    cancelled,
  };
}
