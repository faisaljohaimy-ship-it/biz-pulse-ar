/**
 * FNN — the no-model automation agent.
 *
 * FNN only classifies a request and prepares a bounded automation hand-off.
 * It does not call Gemini/OpenAI/Claude, read employee PII, write Supabase,
 * send messages, or execute an external side effect. Any real action remains
 * behind SADEED's approval gate and the existing role/RLS controls.
 */
import type { AgentRunContext, ExecutiveAgent } from "./agent.interface";
import type { AgentContract, AgentResult } from "./types";
import { prepareFnnPlan } from "./fnn-plan";
import { listAgentContracts } from "./registry";

export const FNN_LINKED_SCOPES = [
  "agents:*",
  "departments:*",
  "sections:*",
  "circles:*",
  "employees:industrial-security",
  "industrial-security:all-regions",
] as const;

const FNN_LINKED_AGENTS = ["*"] as const;

const FNN_CONTRACT: AgentContract = {
  id: "fnn",
  name_en: "FNN Automation Agent",
  name_ar: "فنن — وكيل الأتمتة",
  description:
    "Deterministic, no-model automation coordinator for approved Industrial Security workflows.",
  capabilities: [
    { key: "classify_workflow", description: "Classify an automation request without a model." },
    {
      key: "prepare_handoff",
      description: "Prepare a bounded hand-off to SADEED and specialist agents.",
    },
    { key: "scope_guard", description: "Restrict automation to Industrial Security scopes." },
  ],
  intents: ["command", "operational_status", "recommendation", "question"],
  input_contract: "MissionRequest",
  output_contract: "FnnAutomationPlan",
  priority: "medium",
  estimated_cost: "low",
  estimated_latency_ms: 5,
  // The planning record itself is safe to compute automatically. Any real
  // external action is represented as `approval_required` in the plan.
  requires_human_approval: false,
  dependencies: [],
  execution_policy: "parallel",
  retry_policy: { max_attempts: 1, backoff_ms: 0 },
  supports_streaming: false,
  supports_cancellation: true,
  supports_confidence: false,
  supports_evidence: true,
  billing: "free",
  linked_scopes: FNN_LINKED_SCOPES,
  linked_agent_ids: FNN_LINKED_AGENTS,
};

export const fnnAgent: ExecutiveAgent = {
  contract: FNN_CONTRACT,
  async run(ctx: AgentRunContext): Promise<AgentResult> {
    const started = Date.now();
    const plan = prepareFnnPlan(
      ctx.request.question,
      listAgentContracts().map((agent) => ({ id: agent.id, name: agent.name_ar })),
      ctx.signal,
    );
    const workflow = plan.workflow;
    const finished = new Date().toISOString();
    const linkedScopes = [...FNN_LINKED_SCOPES];
    return {
      agent_id: "fnn",
      ok: plan.status === "prepared",
      status:
        plan.status === "cancelled"
          ? "cancelled"
          : plan.status === "prepared"
            ? "completed"
            : "skipped",
      contribution: {
        text_ar:
          plan.status === "prepared"
            ? `FNN جهّز خطة بلا استدعاء نموذج: ${plan.title}. التنفيذ الخارجي ينتظر اعتماد صاحب الصلاحية.`
            : plan.title,
        text_en:
          plan.status === "prepared"
            ? `FNN prepared the no-model workflow: ${workflow}. External execution remains approval-gated.`
            : `FNN: ${plan.status}.`,
        evidence: ["fnn:deterministic-no-model", `fnn:workflow:${workflow}`],
        sources: ["fnn:local-automation-policy"],
        automation: {
          workflow,
          trigger: "manual",
          side_effects: "approval_required",
          linked_scopes: linkedScopes,
          steps: plan.steps,
          linked_agent_ids: plan.peers.map((peer) => peer.id),
        },
      },
      started_at: new Date(started).toISOString(),
      finished_at: finished,
      duration_ms: Date.now() - started,
    };
  },
};

export function getFnnContract(): AgentContract {
  return FNN_CONTRACT;
}
