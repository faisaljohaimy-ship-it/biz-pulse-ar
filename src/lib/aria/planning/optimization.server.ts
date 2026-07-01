/**
 * Plan optimizer — removes redundant edges, coalesces duplicate atomic
 * nodes by (capability + description), recomputes layers to maximize
 * parallelism, and reports the optimization gain vs the input graph.
 */
import type {
  CapabilityBinding,
  ExecutionEdge,
  ExecutionGraph,
  MissionTree,
} from "./types";

export interface OptimizationOutcome {
  graph: ExecutionGraph;
  tree: MissionTree;
  bindings: CapabilityBinding[];
  removed_edges: number;
  merged_nodes: number;
  parallelism_before: number;
  parallelism_after: number;
  gain: number;
  reasoning: string;
}

function widest(graph: ExecutionGraph): number {
  return graph.layers.reduce((m, l) => Math.max(m, l.length), 0);
}

function relayer(nodes: string[], edges: ExecutionEdge[]): string[][] {
  const indeg = new Map<string, number>();
  const outs = new Map<string, string[]>();
  for (const n of nodes) {
    indeg.set(n, 0);
    outs.set(n, []);
  }
  for (const e of edges) {
    if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
    outs.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }
  const layers: string[][] = [];
  const done = new Set<string>();
  while (done.size < nodes.length) {
    const layer = nodes.filter(
      (n) => !done.has(n) && (indeg.get(n) ?? 0) === 0,
    );
    if (!layer.length) {
      layers.push(nodes.filter((n) => !done.has(n)));
      break;
    }
    layers.push(layer);
    for (const n of layer) {
      done.add(n);
      for (const nxt of outs.get(n) ?? [])
        indeg.set(nxt, (indeg.get(nxt) ?? 1) - 1);
    }
  }
  return layers;
}

export function optimize(
  tree: MissionTree,
  graph: ExecutionGraph,
  bindings: CapabilityBinding[],
): OptimizationOutcome {
  const parallelismBefore = widest(graph);

  // 1. Dedupe edges.
  const seen = new Set<string>();
  const dedupEdges: ExecutionEdge[] = [];
  for (const e of graph.edges) {
    const k = `${e.from}->${e.to}`;
    if (seen.has(k)) continue;
    seen.add(k);
    dedupEdges.push(e);
  }
  const removedEdges = graph.edges.length - dedupEdges.length;

  // 2. Coalesce atomic nodes with identical (capability + normalized description).
  const canonical = new Map<string, string>(); // dupId → keptId
  const groups = new Map<string, string[]>();
  for (const id of tree.atomic_ids) {
    const n = tree.nodes[id];
    const key = `${n.capability ?? ""}::${n.description.trim().toLowerCase()}`;
    const arr = groups.get(key) ?? [];
    arr.push(id);
    groups.set(key, arr);
  }
  let mergedNodes = 0;
  for (const ids of groups.values()) {
    if (ids.length <= 1) continue;
    const keep = ids[0];
    for (let i = 1; i < ids.length; i++) {
      canonical.set(ids[i], keep);
      mergedNodes++;
    }
  }
  const keptAtomics = tree.atomic_ids.filter((id) => !canonical.has(id));
  const rewrittenEdges: ExecutionEdge[] = dedupEdges
    .map((e) => ({
      from: canonical.get(e.from) ?? e.from,
      to: canonical.get(e.to) ?? e.to,
      reason: e.reason,
    }))
    .filter((e) => e.from !== e.to);

  const nextTree: MissionTree = {
    ...tree,
    nodes: { ...tree.nodes },
    atomic_ids: keptAtomics,
  };
  for (const dupId of canonical.keys()) delete nextTree.nodes[dupId];

  const nextBindings = bindings.filter((b) => !canonical.has(b.node_id));

  const layers = relayer(keptAtomics, rewrittenEdges);

  // Critical path recompute (edge-count longest path).
  const outs = new Map<string, string[]>();
  for (const n of keptAtomics) outs.set(n, []);
  for (const e of rewrittenEdges) outs.get(e.from)?.push(e.to);
  const memo = new Map<string, string[]>();
  const longest = (id: string): string[] => {
    const cached = memo.get(id);
    if (cached) return cached;
    const nxts = outs.get(id) ?? [];
    if (!nxts.length) {
      memo.set(id, [id]);
      return [id];
    }
    let best: string[] = [];
    for (const n of nxts) {
      const p = longest(n);
      if (p.length > best.length) best = p;
    }
    const path = [id, ...best];
    memo.set(id, path);
    return path;
  };
  let critical: string[] = [];
  for (const id of keptAtomics) {
    const p = longest(id);
    if (p.length > critical.length) critical = p;
  }

  const nextGraph: ExecutionGraph = {
    nodes: keptAtomics,
    edges: rewrittenEdges,
    layers,
    critical_path: critical,
  };

  const parallelismAfter = widest(nextGraph);
  const gain =
    parallelismBefore === 0
      ? 0
      : (parallelismAfter - parallelismBefore) / parallelismBefore;

  return {
    graph: nextGraph,
    tree: nextTree,
    bindings: nextBindings,
    removed_edges: removedEdges,
    merged_nodes: mergedNodes,
    parallelism_before: parallelismBefore,
    parallelism_after: parallelismAfter,
    gain,
    reasoning:
      "Removed duplicate edges, coalesced identical atomic units by (capability + description), and re-layered via Kahn's algorithm.",
  };
}
