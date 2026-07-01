// Distributed scheduler — batches route requests without duplicate execution.
import type {
  CapabilityRegistry,
  LoadStrategy,
  MeshNode,
  RouteDecision,
  RouteRequest,
} from "./types";
import { routeByCapability } from "./capability-routing.server";
import type { RouterState } from "./routing.server";

export interface ScheduleResult {
  readonly decisions: ReadonlyArray<RouteDecision>;
  readonly state: RouterState;
}

export function scheduleBatch(input: {
  requests: ReadonlyArray<RouteRequest>;
  registry: CapabilityRegistry;
  nodes: ReadonlyArray<MeshNode>;
  strategy: LoadStrategy;
  state?: RouterState;
}): ScheduleResult {
  const seen = new Set<string>();
  const decisions: RouteDecision[] = [];
  let state: RouterState = input.state ?? { rrCursor: 0 };
  for (const req of input.requests) {
    if (seen.has(req.messageId)) {
      decisions.push({
        messageId: req.messageId,
        nodeId: null,
        capability: req.capability,
        strategy: input.strategy,
        reason: "duplicate_message_rejected",
        evidence: [],
      });
      continue;
    }
    seen.add(req.messageId);
    const { decision, state: next } = routeByCapability({
      request: req,
      registry: input.registry,
      nodes: input.nodes,
      strategy: input.strategy,
      state,
    });
    state = next;
    decisions.push(decision);
  }
  return { decisions, state };
}
