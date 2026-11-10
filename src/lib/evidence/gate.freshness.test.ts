import { afterEach, describe, expect, it, vi } from "vitest";
import { isFresh, queryEvidence, type Evidence } from "./gate";

const NOW = Date.parse("2026-11-10T00:00:00.000Z");
const MAX_AGE = 5 * 60_000;
const evidenceAt = (observedAt: string): Evidence => ({
  kind: "runtime.probe",
  source: "GET /api/chat/health",
  observedAt,
});

afterEach(() => vi.restoreAllMocks());

describe("FR-19 freshness: do not certify future or stale readings", () => {
  it("rejects a timestamp one millisecond in the future", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(isFresh(evidenceAt(new Date(NOW + 1).toISOString()))).toBe(false);
  });

  it("rejects evidence years in the future instead of showing LIVE indefinitely", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(isFresh(evidenceAt("2099-01-01T00:00:00.000Z"))).toBe(false);
  });

  it("retains valid observed-now and within-budget measurements", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(isFresh(evidenceAt(new Date(NOW).toISOString()))).toBe(true);
    expect(isFresh(evidenceAt(new Date(NOW - MAX_AGE).toISOString()))).toBe(true);
  });

  it("rejects expired or malformed evidence without changing the existing budget", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(isFresh(evidenceAt(new Date(NOW - MAX_AGE - 1).toISOString()))).toBe(false);
    expect(isFresh(evidenceAt("invalid-date"))).toBe(false);
  });
});

describe("FR-19 query evidence: malformed update timestamps fail closed", () => {
  it("does not throw when a query reports an invalid or out-of-range timestamp", () => {
    for (const timestamp of [NaN, Infinity, -Infinity, 8.64e15 + 1, Number.MAX_VALUE, 0, -1]) {
      expect(queryEvidence("sec_incidents", timestamp)).toBeNull();
    }
  });

  it("preserves valid database evidence and optional metadata", () => {
    expect(queryEvidence("sec_incidents", NOW, 3, "/sec/incidents")).toEqual({
      kind: "db.query",
      source: "sec_incidents",
      observedAt: new Date(NOW).toISOString(),
      value: 3,
      href: "/sec/incidents",
    });
    expect(queryEvidence("sec_incidents", 8.64e15)?.observedAt).toBe("+275760-09-13T00:00:00.000Z");
  });
});
