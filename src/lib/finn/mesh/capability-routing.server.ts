// Capability-aware routing. Delegates to routing selector after capability filter.
import type {
  CapabilityRegistry,
  LoadStrategy,
  MeshNode,
  RouteDecision,
  RouteRequest,
} from "./types";
import { findByCapability } from "./registry.server";
import { selectRoute, type RouterState } from "./routing.server";

export function routeByCapability(input: {
  request: RouteRequest;
  registry: CapabilityRegistry;
  nodes: ReadonlyArray<MeshNode>;
  strategy: LoadStrategy;
  state: RouterState;
}): { decision: RouteDecision; state: RouterState } {
  const descriptors = findByCapability(input.registry, input.request.capability);
  if (descriptors.length === 0) {
    return {
      decision: {
        messageId: input.request.messageId,
        nodeId: null,
        capability: input.request.capability,
        strategy: input.strategy,
        reason: "capability_not_registered",
        evidence: [],
      },
      state: input.state,
    };
  }
  const nodeIds = new Set(descriptors.map((d) => d.nodeId));
  const candidates = input.nodes.filter((n) => nodeIds.has(n.id));
  return selectRoute(input.strategy, candidates, input.request, input.state);
}
