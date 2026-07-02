// Pilot scope definition — validated + evidence-linked.
import type { PilotScope } from "./types";
import { PilotScopeZ } from "./contracts";

export function definePilotScope(input: PilotScope): PilotScope {
  const parsed = PilotScopeZ.parse(input);
  if (Date.parse(parsed.endDate) < Date.parse(parsed.startDate)) {
    throw new Error("pilot scope: endDate must be after startDate");
  }
  return {
    ...parsed,
    excludedCapabilities: parsed.excludedCapabilities ?? [],
  };
}
