/**
 * Dependency graph — cycle detection + topological ordering.
 * Pure. Reused during install-time validation and load ordering.
 */
import type { AgentId } from "../orchestrator/types";
import type { AgentManifest } from "./types";

export interface DependencyGraph {
  nodes: AgentId[];
  edges: Map<AgentId, AgentId[]>;
}

export function buildGraph(manifests: AgentManifest[]): DependencyGraph {
  const nodes = manifests.map((m) => m.id);
  const edges = new Map<AgentId, AgentId[]>();
  for (const m of manifests) edges.set(m.id, [...m.dependencies]);
  return { nodes, edges };
}

/** Returns cycle path when a cycle exists, else null. */
export function findCycle(graph: DependencyGraph): AgentId[] | null {
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<AgentId, number>();
  const parent = new Map<AgentId, AgentId | null>();
  for (const n of graph.nodes) {
    color.set(n, WHITE);
    parent.set(n, null);
  }
  let cycle: AgentId[] | null = null;
  const dfs = (u: AgentId): void => {
    if (cycle) return;
    color.set(u, GRAY);
    for (const v of graph.edges.get(u) ?? []) {
      if (color.get(v) === undefined) continue;
      if (color.get(v) === WHITE) {
        parent.set(v, u);
        dfs(v);
      } else if (color.get(v) === GRAY) {
        const path: AgentId[] = [v];
        let cur: AgentId | null = u;
        while (cur && cur !== v) {
          path.push(cur);
          cur = parent.get(cur) ?? null;
        }
        path.push(v);
        cycle = path.reverse();
        return;
      }
    }
    color.set(u, BLACK);
  };
  for (const n of graph.nodes) if (color.get(n) === WHITE) dfs(n);
  return cycle;
}

export function topologicalOrder(graph: DependencyGraph): AgentId[] {
  const indeg = new Map<AgentId, number>();
  for (const n of graph.nodes) indeg.set(n, 0);
  for (const [, deps] of graph.edges) for (const d of deps) indeg.set(d, (indeg.get(d) ?? 0) + 1);
  const queue: AgentId[] = [];
  for (const [n, d] of indeg) if (d === 0) queue.push(n);
  const order: AgentId[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    order.push(n);
    for (const d of graph.edges.get(n) ?? []) {
      indeg.set(d, (indeg.get(d) ?? 1) - 1);
      if ((indeg.get(d) ?? 0) === 0) queue.push(d);
    }
  }
  return order.reverse(); // dependencies first
}
