// Deterministic mesh routing. No routing loops (single-hop selection).
import type { LoadStrategy, MeshNode, RouteDecision, RouteRequest } from "./types";
import { LoadStrategyZ, RouteRequestZ } from "./contracts";

function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface RouterState {
  readonly rrCursor: number;
}

export function selectRoute(
  strategy: LoadStrategy,
  candidates: ReadonlyArray<MeshNode>,
  request: RouteRequest,
  state: RouterState,
): { decision: RouteDecision; state: RouterState } {
  const parsedStrategy = LoadStrategyZ.parse(strategy);
  const parsedReq = RouteRequestZ.parse(request);
  const eligible = candidates.filter((n) => n.status === "active");

  if (eligible.length === 0) {
    return {
      decision: {
        messageId: parsedReq.messageId,
        nodeId: null,
        capability: parsedReq.capability,
        strategy: parsedStrategy,
        reason: "no_active_nodes",
        evidence: [],
      },
      state,
    };
  }

  let picked: MeshNode | null = null;
  let nextState = state;

  switch (parsedStrategy) {
    case "round_robin": {
      const idx = state.rrCursor % eligible.length;
      picked = eligible[idx];
      nextState = { rrCursor: (state.rrCursor + 1) >>> 0 };
      break;
    }
    case "least_loaded":
      picked = [...eligible].sort(
        (a, b) => a.load - b.load || a.id.localeCompare(b.id),
      )[0];
      break;
    case "hash": {
      const k = parsedReq.key ?? parsedReq.messageId;
      picked = eligible[hash(k) % eligible.length];
      break;
    }
    case "capability_affinity": {
      const affine = eligible.filter((n) =>
        n.capabilities.includes(parsedReq.capability),
      );
      const pool = affine.length > 0 ? affine : eligible;
      picked = [...pool].sort(
        (a, b) => a.load - b.load || a.id.localeCompare(b.id),
      )[0];
      break;
    }
    case "unknown":
    default:
      return {
        decision: {
          messageId: parsedReq.messageId,
          nodeId: null,
          capability: parsedReq.capability,
          strategy: "unknown",
          reason: "unknown_strategy",
          evidence: [],
        },
        state,
      };
  }

  return {
    decision: {
      messageId: parsedReq.messageId,
      nodeId: picked?.id ?? null,
      capability: parsedReq.capability,
      strategy: parsedStrategy,
      reason: picked ? "selected" : "no_candidate",
      evidence: [],
    },
    state: nextState,
  };
}
