/** Read-only projections of a bounded, caller-authorized source result; never operational authority. */
export type ReviewSource = "sec_incidents" | "sec_permits" | "sec_contractors";
export interface ReviewScope {
  accountId: string;
  organizationId: string;
  source: ReviewSource;
  fetchedAt: string;
  limit: number;
  total: number | null;
}
export interface OperationalReviewRow {
  id: string;
  org_id: string;
  status: string | null;
  updated_at: string | null;
  severity?: string | null;
  owner?: string | null;
  deadline?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  expires_at?: string | null;
  insurance_expiry?: string | null;
}
export type ReviewRead =
  | { state: "ready"; scope: ReviewScope; rows: readonly OperationalReviewRow[] }
  | { state: "source_error" | "unavailable"; scope: ReviewScope; rows: null };
export interface ReviewCoverage {
  state: "complete" | "partial" | "unavailable";
  reason: string | null;
  evaluated: number | null;
  total: number | null;
  scope: ReviewScope;
}
export interface ReviewFinding {
  rule: string;
  ids: string[];
  field: string;
  sourceTimes: (string | null)[];
}
const DAY = 86_400_000;
const CLOSED = new Set(["closed", "resolved", "cancelled", "canceled", "rejected", "revoked"]);
const ACTIVE = new Set(["active", "approved", "in_progress", "in-progress", "valid"]);

/** Date-only source fields expire at the END of their UTC calendar date. */
export function sourceInstant(value: string | null | undefined, endOfDate = false): number | null {
  if (typeof value !== "string") return null;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(
      value,
    );
  if (!match) return null;
  if (
    value.length > 10 &&
    (Number(value.slice(11, 13)) > 23 ||
      Number(value.slice(14, 16)) > 59 ||
      Number(value.slice(17, 19)) > 59)
  )
    return null;
  const calendar = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (calendar.toISOString().slice(0, 10) !== value.slice(0, 10)) return null;
  const dateOnly = value.length === 10;
  const parsed = Date.parse(dateOnly ? `${value}T00:00:00Z` : value);
  return Number.isFinite(parsed) ? parsed + (dateOnly && endOfDate ? DAY : 0) : null;
}

export function reviewCoverage(read: ReviewRead): ReviewCoverage {
  const scope = { ...read.scope };
  const unavailable = (reason: string): ReviewCoverage => ({
    state: "unavailable",
    reason,
    evaluated: null,
    total: null,
    scope,
  });
  if (
    !scope.accountId ||
    !scope.organizationId ||
    sourceInstant(scope.fetchedAt) === null ||
    !Number.isInteger(scope.limit) ||
    scope.limit < 1 ||
    scope.limit > 500
  )
    return unavailable("invalid_scope");
  if (read.state !== "ready") return unavailable(read.state);
  if (
    read.rows.length > scope.limit ||
    read.rows.some((row) => row.org_id !== scope.organizationId)
  )
    return unavailable("scope_mismatch");
  if (scope.total !== null && (!Number.isInteger(scope.total) || scope.total < read.rows.length))
    return unavailable("invalid_total");
  const complete = scope.total === read.rows.length;
  return {
    state: complete ? "complete" : "partial",
    reason: complete ? null : "bounded_or_unknown_total",
    evaluated: read.rows.length,
    total: scope.total,
    scope,
  };
}

function finding(row: OperationalReviewRow, rule: string, field: string): ReviewFinding {
  return { rule, ids: row.id ? [row.id] : [], field, sourceTimes: [row.updated_at] };
}

/** Facts about source dates/status only. No inferred contractor-name matching or approval decision. */
export function reviewExpiry(
  read: ReviewRead,
  asOf: string,
  timezone: "UTC" = "UTC",
  warningDays = 30,
) {
  const coverage = reviewCoverage(read);
  const at = sourceInstant(asOf);
  if (
    !["sec_permits", "sec_contractors"].includes(read.scope.source) ||
    at === null ||
    timezone !== "UTC" ||
    !Number.isInteger(warningDays) ||
    warningDays < 0 ||
    warningDays > 365
  )
    return {
      coverage: { ...coverage, state: "unavailable" as const, reason: "invalid_clock_or_rule" },
      asOf,
      timezone,
      warningDays,
      findings: null,
      findingCount: null,
    };
  if (coverage.state === "unavailable" || read.state !== "ready")
    return { coverage, asOf, timezone, warningDays, findings: null, findingCount: null };
  const findings: ReviewFinding[] = [];
  for (const row of read.rows) {
    const permit = read.scope.source === "sec_permits";
    const fields = permit ? (["ends_at"] as const) : (["expires_at", "insurance_expiry"] as const);
    const start = sourceInstant(row.starts_at);
    if (permit && start === null)
      findings.push(finding(row, row.starts_at ? "invalid_date" : "missing_date", "starts_at"));
    if (!row.status) findings.push(finding(row, "missing_status", "status"));
    for (const field of fields) {
      const end = sourceInstant(row[field], true);
      if (end === null) {
        findings.push(finding(row, row[field] ? "invalid_date" : "missing_date", field));
        continue;
      }
      if (permit && start !== null && start >= end)
        findings.push(finding(row, "reversed_window", field));
      if (end <= at) {
        findings.push(finding(row, "expired", field));
        if (row.status && ACTIVE.has(row.status))
          findings.push(finding(row, "active_after_expiry", field));
      } else if (end - at <= warningDays * DAY)
        findings.push(finding(row, "expires_within_window", field));
      if (permit && start !== null && start > at && row.status && ACTIVE.has(row.status))
        findings.push(finding(row, "active_before_start", "starts_at"));
    }
  }
  return { coverage, asOf, timezone, warningDays, findings, findingCount: findings.length };
}

