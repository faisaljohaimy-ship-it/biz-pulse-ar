// Deterministic load balancing across ready nodes.
import type { ClusterNode, Job, LoadStrategy, RoutingDecision } from "./types";
import { JobZ, LoadStrategyZ } from "./contracts";

function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface BalancerState {
  readonly rrCursor: number;
}

export function pickNode(
  strategy: LoadStrategy,
  nodes: ReadonlyArray<ClusterNode>,
  job: Job,
  state: BalancerState,
): { decision: RoutingDecision; state: BalancerState } {
  const parsedStrategy = LoadStrategyZ.parse(strategy);
  const parsedJob = JobZ.parse(job);
  const eligible = nodes.filter((n) => n.status === "ready" && n.capacity > 0);

  if (eligible.length === 0) {
    return {
      decision: {
        jobId: parsedJob.id,
        nodeId: null,
        strategy: parsedStrategy,
        reason: "no_ready_nodes",
        evidence: [],
      },
      state,
    };
  }

  let picked: ClusterNode | null = null;
  let nextState = state;

  switch (parsedStrategy) {
    case "round_robin": {
      const idx = state.rrCursor % eligible.length;
      picked = eligible[idx];
      nextState = { rrCursor: (state.rrCursor + 1) >>> 0 };
      break;
    }
    case "least_loaded": {
      picked = [...eligible].sort((a, b) => a.load - b.load)[0];
      break;
    }
    case "hash":
    case "sticky": {
      const key = parsedJob.key ?? parsedJob.id;
      const idx = hash(key) % eligible.length;
      picked = eligible[idx];
      break;
    }
    case "unknown":
    default: {
      return {
        decision: {
          jobId: parsedJob.id,
          nodeId: null,
          strategy: "unknown",
          reason: "unknown_strategy",
          evidence: [],
        },
        state,
      };
    }
  }

  return {
    decision: {
      jobId: parsedJob.id,
      nodeId: picked?.id ?? null,
      strategy: parsedStrategy,
      reason: picked ? "selected" : "no_candidate",
      evidence: [],
    },
    state: nextState,
  };
}
