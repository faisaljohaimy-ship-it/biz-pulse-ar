import { describe, expect, it } from "vitest";
import {
  projectCriticalHandover,
  reviewCoverage,
  reviewDataQuality,
  reviewExpiry,
  sourceInstant,
  verifyHandover,
  type OperationalReviewRow,
  type ReviewRead,
  type ReviewSource,
} from "./operational-read-review";

const at = "2026-11-24T12:00:00Z";
const row = (id: string, extra: Partial<OperationalReviewRow> = {}): OperationalReviewRow => ({
  id,
  org_id: "org-a",
  status: "active",
  updated_at: at,
  ...extra,
});
function read(
  rows: OperationalReviewRow[],
  source: ReviewSource = "sec_incidents",
  total: number | null = rows.length,
): ReviewRead {
  return {
    state: "ready",
    scope: {
      accountId: "account-a",
      organizationId: "org-a",
      source,
      fetchedAt: at,
      limit: 500,
      total,
    },
    rows,
  };
}

describe("explicit source scope and coverage", () => {
  it("distinguishes a measured zero, a bounded sample and an unavailable/error source", () => {
    expect(reviewCoverage(read([]))).toMatchObject({ state: "complete", evaluated: 0, total: 0 });
    expect(reviewCoverage(read([row("p1")], "sec_permits", 5))).toMatchObject({
      state: "partial",
      evaluated: 1,
      total: 5,
    });
    expect(reviewCoverage(read([], "sec_permits", null))).toMatchObject({
      state: "partial",
      evaluated: 0,
      total: null,
    });
    const source = read([]);
    const failed: ReviewRead = { state: "source_error", scope: source.scope, rows: null };
    expect(reviewCoverage(failed)).toMatchObject({
      state: "unavailable",
      evaluated: null,
      total: null,
    });
    expect(reviewExpiry(failed, at).findingCount).toBeNull();
    expect(reviewDataQuality(failed, at, 24).findingCount).toBeNull();
    expect(projectCriticalHandover(failed).caseCount).toBeNull();
  });
  it("rejects mixed organizations and invalid or exceeded source limits without disclosing findings", () => {
    const mixed = read([row("foreign", { org_id: "org-b" })]);
    expect(reviewCoverage(mixed)).toMatchObject({ state: "unavailable", reason: "scope_mismatch" });
    expect(reviewDataQuality(mixed, at, 24).findings).toBeNull();
    const bounded = read([row("a"), row("b")]);
    bounded.scope.limit = 1;
    expect(reviewCoverage(bounded).state).toBe("unavailable");
    const invalid = read([row("a")], "sec_incidents", 0);
    expect(reviewCoverage(invalid).reason).toBe("invalid_total");
  });
});

describe("permit/contractor source dates", () => {
  it("treats date-only expiration as end-of-day UTC and timestamp expiration as an exact instant", () => {
    const permits = read(
      [row("p1", { starts_at: "2026-11-20", ends_at: "2026-11-24" })],
      "sec_permits",
    );
    expect(
      reviewExpiry(permits, "2026-11-24T23:59:59Z").findings?.map((x) => x.rule),
    ).not.toContain("expired");
    expect(reviewExpiry(permits, "2026-11-25T00:00:00Z").findings?.map((x) => x.rule)).toContain(
      "expired",
    );
    const exact = read([row("p1", { starts_at: "2026-11-20", ends_at: at })], "sec_permits");
    expect(reviewExpiry(exact, at).findings?.map((x) => x.rule)).toContain("expired");
  });
  it("reports missing/invalid dates, reversed windows and status conflicts with the exact source IDs/times", () => {
    const permits = read(
      [
        row("reversed", { starts_at: "2026-11-26", ends_at: "2026-11-20" }),
        row("missing", { starts_at: null, ends_at: null }),
        row("invalid", { starts_at: "2026-02-30", ends_at: "not-a-date" }),
      ],
      "sec_permits",
    );
    const result = reviewExpiry(permits, at);
    expect(result.findings).toContainEqual({
      rule: "reversed_window",
      ids: ["reversed"],
      field: "ends_at",
      sourceTimes: [at],
    });
    expect(result.findings?.filter((x) => x.rule === "missing_date")).toHaveLength(2);
    expect(result.findings?.filter((x) => x.rule === "invalid_date")).toHaveLength(2);
    expect(result.findings?.some((x) => x.rule === "active_after_expiry")).toBe(true);
  });
  it("evaluates contract and insurance dates independently and never joins people by display names", () => {
    const contractors = read(
      [row("c1", { expires_at: "2027-01-01", insurance_expiry: "2026-11-23" })],
      "sec_contractors",
    );
    const result = reviewExpiry(contractors, at);
    expect(result.findings).toContainEqual({
      rule: "expired",
      ids: ["c1"],
      field: "insurance_expiry",
      sourceTimes: [at],
    });
    expect(result.findings?.some((x) => x.field === "expires_at")).toBe(false);
    expect(reviewExpiry(contractors, "invalid").findingCount).toBeNull();
    expect(sourceInstant("2026-02-30")).toBeNull();
    expect(sourceInstant("2026-11-24T24:00:00Z")).toBeNull();
    expect(sourceInstant("2026-11-24T09:00:00-03:00")).toBe(Date.parse(at));
    expect(reviewExpiry(contractors, at, "Asia/Riyadh" as "UTC").coverage.state).toBe(
      "unavailable",
    );
  });
});

