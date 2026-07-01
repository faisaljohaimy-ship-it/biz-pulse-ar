// Capability map — computed from agent registry. Deterministic.
import type { AgentDescriptor, CapabilityBinding, CapabilityMap } from "./types";

export function buildCapabilityMap(
  agents: ReadonlyArray<AgentDescriptor>,
): CapabilityMap {
  const entries: CapabilityBinding[] = [];
  for (const a of agents) {
    for (const cap of a.capabilities) {
      entries.push({
        capability: cap,
        agentId: a.agentId,
        nodeId: a.nodeId,
        weight: a.status === "available" ? 1 : a.status === "busy" ? 0.25 : 0,
      });
    }
  }
  entries.sort(
    (x, y) =>
      x.capability.localeCompare(y.capability) ||
      x.nodeId.localeCompare(y.nodeId) ||
      x.agentId.localeCompare(y.agentId),
  );
  return { entries };
}

export function bindingsFor(
  map: CapabilityMap,
  capability: string,
): ReadonlyArray<CapabilityBinding> {
  return map.entries.filter((e) => e.capability === capability);
}
