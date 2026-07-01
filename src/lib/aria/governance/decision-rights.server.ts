/**
 * Decision rights matrix — which kinds any authority may take unilaterally.
 */
import type { AuthorityLevel, DecisionKind } from "./types";
import { rankOf } from "./authority.server";

const MIN_RANK_FOR_KIND: Record<DecisionKind, AuthorityLevel> = {
  read: "agent",
  notify: "agent",
  recommend: "agent",
  write: "supervisor",
  external_call: "supervisor",
  user_facing: "manager",
  security_change: "manager",
  financial: "director",
  policy_change: "executive",
  unknown: "executive",
};

export function minAuthorityFor(kind: DecisionKind): AuthorityLevel {
  return MIN_RANK_FOR_KIND[kind];
}

export function canDecide(granted: AuthorityLevel, kind: DecisionKind): boolean {
  return rankOf(granted) >= rankOf(minAuthorityFor(kind));
}
