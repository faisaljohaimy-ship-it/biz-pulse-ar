/**
 * SADEED Presence — "Since your last visit" delta engine.
 *
 * Reads the executive tier cursor for the given session and computes a
 * bilingual delta from live tables:
 *   • incidents resolved since cursor
 *   • risks escalated since cursor
 *   • observed completion in an updated inspection sample (no comparison baseline)
 *   • new critical alerts since cursor
 *
 * Never fabricates numbers — if a table is unreachable the delta line
 * for it is simply omitted.
 */
import { readCursor, writeCursor } from "./tiers.server";
import {
  comparePresenceSnapshots,
  type PresenceComparison,
  type PresenceComparisonSnapshot,
} from "./change-comparison";

export interface PresenceDelta {
  hasBaseline: boolean;
  windowFromISO: string;
  windowToISO: string;
  /** Optional extension for verified account-scoped callers; never a durable history receipt. */
  snapshot?: PresenceComparisonSnapshot;
  comparison?: PresenceComparison;
  lines_en: string[];
  lines_ar: string[];
  metrics: {
    incidentsResolved: number | null;
    risksEscalated: number | null;
    /** No prior completion baseline is stored; this remains null, not the sample's completion rate. */
    inspectionDeltaPct: number | null;
    newCriticalAlerts: number | null;
  };
}

async function importAdmin() {
  try {
    const mod = await import("@/integrations/supabase/client.server");
    return mod.supabaseAdmin;
  } catch {
    return null;
  }
}

export async function computePresenceDelta(
  sessionId: string,
  orgId?: string | null,
  accountId?: string,
): Promise<PresenceDelta> {
  const now = new Date();
  const nowISO = now.toISOString();
  const cursor = readCursor(sessionId);
  const priorVisit = cursor?.lastVisitAt;
  const validCursor =
    priorVisit &&
    Number.isFinite(Date.parse(priorVisit)) &&
    Date.parse(priorVisit) <= now.getTime();
  const from = validCursor ? priorVisit : new Date(now.getTime() - 24 * 60 * 60_000).toISOString();

  const delta: PresenceDelta = {
    hasBaseline: Boolean(validCursor),
    windowFromISO: from,
    windowToISO: nowISO,
    lines_en: [],
    lines_ar: [],
    metrics: {
      incidentsResolved: null,
      risksEscalated: null,
      inspectionDeltaPct: null,
      newCriticalAlerts: null,
    },
  };

  const sampledInspection = { value: null as number | null, coverage: "partial" as const };
  const finishComparison = () => {
    if (!accountId || !orgId) return;
    const observed = (value: number | null) => ({
      value,
      coverage: value === null ? ("unavailable" as const) : ("complete" as const),
    });
    delta.snapshot = {
      accountId,
      organizationId: orgId,
      regionId: null,
      siteId: null,
      source: "presence-updated-record-state:v1",
      capturedAt: new Date().toISOString(),
      window: { from, to: nowISO },
      metrics: {
        incidentsResolved: observed(delta.metrics.incidentsResolved),
        risksEscalated: observed(delta.metrics.risksEscalated),
        inspectionCompletionPct: sampledInspection,
        newCriticalAlerts: observed(delta.metrics.newCriticalAlerts),
      },
    };
    // The warm cursor contains only timestamps/seen IDs. It is not a compatible
    // prior metric snapshot; do not turn it into a fabricated comparison baseline.
    delta.comparison = comparePresenceSnapshots(null, delta.snapshot);
  };

  const admin = await importAdmin();
  // Tenant isolation: uses the service-role client. Skip live delta when the
  // caller's org id is unknown rather than aggregate across every tenant.
  if (!admin || !orgId) {
    finishComparison();
    return delta;
  }

  await Promise.all([
    (async () => {
      const { count, error } = await admin
        .from("sec_incidents")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", ["resolved", "closed"])
        .gte("updated_at", from)
        .lte("updated_at", nowISO);
      if (error || typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) return;
      const n = count;
      delta.metrics.incidentsResolved = n;
      if (n > 0) {
        delta.lines_en.push(`${n} incident${n === 1 ? "" : "s"} resolved`);
        delta.lines_ar.push(`${n} حادثة تم إغلاقها`);
      }
    })().catch(() => {}),
    (async () => {
      const { count, error } = await admin
        .from("sim_risks")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("updated_at", from)
        .lte("updated_at", nowISO)
        .in("status", ["escalated", "elevated", "critical"]);
      if (error || typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) return;
      const n = count;
      delta.metrics.risksEscalated = n;
      if (n > 0) {
        delta.lines_en.push(`${n} risk${n === 1 ? "" : "s"} escalated`);
        delta.lines_ar.push(`${n} مخاطر تصاعدت`);
      }
    })().catch(() => {}),
    (async () => {
      const { data, error } = await admin
        .from("sim_inspections")
        .select("status,updated_at")
        .eq("org_id", orgId)
        .gte("updated_at", from)
        .lte("updated_at", nowISO)
        .limit(500);
      if (
        error ||
        !data ||
        !data.length ||
        data.some((r) => typeof r.status !== "string" || !r.status.trim())
      )
        return;
      const done = data.filter((r) => r.status === "completed" || r.status === "closed").length;
      const pct = Math.round((done / data.length) * 100);
      sampledInspection.value = pct;
      delta.lines_en.push(
        `inspection sample: ${done} of ${data.length} updated records completed (${pct}%); comparison baseline unavailable`,
      );
      delta.lines_ar.push(
        `اكتمال عينة التفتيش: ${done} من ${data.length} سجلًا محدّثًا (${pct}٪)؛ لا يوجد خط أساس للمقارنة`,
      );
    })().catch(() => {}),
    (async () => {
      const { count, error } = await admin
        .from("sim_notifications")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("severity", "critical")
        .gte("created_at", from)
        .lte("created_at", nowISO);
      if (error || typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) return;
      const n = count;
      delta.metrics.newCriticalAlerts = n;
      if (n > 0) {
        delta.lines_en.push(`${n} new critical alert${n === 1 ? "" : "s"}`);
        delta.lines_ar.push(`${n} تنبيه حرج جديد`);
      }
    })().catch(() => {}),
  ]);

  finishComparison();

  // Advance the existing warm cursor to now; no metric snapshot/history is stored.
  writeCursor(sessionId, {
    ...(cursor ?? {}),
    lastVisitAt: nowISO,
    lastGreetingAt: nowISO,
  });

  return delta;
}
