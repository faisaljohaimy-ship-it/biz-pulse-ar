/** Pure comparison only. No snapshot storage, model call or operational authority. */
import { z } from "zod";

export const PRESENCE_METRICS = [
  "incidentsResolved",
  "risksEscalated",
  "inspectionCompletionPct",
  "newCriticalAlerts",
] as const;
export type PresenceMetric = (typeof PRESENCE_METRICS)[number];

const Iso = z.string().datetime({ offset: true });
const Identity = z.string().trim().min(1).max(160);
const Metric = z
  .object({
    value: z.number().finite().nonnegative().nullable(),
    coverage: z.enum(["complete", "partial", "unavailable"]),
  })
  .strict();
const CountMetric = Metric.refine((x) => x.value === null || Number.isSafeInteger(x.value));

export const PresenceSnapshotSchema = z
  .object({
    accountId: Identity,
    organizationId: Identity,
    regionId: Identity.nullable(),
    siteId: Identity.nullable(),
    source: Identity,
    capturedAt: Iso,
    window: z.object({ from: Iso, to: Iso }).strict(),
    metrics: z
      .object({
        incidentsResolved: CountMetric,
        risksEscalated: CountMetric,
        inspectionCompletionPct: Metric.refine((x) => x.value === null || x.value <= 100),
        newCriticalAlerts: CountMetric,
      })
      .strict(),
  })
  .strict()
  .refine(
    (x) =>
      Date.parse(x.window.from) <= Date.parse(x.window.to) &&
      Date.parse(x.window.to) <= Date.parse(x.capturedAt),
  );
export type PresenceComparisonSnapshot = z.infer<typeof PresenceSnapshotSchema>;
export type ComparisonReason =
  | "missing_current"
  | "invalid_current"
  | "missing_baseline"
  | "invalid_baseline"
  | "account_changed"
  | "organization_changed"
  | "scope_changed"
  | "window_changed"
  | "source_changed"
  | "baseline_newer"
  | "incomplete_current"
  | "incomplete_baseline"
  | "unmeasured_current"
  | "unmeasured_baseline";
export interface PresenceMetricComparison {
  current: number | null;
  baseline: number | null;
  delta: number | null;
  reason: ComparisonReason | null;
}
export interface PresenceComparison {
  comparable: boolean;
  metrics: Record<PresenceMetric, PresenceMetricComparison>;
}

/** Baseline and current must describe the same authorized measurement contract. */
export function comparePresenceSnapshots(baseline: unknown, current: unknown): PresenceComparison {
  const now = PresenceSnapshotSchema.safeParse(current);
  const prior = PresenceSnapshotSchema.safeParse(baseline);
  let reason: ComparisonReason | null = null;
  if (current == null) reason = "missing_current";
  else if (!now.success) reason = "invalid_current";
  else if (baseline == null) reason = "missing_baseline";
  else if (!prior.success) reason = "invalid_baseline";
  else if (prior.data.accountId !== now.data.accountId) reason = "account_changed";
  else if (prior.data.organizationId !== now.data.organizationId) reason = "organization_changed";
  else if (prior.data.regionId !== now.data.regionId || prior.data.siteId !== now.data.siteId)
    reason = "scope_changed";
  else if (prior.data.source !== now.data.source) reason = "source_changed";
  else if (
    Date.parse(prior.data.window.from) !== Date.parse(now.data.window.from) ||
    Date.parse(prior.data.window.to) !== Date.parse(now.data.window.to)
  )
    reason = "window_changed";
  else if (Date.parse(prior.data.capturedAt) > Date.parse(now.data.capturedAt))
    reason = "baseline_newer";

  const metrics = Object.fromEntries(
    PRESENCE_METRICS.map((key) => {
      const a = now.success ? now.data.metrics[key] : null;
      // A different user's/organization's baseline must not be surfaced even as a number.
      const b = reason || !prior.success ? null : prior.data.metrics[key];
      const problem =
        reason ??
        (a?.value == null
          ? "unmeasured_current"
          : a.coverage !== "complete"
            ? "incomplete_current"
            : b?.value == null
              ? "unmeasured_baseline"
              : b.coverage !== "complete"
                ? "incomplete_baseline"
                : null);
      return [
        key,
        {
          current: a?.value ?? null,
          baseline: b?.value ?? null,
          delta:
            problem === null && a?.value != null && b?.value != null ? a.value - b.value : null,
          reason: problem,
        },
      ];
    }),
  ) as Record<PresenceMetric, PresenceMetricComparison>;
  return { comparable: Object.values(metrics).every((x) => x.reason === null), metrics };
}

/** A browser-supplied session id is a cursor hint, never the authorization scope. */
export function presenceCursorScope(
  accountId: string,
  organizationId: string,
  sessionId: string,
): string | null {
  const identity = Identity.safeParse(accountId);
  const organization = Identity.safeParse(organizationId);
  const session = z.string().trim().min(4).max(120).safeParse(sessionId);
  if (!identity.success || !organization.success || !session.success) return null;
  return JSON.stringify([identity.data, organization.data, session.data]);
}
