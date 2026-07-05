/**
 * ARIA Self-Evolution Engine — public surface.
 *
 * Server-only. Import from callers:
 *   import { runSelfEvolution } from "@/lib/aria/self-evolution";
 *
 * This module is a THIN orchestrator. It composes existing engines and never
 * duplicates their logic:
 *   - `production/`         → readiness + release gate
 *   - `self-improvement/`   → evidence → gaps → proposals → recommendations
 *   - `evolution/`          → reflection, benchmarks, trends (available to callers)
 *
 * The engine NEVER autonomously mutates production code paths. Proposals are
 * surfaced as a manifest for the normal human review + deploy pipeline.
 */
export { runSelfEvolution } from "./engine.server";
export type { RunSelfEvolutionInput } from "./engine.server";
export type {
  EvolutionReport,
  EvolutionStage,
  EvolutionStageResult,
  EvolutionStatus,
  EvolutionIssue,
  EvolutionInvariants,
} from "./types";
