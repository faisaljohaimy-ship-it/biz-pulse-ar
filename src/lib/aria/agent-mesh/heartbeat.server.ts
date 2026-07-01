// Heartbeat classifier — deterministic freshness → suspect / unreachable.
import type { HeartbeatObservation, MeshNode, NodeStatus } from "./types";
import { markStatus } from "./node-registry.server";

export interface Thresholds {
  readonly suspectMs: number;
  readonly unreachableMs: number;
}

export interface HeartbeatDelta {
  readonly nodeId: string;
  readonly previous: NodeStatus;
  readonly next: NodeStatus;
  readonly ageMs: number | null;
}

export function classifyHeartbeat(
  node: MeshNode,
  now: string,
  thresholds: Thresholds,
): HeartbeatDelta {
  if (!node.lastHeartbeatAt) {
    return { nodeId: node.id, previous: node.status, next: "unknown", ageMs: null };
  }
  const age = Date.parse(now) - Date.parse(node.lastHeartbeatAt);
  let next: NodeStatus = "active";
  if (age > thresholds.unreachableMs) next = "unreachable";
  else if (age > thresholds.suspectMs) next = "suspect";
  return { nodeId: node.id, previous: node.status, next, ageMs: age };
}

export function applyDelta(node: MeshNode, delta: HeartbeatDelta): MeshNode {
  if (delta.nodeId !== node.id || delta.next === node.status) return node;
  return markStatus(node, delta.next);
}

export function toObservation(node: MeshNode): HeartbeatObservation | null {
  if (!node.lastHeartbeatAt) return null;
  return { nodeId: node.id, at: node.lastHeartbeatAt, load: node.load, rttMs: null };
}
