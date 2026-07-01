/**
 * Specialist agents — thin adapters over existing Phase 6/7 engines.
 * No new business logic. Every agent that lacks real evidence returns
 * `unavailable: true` rather than fabricating a contribution.
 *
 * Chief Agent: `executive_brain` — wraps `runExecutiveBrain()` and
 * produces the final `ExecutiveBrainAnswer`. All other agents contribute
 * partial evidence/risks/recommendations that the orchestrator merges.
 */
import { registerAgent } from "./registry";
import type { ExecutiveAgent, AgentRunContext } from "./agent.interface";
import type { AgentContract, AgentResult, AgentId } from "./types";
import type { AriaIntent } from "../executive-reasoning.server";
import { runExecutiveBrain } from "../executive-brain/brain.server";
import { toBrainRequest } from "./context.server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseContract(
  id: AgentId,
  name_en: string,
  name_ar: string,
  intents: AriaIntent[],
  overrides: Partial<AgentContract> = {},
): AgentContract {
  return {
    id,
    name_en,
    name_ar,
    description: overrides.description ?? `${name_en} specialist agent.`,
    capabilities: overrides.capabilities ?? [],
    intents,
    input_contract: overrides.input_contract ?? "MissionRequest",
    output_contract: overrides.output_contract ?? "AgentResult",
    priority: overrides.priority ?? "medium",
    estimated_cost: overrides.estimated_cost ?? "low",
    estimated_latency_ms: overrides.estimated_latency_ms ?? 800,
    requires_human_approval: overrides.requires_human_approval ?? false,
    dependencies: overrides.dependencies ?? [],
    execution_policy: overrides.execution_policy ?? "parallel",
    retry_policy: overrides.retry_policy ?? { max_attempts: 1, backoff_ms: 0 },
    supports_streaming: overrides.supports_streaming ?? false,
    supports_cancellation: overrides.supports_cancellation ?? true,
    supports_confidence: overrides.supports_confidence ?? true,
    supports_evidence: overrides.supports_evidence ?? true,
  };
}

function done(agentId: AgentId, contribution: AgentResult["contribution"], startedMs: number): AgentResult {
  const finished_at = new Date().toISOString();
  return {
    agent_id: agentId,
    ok: true,
    status: "completed",
    contribution,
    started_at: new Date(startedMs).toISOString(),
    finished_at,
    duration_ms: Date.now() - startedMs,
  };
}

function unavailable(agentId: AgentId, reason: string, startedMs: number): AgentResult {
  const finished_at = new Date().toISOString();
  return {
    agent_id: agentId,
    ok: true,
    status: "skipped",
    contribution: {},
    unavailable: true,
    error: reason,
    started_at: new Date(startedMs).toISOString(),
    finished_at,
    duration_ms: Date.now() - startedMs,
  };
}

// ---------------------------------------------------------------------------
// Chief: Executive Brain (wraps runExecutiveBrain)
// ---------------------------------------------------------------------------

const executiveBrainAgent: ExecutiveAgent = {
  contract: baseContract(
    "executive_brain",
    "Executive Brain",
    "الدماغ التنفيذي",
    [
      "question",
      "executive_summary",
      "decision_support",
      "recommendation",
      "analysis",
      "operational_status",
      "meeting_brief",
      "kpi_explanation",
      "trend_analysis",
      "comparison",
      "prediction",
      "investigation",
      "root_cause",
      "incident_review",
      "risk_assessment",
      "command",
    ],
    {
      priority: "critical",
      estimated_cost: "high",
      estimated_latency_ms: 12_000,
      execution_policy: "sequential",
      retry_policy: { max_attempts: 1, backoff_ms: 0 },
    },
  ),
  async run(ctx: AgentRunContext): Promise<AgentResult> {
    const startedMs = Date.now();
    if (!ctx.apiKey) return unavailable("executive_brain", "missing gateway key", startedMs);
    const answer = await runExecutiveBrain(toBrainRequest(ctx.request), { apiKey: ctx.apiKey });
    return done(
      "executive_brain",
      {
        answer,
        text_ar: answer.text_ar,
        text_en: answer.text_en,
        evidence: answer.evidence,
        reasoning: answer.reasoning,
        assumptions: answer.assumptions,
        risks: answer.risks,
        recommendation: answer.recommendation,
        decision: answer.decision,
        confidence: answer.confidence,
        sources: answer.sources,
      },
      startedMs,
    );
  },
};

// ---------------------------------------------------------------------------
// Passive specialists — reuse the Chief's evidence surface. No fabrication.
// Each promotes a distinct slice (risks, recommendation, insights, etc.)
// from the Chief's answer once it is available in `prior_results`.
// ---------------------------------------------------------------------------

