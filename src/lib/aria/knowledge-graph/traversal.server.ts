/**
 * Breadth-first traversal.
 *
 * Traverses outgoing edges from a root entity up to `max_depth`. Every
 * visited node is evidence-backed. Cycles are prevented by a visited
 * set. Traversal never invents nodes or edges.
 */

import { getEntity, listRelationships } from "./graph-store.server";
import type {
  RelationshipRecord,
  TraversalNode,
  TraversalReport,
} from "./types";

function reportId(root_id: string, ts: string, depth: number): string {
  let h = 5381;
  const seed = `trv|${root_id}|${depth}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `trv_${(h >>> 0).toString(16)}`;
}

export interface TraversalOptions {
  readonly max_depth: number;
  readonly follow_stale?: boolean;
}

export function traverse(root_id: string, opts: TraversalOptions): TraversalReport {
  const created_at = new Date().toISOString();
  const root = getEntity(root_id);
  if (!root) {
    return Object.freeze({
      id: reportId(root_id, created_at, opts.max_depth),
      created_at,
      root_id,
      max_depth: opts.max_depth,
      visited: Object.freeze([]) as readonly TraversalNode[],
      edges: Object.freeze([]) as readonly RelationshipRecord[],
    });
  }

  const visited = new Map<string, TraversalNode>();
  visited.set(root.id, { entity: root, depth: 0, path: [root.id] });
  const edges: RelationshipRecord[] = [];
  const queue: TraversalNode[] = [{ entity: root, depth: 0, path: [root.id] }];
  const workspace_id = root.workspace_id;
  const relationships = listRelationships(workspace_id).filter(
    (r) => opts.follow_stale || r.freshness !== "stale",
  );

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= opts.max_depth) continue;
    for (const rel of relationships) {
      if (rel.from_id !== current.entity.id) continue;
      edges.push(rel);
      if (visited.has(rel.to_id)) continue;
      const next = getEntity(rel.to_id);
      if (!next) continue;
      const node: TraversalNode = Object.freeze({
        entity: next,
        depth: current.depth + 1,
        path: Object.freeze([...current.path, next.id]) as readonly string[],
      });
      visited.set(next.id, node);
      queue.push(node);
    }
  }

  return Object.freeze({
    id: reportId(root_id, created_at, opts.max_depth),
    created_at,
    root_id,
    max_depth: opts.max_depth,
    visited: Object.freeze([...visited.values()]) as readonly TraversalNode[],
    edges: Object.freeze(edges) as readonly RelationshipRecord[],
  });
}
