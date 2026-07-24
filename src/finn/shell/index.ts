/**
 * NEXIOS FINN Shell — public entry.
 *
 * The advisory capability layer: a single-source catalog (12 skills + 5 agents),
 * a deterministic selection engine, telemetry, bounded self-adaptation, an eval
 * runner, and a boundary guard that forbids core writes and disabled tool calls.
 * This module is the shell's only public surface.
 */
export * from "./types";
export { SHELL_CONFIG, HUMAN_GATE_ACTIONS, type BoundedParam } from "./config";
export { SKILLS, AGENTS } from "./registry/capabilities";
export {
  buildIndex,
  selectSkills,
  requiresHumanGate,
  getSkill,
  getAgent,
  CAPABILITY_IDS,
  type RegistryIndex,
} from "./registry";
export {
  assertShellWrite,
  assertToolCallable,
  isShellTable,
  CoreWriteForbiddenError,
  SHELL_TABLES,
  type DbOp,
} from "./shell";
export { buildRun, recordRun, hashTask, type RunInput, type ShellWriter } from "./telemetry";
export {
  decideAdaptation,
  clampParam,
  isAdaptableScope,
  isRegression,
  type EvalMetrics,
  type AdaptDecision,
} from "./adapt";
export { runEvals, type EvalOutcome, type CaseResult } from "./evals/runner";
export { EVAL_CASES, type EvalCase } from "./evals/cases";
