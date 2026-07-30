/**
 * Authority levels and required-authority lookup per impact level.
 */
import type { AuthorityLevel, AuthorityCheck, ImpactLevel } from "./types";

const RANK: Record<AuthorityLevel, number> = {
  agent: 1,
  supervisor: 2,
  manager: 3,
  director: 4,
  executive: 5,
  board: 6,
};

const REQUIRED: Record<ImpactLevel, AuthorityLevel> = {
  low: "agent",
  medium: "supervisor",
  high: "manager",
  critical: "executive",
  unknown: "executive",
};

export function requiredAuthorityFor(level: ImpactLevel): AuthorityLevel {
  return REQUIRED[level];
}

export function checkAuthority(
  granted: AuthorityLevel | null,
  impact: ImpactLevel,
): AuthorityCheck {
  const required = requiredAuthorityFor(impact);
  if (!granted) {
    return {
      required,
      granted: null,
      ok: false,
      reason: `authority not established (need ${required})`,
    };
  }
  const ok = RANK[granted] >= RANK[required];
  return {
    required,
    granted,
    ok,
    reason: ok
      ? `granted ${granted} ≥ required ${required}`
      : `granted ${granted} < required ${required}`,
  };
}

export function rankOf(a: AuthorityLevel): number {
  return RANK[a];
}
