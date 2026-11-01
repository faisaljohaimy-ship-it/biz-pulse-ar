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

  it("caps memory under a spray of distinct IP bucket keys", () => {
    for (let i = 0; i < INCIDENT_FALLBACK_MAX_BUCKETS + 1; i += 1) {
      expect(allowIncidentDuringStorageOutage(`incident:key-${i}`, 1_000)).toBe(true);
    }
    // Oldest bucket was evicted: it starts a new window rather than keeping
    // unbounded state for every attacker-controlled key.
    expect(allowIncidentDuringStorageOutage("incident:key-0", 1_000)).toBe(true);
  });
});
