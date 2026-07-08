// Broadcast planner — deterministic fanout excluding sender.
import type { BroadcastPlan, MeshNode } from "./types";

export function planBroadcast(input: {
  messageId: string;
  fromNodeId: string;
  nodes: ReadonlyArray<MeshNode>;
  fanout?: number;
}): BroadcastPlan {
  const active = input.nodes
    .filter((n) => n.status === "active" && n.id !== input.fromNodeId)
    .map((n) => n.id)
    .sort();
  const fanout =
    input.fanout && input.fanout > 0 ? Math.min(input.fanout, active.length) : active.length;
  const targets = active.slice(0, fanout);
  return {
    messageId: input.messageId,
    targets,
    fanout,
    reason: active.length === 0 ? "no_targets" : "fanout_computed",
  };
}
