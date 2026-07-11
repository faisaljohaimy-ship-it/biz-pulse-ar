/**
 * Learn decision scenarios — public API. Data split across scenarios.a/b.ts;
 * this module re-exports the types and the merged record so consumers keep a
 * single import surface.
 */
export * from "./scenarios.types";
import type { DecisionScenario } from "./scenarios.types";
import { SCENARIOS_A } from "./scenarios.a";
import { SCENARIOS_B } from "./scenarios.b";

export const DECISION_SCENARIOS: Record<string, DecisionScenario> = {
  ...SCENARIOS_A,
  ...SCENARIOS_B,
};
