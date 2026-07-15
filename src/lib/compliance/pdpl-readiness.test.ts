import { describe, expect, it } from "vitest";
import { evaluatePdplReadiness, PDPL_REQUIRED_ENV } from "./pdpl-readiness.server";

const complete = {
  PDPL_CONTROLLER_NAME: "Example Controller",
  PDPL_CONTROLLER_REGISTRATION: "CR-123",
  PDPL_DPO_NAME: "Privacy Officer",
  PDPL_PRIVACY_CONTACT_EMAIL: "privacy@example.sa",
  PDPL_DATA_REGION: "Saudi Arabia",
  PDPL_DPA_REGISTER_STATUS: "approved",
  PDPL_ACCOUNT_ERASURE_DAYS: "30",
  PDPL_AUDIT_RETENTION_DAYS: "365",
  PDPL_OPERATIONAL_RETENTION_DAYS: "730",
  PDPL_BREACH_OWNER: "Incident Commander",
  PDPL_LEGAL_APPROVAL_REF: "LEGAL-2026-001",
};

describe("PDPL production readiness", () => {
  it("fails closed when legal/operator facts are absent", () => {
    const result = evaluatePdplReadiness({});
    expect(result.ready).toBe(false);
    expect(result.blockers).toHaveLength(PDPL_REQUIRED_ENV.length);
  });

  it("passes only with complete and valid operator facts", () => {
    const result = evaluatePdplReadiness(complete);
    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("rejects invalid email, DPA state, and retention windows", () => {
    const result = evaluatePdplReadiness({
      ...complete,
      PDPL_PRIVACY_CONTACT_EMAIL: "invalid",
      PDPL_DPA_REGISTER_STATUS: "pending",
      PDPL_AUDIT_RETENTION_DAYS: "0",
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("PDPL_PRIVACY_CONTACT_EMAIL"),
        expect.stringContaining("PDPL_DPA_REGISTER_STATUS"),
        expect.stringContaining("PDPL_AUDIT_RETENTION_DAYS"),
      ]),
    );
  });
});
