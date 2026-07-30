// Peer awareness — RTT / reachability book-keeping.
import type { EvidenceRef, Peer, PeerReachability } from "./types";

export function createPeer(input: {
  nodeId: string;
  reachability?: PeerReachability;
  rttMs?: number | null;
  lastSeenAt?: string | null;
  evidence?: ReadonlyArray<EvidenceRef>;
}): Peer {
  return {
    nodeId: input.nodeId,
    reachability: input.reachability ?? "unknown",
    rttMs: input.rttMs ?? null,
    lastSeenAt: input.lastSeenAt ?? null,
    evidence: input.evidence ?? [],
  };
}

export function observePeer(
  peer: Peer,
  obs: { rttMs: number | null; at: string; reachable: boolean },
): Peer {
  return {
    ...peer,
    reachability: obs.reachable ? "reachable" : "unreachable",
    rttMs: obs.rttMs,
    lastSeenAt: obs.reachable ? obs.at : peer.lastSeenAt,
  };
}
