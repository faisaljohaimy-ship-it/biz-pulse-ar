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
import type { FinnIntent } from "../executive-reasoning.server";
import { runExecutiveBrain } from "../executive-brain/brain.server";
import { toBrainRequest } from "./context.server";
import { buildReport, KIND_LABEL_AR_MAP } from "@/lib/reports-agent/engine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseContract(
  id: AgentId,
  name_en: string,
  name_ar: string,
  intents: FinnIntent[],
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

function done(
  agentId: AgentId,
  contribution: AgentResult["contribution"],
  startedMs: number,
): AgentResult {
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
  intents: FinnIntent[],
  extract: (
    answer: import("../executive-brain/types").ExecutiveBrainAnswer,
  ) => AgentResult["contribution"],
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
  passiveAgent(
    "planning",
    "Planning",
    "التخطيط",
    ["command", "decision_support", "recommendation"],
    (a) => ({
      evidence: a.plan.map((s) => `plan: ${s.goal_en || s.goal_ar || s.tool}`),
      sources: ["planning-engine"],
    }),
  ),
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
  passiveAgent(
    "inspection",
    "Inspection",
    "التفتيش",
    ["operational_status", "investigation"],
    (a) => ({
      sources: a.sources.filter((s) => /inspection|permit|work_orders/.test(s)),
    }),
  ),
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
      evidence: a.insights
        .slice(0, 4)
        .map((i) => `briefing: ${i.title_en ?? i.title_ar ?? ""}`)
        .filter(Boolean),
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
  passiveAgent(
    "simulation",
    "Simulation",
    "المحاكاة",
    ["prediction", "analysis", "trend_analysis"],
    (a) => ({
      sources: a.sources.filter((s) => /sim_/.test(s)),
    }),
  ),
);

// ---------------------------------------------------------------------------
// Reports Agent — وكيل التقارير
// Active specialist: always produces a fresh executive report record and
// contributes it as evidence + a compact Arabic summary line. Linked to
// FINN through the orchestrator; the persistent live dashboard lives at
// /reports-agent.
// ---------------------------------------------------------------------------

const reportsAgent: ExecutiveAgent = {
  contract: baseContract(
    "reports",
    "Reports Agent",
    "وكيل التقارير",
    [
      "executive_summary",
      "meeting_brief",
      "operational_status",
      "kpi_explanation",
      "analysis",
      "trend_analysis",
      "recommendation",
    ],
    {
      description:
        "Always-on reports agent — generates periodic executive reports and exposes them as evidence for FINN.",
      priority: "medium",
      estimated_cost: "low",
      estimated_latency_ms: 200,
      execution_policy: "parallel",
      dependencies: [],
    },
  ),
  async run(ctx): Promise<AgentResult> {
    const startedMs = Date.now();
    const report = buildReport();
    const metrics = report.metrics.map((m) => `${m.label}: ${m.value}`).join(" · ");
    const line = `${report.titleAr} (${report.id}) — ${metrics}`;
    return done(
      "reports",
      {
        text_ar: `تقرير مُصدر من وكيل التقارير · ${report.titleAr} — ${report.summaryAr}`,
        evidence: [line, `مسار العرض المستمر: /reports-agent`],
        sources: [
          `reports-agent:${KIND_LABEL_AR_MAP[report.kind]}`,
          `reports-agent:${report.regionAr}`,
        ],
      },
      startedMs,
    );
    // ctx unused: report generation is deterministic and independent of the
    // chief brain's answer, so the agent runs in parallel from turn zero.
    void ctx;
  },
};

registerAgent(reportsAgent);

// ---------------------------------------------------------------------------
// Knowledge Agent — وكيل المعرفة (RAG retrieval specialist)
// Runs Arabic-aware hybrid retrieval (Dense + FTS + Trigram, RRF-fused)
// through the Evidence Gate and contributes cited passages as evidence.
// Never fabricates: on gate rejection returns `unavailable: true`.
// Governed by FINN_MASTER_CONSTITUTION Articles 30–31.
// ---------------------------------------------------------------------------

const knowledgeAgent: ExecutiveAgent = {
  contract: baseContract(
    "knowledge",
    "Knowledge Agent",
    "وكيل المعرفة",
    [
      "executive_summary",
      "operational_status",
      "kpi_explanation",
      "analysis",
      "recommendation",
      "meeting_brief",
    ],
    {
      description:
        "Arabic-first RAG retrieval specialist — hybrid search (dense+FTS+trigram RRF) with Evidence Gate (min sim 0.35, ≥2 citations).",
      priority: "high",
      estimated_cost: "medium",
      estimated_latency_ms: 900,
      execution_policy: "parallel",
      dependencies: [],
    },
  ),
  async run(ctx): Promise<AgentResult> {
    const startedMs = Date.now();
    const question = (ctx.request.question ?? "").trim();
    if (!question) {
      return unavailable("knowledge", "empty_question", startedMs);
    }
    try {
      const { retrieveWithEvidenceGate } = await import("@/lib/aria/rag/retrieve.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const outcome = await retrieveWithEvidenceGate(supabaseAdmin as never, {
        query: question,
        orgId: ctx.request.orgId ?? null,
        limit: 8,
        route: "orchestrator:knowledge",
        correlationId: ctx.mission_id,
      });
      if (outcome.gate_result !== "passed" || outcome.hits.length === 0) {
        return unavailable("knowledge", `gate:${outcome.gate_result}`, startedMs);
      }
      const evidence = outcome.hits.slice(0, 6).map((h) => {
        const title = h.title_ar || h.title_en || h.doc_code || h.id;
        const summary = h.summary_ar || h.summary_en || "";
        const score = (h.similarity * 100).toFixed(0);
        return `${title} — ${summary} [مرجع ${h.doc_code ?? h.id} · تطابق ${score}%]`;
      });
      const sources = outcome.hits.slice(0, 6).map((h) => `kb:${h.doc_code ?? h.id}`);
      const textAr = `استرجع وكيل المعرفة ${outcome.hits.length} مقاطع مرجعية (أعلى تطابق ${(outcome.max_similarity * 100).toFixed(0)}%).`;
      return done("knowledge", { text_ar: textAr, evidence, sources }, startedMs);
    } catch (err) {
      return unavailable(
        "knowledge",
        err instanceof Error ? err.message : "retrieval_error",
        startedMs,
      );
    }
  },
};

registerAgent(knowledgeAgent);
