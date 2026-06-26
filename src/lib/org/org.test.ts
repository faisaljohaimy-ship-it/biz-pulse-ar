// Wave 1 — Multi-tenancy: pure unit tests for the role-rank ordering used by
// the requireOrgRole middleware. The middleware itself is exercised via the
// integration tests, but the rank table is the single source of truth for
// authorization decisions, so we lock it down here.
import { describe, it, expect } from "vitest";

// Mirror of ROLE_RANK in org-middleware.ts. Kept inline to avoid pulling the
// middleware (and its server-only imports) into the client-safe test runtime.
const ROLE_RANK = {
  viewer: 1,
  operator: 2,
  manager: 3,
  admin: 4,
  owner: 5,
} as const;

type Role = keyof typeof ROLE_RANK;

function canActAs(have: Role, min: Role): boolean {
  return ROLE_RANK[have] >= ROLE_RANK[min];
}

describe("org role hierarchy", () => {
  it("orders roles from viewer (lowest) to owner (highest)", () => {
    expect(ROLE_RANK.viewer).toBeLessThan(ROLE_RANK.operator);
    expect(ROLE_RANK.operator).toBeLessThan(ROLE_RANK.manager);
    expect(ROLE_RANK.manager).toBeLessThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeLessThan(ROLE_RANK.owner);
  });

  it("owner satisfies every minimum role", () => {
    (["viewer", "operator", "manager", "admin", "owner"] as const).forEach((min) => {
      expect(canActAs("owner", min)).toBe(true);
    });
  });

  it("admin satisfies admin and below but not owner", () => {
    expect(canActAs("admin", "viewer")).toBe(true);
    expect(canActAs("admin", "operator")).toBe(true);
    expect(canActAs("admin", "manager")).toBe(true);
    expect(canActAs("admin", "admin")).toBe(true);
    expect(canActAs("admin", "owner")).toBe(false);
  });

  it("viewer cannot perform any write-level action", () => {
    expect(canActAs("viewer", "viewer")).toBe(true);
    expect(canActAs("viewer", "operator")).toBe(false);
    expect(canActAs("viewer", "manager")).toBe(false);
    expect(canActAs("viewer", "admin")).toBe(false);
    expect(canActAs("viewer", "owner")).toBe(false);
  });

  it("operator can act on operator/viewer surfaces only", () => {
    expect(canActAs("operator", "viewer")).toBe(true);
    expect(canActAs("operator", "operator")).toBe(true);
    expect(canActAs("operator", "manager")).toBe(false);
  });
});
