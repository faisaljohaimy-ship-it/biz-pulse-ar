// Heartbeat book-keeping — deterministic freshness classification.
import type { EvidenceRef, MeshNode, NodeStatus } from "./types";
import { markStatus } from "./node.server";

export interface HeartbeatDelta {
  readonly nodeId: string;
  readonly previous: NodeStatus;
  readonly next: NodeStatus;
  readonly ageMs: number | null;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export function classifyNode(
  node: MeshNode,
  now: string,
  thresholds: { suspectMs: number; unreachableMs: number },
): HeartbeatDelta {
  const evidence: EvidenceRef[] = [];
  if (!node.lastHeartbeatAt) {
    return {
      nodeId: node.id,
      previous: node.status,
      next: "unknown",
      ageMs: null,
      evidence,
    };
  }
  const age = Date.parse(now) - Date.parse(node.lastHeartbeatAt);
  let next: NodeStatus = "active";
  if (age > thresholds.unreachableMs) next = "unreachable";
  else if (age > thresholds.suspectMs) next = "suspect";
  return { nodeId: node.id, previous: node.status, next, ageMs: age, evidence };
}

export function applyClassification(node: MeshNode, delta: HeartbeatDelta): MeshNode {
  if (delta.nodeId !== node.id) return node;
  if (delta.next === node.status) return node;
  return markStatus(node, delta.next);
}
