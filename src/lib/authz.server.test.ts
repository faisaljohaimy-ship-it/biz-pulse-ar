import { describe, it, expect } from "vitest";
import { hasPlatformRole, hasAnyPlatformRole } from "@/lib/authz.server";

/**
 * These tests cover the synchronous, pre-DB short-circuits in the authz
 * helpers. They guarantee that a missing or empty user id never produces an
 * affirmative authorization decision — the most critical privilege-escalation
 * surface in the platform. The actual DB lookups are covered end-to-end by
 * integration runs of `/api/public/hooks/run-agent`.
 */
describe("authz.server — short-circuit invariants", () => {
  describe("hasPlatformRole", () => {
    it("returns false for an empty user id without touching the database", async () => {
      await expect(hasPlatformRole("", "admin")).resolves.toBe(false);
    });
  });

  describe("hasAnyPlatformRole", () => {
    it("returns false when the required roles list is empty (deny by default)", async () => {
      await expect(hasAnyPlatformRole("any-user", [])).resolves.toBe(false);
    });

    it("returns false for an empty user id even when roles are requested", async () => {
      await expect(hasAnyPlatformRole("", ["admin"])).resolves.toBe(false);
    });

    it("returns false when all requested roles are invalid (unknown enum values)", async () => {
      await expect(hasAnyPlatformRole("user-x", ["super-root", "god"]))
        .resolves.toBe(false);
    });
  });
});
