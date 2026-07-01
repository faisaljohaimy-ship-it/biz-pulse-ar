/**
 * Phase 10.0 — Deterministic RC1 test plan.
 */
import type { TestCase, TestPlan } from "./types";

const CASES: ReadonlyArray<TestCase> = [
  { id: "smk-001", gate: "aria_os", kind: "smoke", title: "ARIA OS kernel initializes", required: true },
  { id: "smk-002", gate: "planning", kind: "smoke", title: "Planner produces plan for objective", required: true },
  { id: "smk-003", gate: "execution", kind: "smoke", title: "Execution engine dispatches step", required: true },
  { id: "smk-004", gate: "task_bus", kind: "smoke", title: "Task bus accepts and routes task", required: true },
  { id: "smk-005", gate: "runtime", kind: "smoke", title: "Agent runtime schedules agent", required: true },
  { id: "smk-006", gate: "tools", kind: "smoke", title: "Tool registry executes validated call", required: true },
  { id: "smk-007", gate: "memory", kind: "smoke", title: "Long-term memory writes and reads", required: true },
  { id: "smk-008", gate: "knowledge_graph", kind: "smoke", title: "Knowledge graph upserts entity", required: true },
  { id: "smk-009", gate: "world_model", kind: "smoke", title: "World model responds to query", required: false },
  { id: "smk-010", gate: "marketplace", kind: "smoke", title: "Marketplace lists installed skills", required: false },
  { id: "int-001", gate: "governance", kind: "integration", title: "High-impact action requires approval", required: true },
  { id: "int-002", gate: "governance", kind: "integration", title: "Compliance rule blocks disallowed action", required: true },
  { id: "int-003", gate: "execution", kind: "integration", title: "Plan → dispatch → audit round-trip", required: true },
  { id: "e2e-001", gate: "error_handling", kind: "e2e", title: "Failed step surfaces error to executive dock", required: true },
  { id: "e2e-002", gate: "error_handling", kind: "e2e", title: "Recovery orchestrator retries transient failure", required: true },
  { id: "reg-001", gate: "aria_os", kind: "regression", title: "Prior OS APIs unchanged", required: true },
  { id: "reg-002", gate: "governance", kind: "regression", title: "Governance impact classifier deterministic", required: true },
];

export function buildTestPlan(): TestPlan {
  return { cases: CASES, generated_at: new Date().toISOString() };
}
