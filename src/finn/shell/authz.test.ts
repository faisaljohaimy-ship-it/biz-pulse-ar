import { describe, expect, it } from "vitest";
import { assertCanDecideProposal, canCreateProposal, canDecideProposal, type Actor } from "./authz";

const actor = (over: Partial<Actor> = {}): Actor => ({
  userId: "u1",
  appRoles: [],
  orgRole: null,
  orgId: "org-1",
  ...over,
});

describe("FINN shell — proposal authz (ADMIN_ONLY_APPROVAL)", () => {
  it("admin inside the org: final approval ALLOWED", () => {
    const a = actor({ appRoles: ["admin"], orgRole: "admin" });
    expect(canDecideProposal(a, "org-1")).toBe(true);
    expect(() => assertCanDecideProposal(a, "org-1")).not.toThrow();
  });

  it("manager only: final approval DENIED, but may author/track", () => {
    const a = actor({ appRoles: [], orgRole: "manager" });
    expect(canDecideProposal(a, "org-1")).toBe(false);
    expect(canCreateProposal(a)).toBe(true);
    expect(() => assertCanDecideProposal(a, "org-1")).toThrow(/admin/);
  });

  it("employee / operator / viewer: DENIED for both decide and create", () => {
    for (const orgRole of ["operator", "viewer"] as const) {
      const a = actor({ appRoles: [], orgRole });
      expect(canDecideProposal(a, "org-1")).toBe(false);
      expect(canCreateProposal(a)).toBe(false);
    }
    // "member" app_role without manager org role is also denied.
    const member = actor({ appRoles: ["member"], orgRole: "viewer" });
    expect(canDecideProposal(member, "org-1")).toBe(false);
    expect(canCreateProposal(member)).toBe(false);
  });

  it("admin from ANOTHER org: cross-org final approval DENIED", () => {
    const a = actor({ appRoles: ["admin"], orgRole: "admin", orgId: "org-2" });
    expect(canDecideProposal(a, "org-1")).toBe(false);
    expect(() => assertCanDecideProposal(a, "org-1")).toThrow();
  });

  it("no session (userId null): DENIED for decide and create", () => {
    const a = actor({ userId: null, appRoles: ["admin"], orgRole: "admin" });
    expect(canDecideProposal(a, "org-1")).toBe(false);
    expect(canCreateProposal(a)).toBe(false);
  });

  it("manager is never promoted to admin for a global (org-less) proposal", () => {
    const manager = actor({ appRoles: [], orgRole: "manager", orgId: null });
    expect(canDecideProposal(manager)).toBe(false);
    const admin = actor({ appRoles: ["admin"], orgRole: "admin", orgId: null });
    expect(canDecideProposal(admin)).toBe(true);
  });
});