export interface HandoverCase {
  id: string;
  status: string | null;
  owner: string | null;
  deadline: string | null;
  sourceUpdatedAt: string | null;
}
const criticalOpen = (row: OperationalReviewRow) =>
  row.severity === "critical" && (!row.status || !CLOSED.has(row.status));

/** Exact field/ID invariant, also usable to reject edited or model-produced handovers. */
export function verifyHandover(read: ReviewRead, cases: readonly HandoverCase[]): boolean {
  if (
    read.scope.source !== "sec_incidents" ||
    read.state !== "ready" ||
    reviewCoverage(read).state === "unavailable"
  )
    return false;
  if (new Set(read.rows.map((row) => row.id)).size !== read.rows.length) return false;
  const expected = read.rows.filter(criticalOpen);
  if (
    expected.length !== cases.length ||
    new Set(cases.map((row) => row.id)).size !== cases.length ||
    new Set(expected.map((row) => row.id)).size !== expected.length
  )
    return false;
  const byId = new Map(cases.map((row) => [row.id, row]));
  return expected.every((row) => {
    const value = byId.get(row.id);
    return Boolean(
      row.id &&
      value &&
      value.status === row.status &&
      value.owner === (row.owner ?? null) &&
      value.deadline === (row.deadline ?? null) &&
      value.sourceUpdatedAt === row.updated_at,
    );
  });
}

export function projectCriticalHandover(read: ReviewRead) {
  const coverage = reviewCoverage(read);
  if (
    read.scope.source !== "sec_incidents" ||
    coverage.state === "unavailable" ||
    read.state !== "ready"
  )
    return {
      coverage: { ...coverage, state: "unavailable" as const },
      cases: null,
      caseCount: null,
      invariant: false,
      missingClassification: null,
    };
  const cases: HandoverCase[] = read.rows.filter(criticalOpen).map((row) => ({
    id: row.id,
    status: row.status,
    owner: row.owner ?? null,
    deadline: row.deadline ?? null,
    sourceUpdatedAt: row.updated_at,
  }));
  const invariant = verifyHandover(read, cases);
  return {
    coverage,
    cases: invariant ? cases : null,
    caseCount: invariant ? cases.length : null,
    invariant,
    missingClassification: read.rows
      .filter(
        (row) =>
          !row.status ||
          !row.severity ||
          !["low", "medium", "high", "critical"].includes(row.severity),
      )
      .map((row) => row.id),
  };
}

/** User-selected review threshold, not a regulatory rule or calibrated risk measure. */
export function reviewDataQuality(read: ReviewRead, asOf: string, staleAfterHours: number) {
  const coverage = reviewCoverage(read);
  const at = sourceInstant(asOf);
  if (
    coverage.state === "unavailable" ||
    read.state !== "ready" ||
    at === null ||
    !Number.isFinite(staleAfterHours) ||
    staleAfterHours < 1 ||
    staleAfterHours > 8760
  )
    return {
      coverage: {
        ...coverage,
        state: "unavailable" as const,
        reason: coverage.reason ?? "invalid_clock_or_rule",
      },
      asOf,
      staleAfterHours,
      findings: null,
      findingCount: null,
    };
  const findings: ReviewFinding[] = [];
  const ids = new Map<string, OperationalReviewRow>();
  for (const row of read.rows) {
    for (const field of ["id", "status", "updated_at"] as const)
      if (!row[field]) findings.push(finding(row, "missing_field", field));
    const time = sourceInstant(row.updated_at);
    if (row.updated_at && time === null)
      findings.push(finding(row, "invalid_timestamp", "updated_at"));
    if (time !== null && time > at) findings.push(finding(row, "future_timestamp", "updated_at"));
    if (time !== null && at - time > staleAfterHours * 3_600_000)
      findings.push(finding(row, "older_than_review_threshold", "updated_at"));
    const previous = ids.get(row.id);
    if (row.id && previous) {
      findings.push({
        rule: "duplicate_id",
        ids: [row.id],
        field: "id",
        sourceTimes: [previous.updated_at, row.updated_at],
      });
      for (const field of [
        "status",
        "severity",
        "owner",
        "deadline",
        "starts_at",
        "ends_at",
        "expires_at",
        "insurance_expiry",
      ] as const)
        if ((previous[field] ?? null) !== (row[field] ?? null))
          findings.push({
            rule: "conflicting_duplicate",
            ids: [row.id],
            field,
            sourceTimes: [previous.updated_at, row.updated_at],
          });
    } else if (row.id) ids.set(row.id, row);
  }
  return { coverage, asOf, staleAfterHours, findings, findingCount: findings.length };
}
