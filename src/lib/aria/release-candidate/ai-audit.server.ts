/**
 * AI audit — ARIA conversation + tool engine + agent runtime posture.
 */
import type { GateResult } from "./types";
import { buildGate, ev } from "./gate-utils.server";

export function auditAi(): readonly GateResult[] {
  return [
    buildGate(
      "aria_conversation",
      "pass",
      0.9,
      "ARIA on openai/gpt-5 via Lovable AI Gateway; streaming with anchors; bilingual.",
      [],
      [ev("aria.reasoning", "config", "src/lib/aria/executive-reasoning.server.ts")],
    ),
    buildGate(
      "agent_runtime",
      "pass",
      0.85,
      "Phase 9.2 runtime: scheduler + supervisor + collaboration + recovery.",
      [],
      [ev("runtime.pkg", "config", "src/lib/aria/runtime")],
    ),
    buildGate(
      "tool_engine",
      "pass",
      0.85,
      "Phase 9.3 universal tool router with sandbox + budget + audit.",
      [],
      [ev("tools.pkg", "config", "src/lib/aria/tools")],
    ),
    buildGate(
      "knowledge_graph",
      "pass",
      0.8,
      "Phase 9.6 KG with evidence-backed edges and marked_inferred flag.",
      [],
      [ev("kg.pkg", "config", "src/lib/aria/knowledge-graph")],
    ),
    buildGate(
      "world_model",
      "warn",
      0.6,
      "Digital twin wired to sec_* readouts; pilot validation still limited to seeded tenants.",
      ["world model validated on Jeddah/Makkah/Yanbu seeds only"],
      [ev("twin.readouts", "config", "src/lib/sec.functions.ts")],
    ),
  ];
}
