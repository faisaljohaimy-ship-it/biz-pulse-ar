import { beforeEach, describe, expect, it } from "vitest";
import {
  allowIncidentDuringStorageOutage,
  INCIDENT_FALLBACK_MAX_BUCKETS,
  INCIDENT_FALLBACK_MAX_REQUESTS,
  INCIDENT_FALLBACK_WINDOW_MS,
  resetIncidentOutageBucketsForTests,
} from "./public-incident-limit.server";

describe("public incident fallback when the shared quota store is unavailable", () => {
  beforeEach(() => resetIncidentOutageBucketsForTests());

  it("allows no more than 60 requests per IP bucket per minute", () => {
    for (let i = 0; i < INCIDENT_FALLBACK_MAX_REQUESTS; i += 1) {
      expect(allowIncidentDuringStorageOutage("incident:ip-a", 1_000)).toBe(true);
    }
    expect(allowIncidentDuringStorageOutage("incident:ip-a", 1_000)).toBe(false);
    expect(allowIncidentDuringStorageOutage("incident:ip-a", 1_001)).toBe(false);
  });

  it("maintains separate buckets and resets only at the next window", () => {
    for (let i = 0; i < INCIDENT_FALLBACK_MAX_REQUESTS; i += 1) {
      allowIncidentDuringStorageOutage("incident:ip-a", 10_000);
    }
    expect(
      allowIncidentDuringStorageOutage("incident:ip-a", 10_000 + INCIDENT_FALLBACK_WINDOW_MS - 1),
    ).toBe(false);
    expect(allowIncidentDuringStorageOutage("incident:ip-b", 10_000)).toBe(true);
    expect(
      allowIncidentDuringStorageOutage("incident:ip-a", 10_000 + INCIDENT_FALLBACK_WINDOW_MS),
    ).toBe(true);
  });

  it("fails closed on new keys at capacity without resetting live bucket quotas", () => {
    for (let i = 0; i < INCIDENT_FALLBACK_MAX_BUCKETS; i += 1) {
      expect(allowIncidentDuringStorageOutage(`incident:key-${i}`, 1_000)).toBe(true);
    }
    expect(allowIncidentDuringStorageOutage("incident:new", 1_000)).toBe(false);
    for (let i = 1; i < INCIDENT_FALLBACK_MAX_REQUESTS; i += 1) {
      expect(allowIncidentDuringStorageOutage("incident:key-0", 1_000)).toBe(true);
    }
    expect(allowIncidentDuringStorageOutage("incident:key-0", 1_000)).toBe(false);
  });

  it("cannot reset an exhausted quota by spraying thousands of distinct bucket keys", () => {
    for (let i = 0; i < INCIDENT_FALLBACK_MAX_REQUESTS; i += 1) {
      expect(allowIncidentDuringStorageOutage("incident:target", 1_000)).toBe(true);
    }
    for (let i = 0; i < INCIDENT_FALLBACK_MAX_BUCKETS + 100; i += 1) {
      allowIncidentDuringStorageOutage(`incident:churn-${i}`, 1_000);
    }
    expect(allowIncidentDuringStorageOutage("incident:target", 1_000)).toBe(false);
  });

  it("reclaims expired quota windows before admitting new clients", () => {
    for (let i = 0; i < INCIDENT_FALLBACK_MAX_BUCKETS; i += 1) {
      expect(allowIncidentDuringStorageOutage(`incident:key-${i}`, 1_000)).toBe(true);
    }
    expect(allowIncidentDuringStorageOutage("incident:new", 1_000)).toBe(false);
    expect(
      allowIncidentDuringStorageOutage("incident:new", 1_000 + INCIDENT_FALLBACK_WINDOW_MS),
    ).toBe(true);
    expect(
      allowIncidentDuringStorageOutage("incident:key-0", 1_000 + INCIDENT_FALLBACK_WINDOW_MS),
    ).toBe(true);
  });
});
