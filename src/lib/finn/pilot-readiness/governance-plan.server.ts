// Governance plan.
import type { GovernancePlan } from "./types";
import { GovernancePlanZ } from "./contracts";

export function buildGovernancePlan(g: GovernancePlan): GovernancePlan {
  return GovernancePlanZ.parse(g);
}
