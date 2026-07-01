/**
 * Canonical RC1 checklist — the 20 gates and their required criticality.
 * Never rewritten at runtime; used by system-audit to build gate results.
 */
import type { Criticality, GateId } from "./types";

export interface ChecklistItem {
  readonly id: GateId;
  readonly title: string;
  readonly criticality: Criticality;
  readonly description: string;
}

export const RC1_CHECKLIST: readonly ChecklistItem[] = [
  { id: "architecture", title: "Architecture health", criticality: "critical", description: "Layered ARIA structure preserved and additive." },
  { id: "type_safety", title: "Type safety (tsgo --noEmit)", criticality: "critical", description: "Static type check passes with zero errors." },
  { id: "build", title: "Build health", criticality: "critical", description: "Production build succeeds without warnings that block release." },
  { id: "runtime", title: "Runtime health", criticality: "critical", description: "Worker-compatible runtime; no forbidden Node-only APIs." },
  { id: "security", title: "Security baseline", criticality: "critical", description: "RLS/GRANT enforced, no service-role client leakage." },
  { id: "governance", title: "Governance baseline", criticality: "critical", description: "Impact classification + human-in-loop enforced." },
  { id: "memory", title: "Memory health", criticality: "high", description: "Long-term memory evidence-linked; no PII leaks." },
  { id: "knowledge_graph", title: "Knowledge Graph health", criticality: "high", description: "Entity resolver + inferred edges marked." },
  { id: "world_model", title: "World Model health", criticality: "medium", description: "Digital twin readouts wired to sec_* tables." },
  { id: "agent_runtime", title: "Agent Runtime health", criticality: "high", description: "Scheduler + supervisor + recovery live." },
  { id: "tool_engine", title: "Tool Engine health", criticality: "high", description: "Universal tool router with sandbox + budget." },
  { id: "integration", title: "Integration readiness", criticality: "high", description: "Connectors registered; credentials vault Zero-Trust." },
  { id: "simulation", title: "Simulation readiness", criticality: "medium", description: "Deterministic sim engine with bilingual seed data." },
  { id: "executive_demo", title: "Executive Demo readiness", criticality: "high", description: "Executive Day Scenario runs 06:00–18:00." },
  { id: "aria_conversation", title: "ARIA conversation readiness", criticality: "critical", description: "Streaming reasoning with context anchors." },
  { id: "approval_workflow", title: "Approval workflow readiness", criticality: "critical", description: "Approval + override + escalation wired." },
  { id: "audit_trail", title: "Audit trail readiness", criticality: "critical", description: "Append-only audit across governance stages." },
  { id: "performance", title: "Performance baseline", criticality: "high", description: "Interactive p95 within pilot target." },
  { id: "error_handling", title: "Error handling", criticality: "high", description: "Typed failure envelopes; no naked throws surfaced." },
  { id: "fallback", title: "Fallback behavior", criticality: "high", description: "Unknown remains UNKNOWN; no fabricated fallback." },
];

export function checklistItem(id: GateId): ChecklistItem {
  const found = RC1_CHECKLIST.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown gate id: ${id}`);
  return found;
}
