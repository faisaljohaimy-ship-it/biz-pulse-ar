/**
 * Phase 9.2 — Planner binding registration. The runtime does not plan;
 * it delegates to the Planning layer via the registered binding.
 */

import { bind, unbind, getBinding, isBound } from "./bindings.server";

export interface PlannerBinding {
  describe(): { name: string; version: string };
  supports(policy: string): boolean;
}

export function bindPlanner(planner: PlannerBinding): void {
  bind("planner", planner);
}

export function unbindPlanner(): void {
  unbind("planner");
}

export function getPlanner(): PlannerBinding | null {
  return getBinding<PlannerBinding>("planner");
}

export function isPlannerBound(): boolean {
  return isBound("planner");
}
