/**
 * Planner — delegates to the existing `buildPlan` in planning-engine so
 * the Executive Brain reuses one canonical plan generator. Kept as a
 * thin wrapper to preserve a clean brain/*.server surface for callers.
 */
import { buildPlan, type ExecutionPlan } from "../planning-engine.server";
import type { AriaIntent } from "../executive-reasoning.server";

export function planForIntent(intent: AriaIntent): ExecutionPlan {
  return buildPlan(intent);
}

export type { ExecutionPlan };
