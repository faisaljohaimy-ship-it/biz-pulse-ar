// Safe job routing — no unsafe duplication. Every job routed once per call.
import type { ClusterNode, Job, LoadStrategy, RoutingDecision } from "./types";
import { pickNode, type BalancerState } from "./load-balancer.server";

export interface RoutingResult {
  readonly decisions: ReadonlyArray<RoutingDecision>;
  readonly state: BalancerState;
}

export function routeJobs(
  jobs: ReadonlyArray<Job>,
  nodes: ReadonlyArray<ClusterNode>,
  strategy: LoadStrategy,
  state: BalancerState = { rrCursor: 0 },
): RoutingResult {
  const seen = new Set<string>();
  const decisions: RoutingDecision[] = [];
  let s = state;
  for (const job of jobs) {
    if (seen.has(job.id)) {
      decisions.push({
        jobId: job.id,
        nodeId: null,
        strategy,
        reason: "duplicate_job_rejected",
        evidence: [],
      });
      continue;
    }
    seen.add(job.id);
    const { decision, state: next } = pickNode(strategy, nodes, job, s);
    s = next;
    decisions.push(decision);
  }
  return { decisions, state: s };
}
