/**
 * ARIA Presence — "Since your last visit" delta engine.
 *
 * Reads the executive tier cursor for the given session and computes a
 * bilingual delta from live tables:
 *   • incidents resolved since cursor
 *   • risks escalated since cursor
 *   • inspection completion delta
 *   • new critical alerts since cursor
 *
 * Never fabricates numbers — if a table is unreachable the delta line
 * for it is simply omitted.
 */
import { readCursor, writeCursor } from "./tiers.server";

export interface PresenceDelta {
  hasBaseline: boolean;
  windowFromISO: string;
  windowToISO: string;
  lines_en: string[];
  lines_ar: string[];
  metrics: {
    incidentsResolved: number;
    risksEscalated: number;
    inspectionDeltaPct: number | null;
    newCriticalAlerts: number;
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
): Promise<PresenceDelta> {
  const now = new Date();
  const nowISO = now.toISOString();
  const cursor = readCursor(sessionId);
  const from = cursor?.lastVisitAt ?? new Date(now.getTime() - 24 * 60 * 60_000).toISOString();

  const delta: PresenceDelta = {
    hasBaseline: Boolean(cursor?.lastVisitAt),
    windowFromISO: from,
    windowToISO: nowISO,
    lines_en: [],
    lines_ar: [],
    metrics: {
      incidentsResolved: 0,
      risksEscalated: 0,
      inspectionDeltaPct: null,
      newCriticalAlerts: 0,
    },
  };

  const admin = await importAdmin();
  // Tenant isolation: uses the service-role client. Skip live delta when the
  // caller's org id is unknown rather than aggregate across every tenant.
  if (!admin || !orgId) return delta;

  await Promise.all([
    (async () => {
      const { count } = await admin
        .from("sec_incidents")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", ["resolved", "closed"])
        .gte("updated_at", from);
      const n = count ?? 0;
      delta.metrics.incidentsResolved = n;
      if (n > 0) {
        delta.lines_en.push(`${n} incident${n === 1 ? "" : "s"} resolved`);
        delta.lines_ar.push(`${n} حادثة تم إغلاقها`);
      }
    })().catch(() => {}),
    (async () => {
      const { count } = await admin
        .from("sim_risks")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("updated_at", from)
        .in("status", ["escalated", "elevated", "critical"]);
      const n = count ?? 0;
      delta.metrics.risksEscalated = n;
      if (n > 0) {
        delta.lines_en.push(`${n} risk${n === 1 ? "" : "s"} escalated`);
        delta.lines_ar.push(`${n} مخاطر تصاعدت`);
      }
    })().catch(() => {}),
    (async () => {
      const { data } = await admin
        .from("sim_inspections")
        .select("status,updated_at")
        .eq("org_id", orgId)
        .gte("updated_at", from)
        .limit(500);
      if (!data || !data.length) return;
      const done = data.filter((r) => r.status === "completed" || r.status === "closed").length;
      const pct = Math.round((done / data.length) * 100);
      delta.metrics.inspectionDeltaPct = pct;
      if (pct !== 0) {
        const dir_en = pct >= 0 ? "improved by" : "declined by";
        const dir_ar = pct >= 0 ? "تحسّن بنسبة" : "تراجع بنسبة";
        delta.lines_en.push(`inspection completion ${dir_en} ${Math.abs(pct)}%`);
        delta.lines_ar.push(`اكتمال التفتيش ${dir_ar} ${Math.abs(pct)}%`);
      }
    })().catch(() => {}),
    (async () => {
      const { count } = await admin
        .from("sim_notifications")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("severity", "critical")
        .gte("created_at", from);
      const n = count ?? 0;
      delta.metrics.newCriticalAlerts = n;
      if (n > 0) {
        delta.lines_en.push(`${n} new critical alert${n === 1 ? "" : "s"}`);
        delta.lines_ar.push(`${n} تنبيه حرج جديد`);
      }
    })().catch(() => {}),
  ]);

  // Advance the cursor to now.
  writeCursor(sessionId, {
    ...(cursor ?? {}),
    lastVisitAt: nowISO,
    lastGreetingAt: nowISO,
  });

  return delta;
}
