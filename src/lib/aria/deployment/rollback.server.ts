// Rollback planner between release channels.
import type { RollbackPlan } from "./types";
import { RollbackInputZ } from "./contracts";

const SAFE_TRANSITIONS: ReadonlyArray<[string, string]> = [
  ["canary", "stable"],
  ["beta", "stable"],
  ["stable", "rollback"],
  ["canary", "rollback"],
  ["beta", "rollback"],
];

export function planRollback(input: {
  fromChannel: RollbackPlan["fromChannel"];
  toChannel: RollbackPlan["toChannel"];
  reason: string;
  evidence?: RollbackPlan["evidence"];
}): RollbackPlan {
  const parsed = RollbackInputZ.parse(input);
  const safe = SAFE_TRANSITIONS.some(
    ([f, t]) => f === parsed.fromChannel && t === parsed.toChannel,
  );
  const steps: string[] = safe
    ? [
        `drain traffic on ${parsed.fromChannel}`,
        `promote ${parsed.toChannel}`,
        `flip load-balancer to ${parsed.toChannel}`,
        `verify probes on ${parsed.toChannel}`,
      ]
    : [`transition ${parsed.fromChannel}->${parsed.toChannel} not in safe matrix`];
  return {
    fromChannel: parsed.fromChannel,
    toChannel: parsed.toChannel,
    reason: parsed.reason,
    steps,
    safe,
    evidence: parsed.evidence,
  };
}