function passiveAgent(
  id: AgentId,
  name_en: string,
  name_ar: string,
  intents: AriaIntent[],
  extract: (answer: import("../executive-brain/types").ExecutiveBrainAnswer) => AgentResult["contribution"],
  overrides: Partial<AgentContract> = {},
): ExecutiveAgent {
  return {
    contract: baseContract(id, name_en, name_ar, intents, {
      dependencies: ["executive_brain"],
      execution_policy: "sequential",
      ...overrides,
    }),
    async run(ctx): Promise<AgentResult> {
      const startedMs = Date.now();
      const chief = ctx.prior_results.find((r) => r.agent_id === "executive_brain");
      const answer = chief?.contribution.answer;
      if (!answer) return unavailable(id, "chief brain output unavailable", startedMs);
      const contribution = extract(answer);
      const hasSignal =
        (contribution.evidence?.length ?? 0) +
          (contribution.risks?.length ?? 0) +
          (contribution.sources?.length ?? 0) +
          (contribution.recommendation ? 1 : 0) +
          (contribution.decision ? 1 : 0) >
        0;
      if (!hasSignal) return unavailable(id, "no evidence for this specialist", startedMs);
      return done(id, contribution, startedMs);
    },
  };
}

// ---------------------------------------------------------------------------
// Register everything.
// ---------------------------------------------------------------------------

registerAgent(executiveBrainAgent);

registerAgent(
  passiveAgent("planning", "Planning", "التخطيط", ["command", "decision_support", "recommendation"], (a) => ({
    evidence: a.plan.map((s) => `plan: ${s.title ?? s.tool ?? "step"}`),
    sources: ["planning-engine"],
  })),
);

registerAgent(
  passiveAgent("risk", "Risk", "المخاطر", ["risk_assessment", "analysis", "prediction"], (a) => ({
    risks: a.risks,
    sources: a.sources.filter((s) => /risk|sim_risks/.test(s)),
  })),
);

registerAgent(
  passiveAgent(
    "recommendation",
    "Recommendation",
    "التوصيات",
    ["recommendation", "decision_support", "executive_summary"],
    (a) => ({ recommendation: a.recommendation, decision: a.decision }),
  ),
);

registerAgent(
  passiveAgent("inspection", "Inspection", "التفتيش", ["operational_status", "investigation"], (a) => ({
    sources: a.sources.filter((s) => /inspection|permit|work_orders/.test(s)),
  })),
);

registerAgent(
  passiveAgent("incident", "Incident", "الحوادث", ["incident_review", "root_cause"], (a) => ({
    evidence: a.evidence.filter((e) => /incident|inc_/i.test(e)),
    sources: a.sources.filter((s) => /incidents|notifications/.test(s)),
  })),
);

registerAgent(
  passiveAgent("patrol", "Patrol", "الدوريات", ["operational_status", "investigation"], (a) => ({
    sources: a.sources.filter((s) => /patrol/.test(s)),
  })),
);

registerAgent(
  passiveAgent("compliance", "Compliance", "الالتزام", ["risk_assessment", "analysis"], (a) => ({
    sources: a.sources.filter((s) => /compliance|policy|audit/.test(s)),
  })),
);

registerAgent(
  passiveAgent(
    "operations",
    "Operations",
    "العمليات",
    ["operational_status", "executive_summary", "meeting_brief"],
    (a) => ({
      sources: a.sources.filter((s) => /work_orders|patrols|operations/.test(s)),
    }),
  ),
);

registerAgent(
  passiveAgent(
    "analytics",
    "Analytics",
    "التحليلات",
    ["kpi_explanation", "trend_analysis", "comparison", "prediction", "analysis"],
    (a) => ({
      evidence: a.insights.map((i) => `insight: ${i.title_en ?? i.title_ar ?? ""}`).filter(Boolean),
      sources: a.sources.filter((s) => /kpi|pulse/.test(s)),
    }),
  ),
);

registerAgent(
  passiveAgent(
    "briefing",
    "Briefing",
    "الإحاطات",
    ["executive_summary", "meeting_brief", "operational_status"],
    (a) => ({
      evidence: a.insights.slice(0, 4).map((i) => `briefing: ${i.title_en ?? i.title_ar ?? ""}`).filter(Boolean),
      sources: ["briefing"],
    }),
  ),
);

registerAgent(
  passiveAgent("memory", "Memory", "الذاكرة التنفيذية", ["question", "executive_summary"], (a) => ({
    sources: ["executive-memory"],
    evidence: a.assumptions.map((x) => `assumption: ${x}`),
  })),
);

registerAgent(
  passiveAgent("context", "Context", "السياق", ["question", "executive_summary"], () => ({
    sources: ["context-frame"],
  })),
);

registerAgent(
  passiveAgent("presence", "Presence", "الحضور", ["question", "executive_summary"], () => ({
    sources: ["presence"],
  })),
);

registerAgent(
  passiveAgent("simulation", "Simulation", "المحاكاة", ["prediction", "analysis", "trend_analysis"], (a) => ({
    sources: a.sources.filter((s) => /sim_/.test(s)),
  })),
);
