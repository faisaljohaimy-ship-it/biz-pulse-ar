// Load balancing — computed distribution stats.
import type { MeshNode, RouteDecision } from "./types";

export interface LoadDistribution {
  readonly perNodeCount: Readonly<Record<string, number>>;
  readonly maxNodeCount: number;
  readonly minNodeCount: number;
  readonly stddev: number;
}

export function measureDistribution(
  nodes: ReadonlyArray<MeshNode>,
  decisions: ReadonlyArray<RouteDecision>,
): LoadDistribution {
  const counts: Record<string, number> = {};
  for (const n of nodes) counts[n.id] = 0;
  for (const d of decisions) if (d.nodeId) counts[d.nodeId] = (counts[d.nodeId] ?? 0) + 1;
  const values = Object.values(counts);
  const max = values.length ? Math.max(...values) : 0;
  const min = values.length ? Math.min(...values) : 0;
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const stddev = values.length
    ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
    : 0;
  return { perNodeCount: counts, maxNodeCount: max, minNodeCount: min, stddev };
}
