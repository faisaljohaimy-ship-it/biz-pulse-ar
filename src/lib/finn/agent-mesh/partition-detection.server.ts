// Partition detection. Unknown stays UNKNOWN.
import type { PartitionReport } from "./types";
import { PartitionInputZ } from "./contracts";

export function detectPartition(input: {
  reachable: ReadonlyArray<string>;
  unreachable: ReadonlyArray<string>;
  quorum: number;
  detectedAt: string;
  evidence?: PartitionReport["evidence"];
}): PartitionReport {
  const parsed = PartitionInputZ.parse({
    reachable: [...input.reachable],
    unreachable: [...input.unreachable],
    quorum: input.quorum,
    detectedAt: input.detectedAt,
    evidence: input.evidence ?? [],
  });
  const quorumMet = parsed.reachable.length >= parsed.quorum;
  let state: PartitionReport["state"] = "unknown";
  if (parsed.reachable.length + parsed.unreachable.length === 0) state = "unknown";
  else if (parsed.unreachable.length === 0) state = "healthy";
  else if (!quorumMet) state = "partitioned";
  else state = "at_risk";
  return {
    state,
    reachable: parsed.reachable,
    unreachable: parsed.unreachable,
    quorumMet,
    detectedAt: parsed.detectedAt,
    evidence: parsed.evidence,
  };
}

export function partitionSafeForExecution(report: PartitionReport): boolean {
  return report.state === "healthy" && report.quorumMet;
}