describe("critical shift handover exact-ID invariant", () => {
  it("preserves every critical open record, status, owner, deadline and source time without mutating input", () => {
    const input = read([
      row("critical-1", {
        severity: "critical",
        status: "open",
        owner: "source-owner",
        deadline: "2026-11-25T00:00:00Z",
      }),
      row("critical-2", { severity: "critical", status: null, owner: null }),
      row("closed", { severity: "critical", status: "resolved" }),
      row("noncritical", { severity: "high", status: "open" }),
    ]);
    const before = JSON.stringify(input);
    const projected = projectCriticalHandover(input);
    expect(projected.caseCount).toBe(2);
    expect(projected.cases?.map((x) => x.id)).toEqual(["critical-1", "critical-2"]);
    expect(projected.cases?.[0]).toMatchObject({
      owner: "source-owner",
      deadline: "2026-11-25T00:00:00Z",
      status: "open",
      sourceUpdatedAt: at,
    });
    expect(projected.cases?.[1].deadline).toBeNull();
    expect(projected.missingClassification).toEqual(["critical-2"]);
    expect(projected.invariant).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
  });
  it("rejects omitted/duplicated/injected/modified critical cases and duplicate source IDs", () => {
    const input = read([row("a", { severity: "critical" }), row("b", { severity: "critical" })]);
    const cases = projectCriticalHandover(input).cases!;
    expect(verifyHandover(input, cases.slice(0, 1))).toBe(false);
    expect(verifyHandover(input, [cases[0], cases[0]])).toBe(false);
    expect(verifyHandover(input, [cases[0], { ...cases[1], id: "foreign" }])).toBe(false);
    for (const field of ["owner", "status", "deadline", "sourceUpdatedAt"] as const)
      expect(verifyHandover(input, [cases[0], { ...cases[1], [field]: "changed" }]), field).toBe(
        false,
      );
    expect(
      projectCriticalHandover(
        read([row("a", { severity: "critical" }), row("a", { severity: "critical" })]),
      ),
    ).toMatchObject({ invariant: false, cases: null, caseCount: null });
  });
});

describe("bounded data-quality diagnostics", () => {
  it("retains stale/missing/duplicate/conflicting IDs and source times under the declared review threshold", () => {
    const input = read([
      row("a", { updated_at: "2026-11-20T12:00:00Z", status: "open" }),
      row("a", { updated_at: at, status: "closed" }),
      row("b", { updated_at: null, status: null }),
      row("c", { updated_at: "2026-11-25T00:00:00Z" }),
    ]);
    const result = reviewDataQuality(input, at, 24);
    expect(result.findings).toContainEqual({
      rule: "duplicate_id",
      ids: ["a"],
      field: "id",
      sourceTimes: ["2026-11-20T12:00:00Z", at],
    });
    expect(
      result.findings?.some((x) => x.rule === "conflicting_duplicate" && x.field === "status"),
    ).toBe(true);
    expect(
      result.findings?.some((x) => x.rule === "older_than_review_threshold" && x.ids[0] === "a"),
    ).toBe(true);
    expect(result.findings?.some((x) => x.rule === "missing_field" && x.ids[0] === "b")).toBe(true);
    expect(result.findings?.some((x) => x.rule === "future_timestamp" && x.ids[0] === "c")).toBe(
      true,
    );
    expect(result.staleAfterHours).toBe(24);
  });
  it("keeps a real zero distinct from an invalid clock/threshold and preserves partial coverage", () => {
    expect(reviewDataQuality(read([row("a")]), at, 24).findingCount).toBe(0);
    expect(reviewDataQuality(read([row("a")], "sec_incidents", 10), at, 24).coverage.state).toBe(
      "partial",
    );
    for (const hours of [0, Number.NaN, 9000])
      expect(reviewDataQuality(read([]), at, hours)).toMatchObject({
        findings: null,
        findingCount: null,
        coverage: { state: "unavailable" },
      });
  });
});
