// Discovery — deterministic seed-based bootstrap.
import type { EvidenceRef, MeshNode, Peer } from "./types";

export interface DiscoveryInput {
  readonly seeds: ReadonlyArray<string>; // node IDs bootstrap knows about
  readonly announced: ReadonlyArray<MeshNode>;
  readonly at: string;
  readonly evidence?: ReadonlyArray<EvidenceRef>;
}

export interface DiscoveryResult {
  readonly discoveredNodeIds: ReadonlyArray<string>;
  readonly peers: ReadonlyArray<Peer>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export function runDiscovery(input: DiscoveryInput): DiscoveryResult {
  const evidence = input.evidence ?? [];
  const seen = new Set<string>();
  const peers: Peer[] = [];
  for (const seed of input.seeds) {
    if (seen.has(seed)) continue;
    seen.add(seed);
  }
  for (const node of input.announced) {
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    peers.push({
      nodeId: node.id,
      reachability: "unknown",
      rttMs: null,
      lastSeenAt: node.lastHeartbeatAt,
      evidence,
    });
  }
  return {
    discoveredNodeIds: [...seen],
    peers,
    evidence,
  };
}
