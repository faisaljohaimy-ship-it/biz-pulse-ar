/**
 * Dependency graph builder for a MissionTree. Planning-only — never
 * executes anything. Produces topological layers + critical path.
 *
 * Default edge policy: sibling atomic nodes under the same parent run
 * in parallel; children of a shared parent depend on their parent's
 * upstream siblings' order in the source utterance. Explicit "then/ثم"
 * connectors already produced subtask ordering during decomposition;
 * we honor that by adding an edge from every atomic under subtask N
 * to every atomic under subtask N+1 in the same task.
 */
import type {
  ExecutionEdge,
  ExecutionGraph,
  MissionTree,
} from "./types";

function nodesByParent(tree: MissionTree, parentId: string): string[] {
  return tree.nodes[parentId]?.children_ids ?? [];
}

export function buildDependencyGraph(tree: MissionTree): ExecutionGraph {
  const atomicIds = tree.atomic_ids;
  const edges: ExecutionEdge[] = [];

  // Serial ordering across subtasks under the same task.
  for (const nodeId of Object.keys(tree.nodes)) {
    const node = tree.nodes[nodeId];
    if (node.kind !== "task") continue;
    const subtasks = nodesByParent(tree, node.id)
      .map((cid) => tree.nodes[cid])
      .filter((n) => n.kind === "subtask");
    for (let i = 0; i < subtasks.length - 1; i++) {
      const cur = subtasks[i];
      const nxt = subtasks[i + 1];
      const curAtomics = nodesByParent(tree, cur.id).filter(
        (id) => tree.nodes[id].kind === "atomic",
      );
      const nxtAtomics = nodesByParent(tree, nxt.id).filter(
        (id) => tree.nodes[id].kind === "atomic",
      );
      for (const a of curAtomics) {
        for (const b of nxtAtomics) {
          edges.push({
            from: a,
            to: b,
            reason:
              "Subtask sequencing (explicit then/ثم/and connector).",
          });
        }
      }
    }
  }

  // Topological layering (Kahn) over atomic nodes only.
  const indeg = new Map<string, number>();
  const outs = new Map<string, string[]>();
  for (const id of atomicIds) {
    indeg.set(id, 0);
    outs.set(id, []);
  }
  for (const e of edges) {
    if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
    outs.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  const layers: string[][] = [];
  const consumed = new Set<string>();
  while (consumed.size < atomicIds.length) {
    const layer: string[] = [];
    for (const id of atomicIds) {
      if (consumed.has(id)) continue;
      if ((indeg.get(id) ?? 0) === 0) layer.push(id);
    }
    if (!layer.length) {
      // Cycle — break by flushing the rest so verification can flag it.
      const remaining = atomicIds.filter((id) => !consumed.has(id));
      layers.push(remaining);
      remaining.forEach((id) => consumed.add(id));
      break;
    }
    layers.push(layer);
    for (const id of layer) {
      consumed.add(id);
      for (const nxt of outs.get(id) ?? []) {
        indeg.set(nxt, (indeg.get(nxt) ?? 1) - 1);
      }
    }
  }

  // Critical path: longest path by edge count in the DAG.
  const memo = new Map<string, string[]>();
  const longest = (id: string): string[] => {
    const cached = memo.get(id);
    if (cached) return cached;
    const outsFor = outs.get(id) ?? [];
    if (!outsFor.length) {
      const p = [id];
      memo.set(id, p);
      return p;
    }
    let best: string[] = [];
    for (const nxt of outsFor) {
      const p = longest(nxt);
      if (p.length > best.length) best = p;
    }
    const path = [id, ...best];
    memo.set(id, path);
    return path;
  };
  let critical: string[] = [];
  for (const id of atomicIds) {
    const p = longest(id);
    if (p.length > critical.length) critical = p;
  }

  return {
    nodes: atomicIds,
    edges,
    layers,
    critical_path: critical,
  };
}

/** Cycle detection helper for verification. */
export function detectCycle(graph: ExecutionGraph): string[] | null {
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) {
    color.set(n, WHITE);
    parent.set(n, null);
    adj.set(n, []);
  }
  for (const e of graph.edges) adj.get(e.from)?.push(e.to);
  let cycle: string[] | null = null;
  const dfs = (u: string): void => {
    if (cycle) return;
    color.set(u, GRAY);
    for (const v of adj.get(u) ?? []) {
      if (color.get(v) === WHITE) {
        parent.set(v, u);
        dfs(v);
      } else if (color.get(v) === GRAY) {
        const path: string[] = [v];
        let cur: string | null = u;
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
