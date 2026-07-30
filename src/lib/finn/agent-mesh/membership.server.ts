// Membership view — deterministic snapshot with quorum-derived leader when caller supplies vote.
import type { MembershipView, MeshNode } from "./types";
import { MembershipInputZ } from "./contracts";

export function computeMembership(input: {
  clusterId: string;
  nodes: ReadonlyArray<MeshNode>;
  leaderId: string | null;
  term: number;
  quorum: number;
  generatedAt: string;
}): MembershipView {
  const members = input.nodes
    .filter((n) => n.status === "active" || n.status === "joining")
    .map((n) => n.id)
    .sort();
  const leaderId = input.leaderId && members.includes(input.leaderId) ? input.leaderId : null;
  return MembershipInputZ.parse({
    clusterId: input.clusterId,
    members,
    leaderId,
    term: input.term,
    quorum: input.quorum,
    generatedAt: input.generatedAt,
  });
}

export function membershipQuorumMet(view: MembershipView): boolean {
  return view.members.length >= view.quorum;
}
