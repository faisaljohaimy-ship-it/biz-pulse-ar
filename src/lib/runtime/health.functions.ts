// Real runtime health probe. Every subsystem returns one of:
//   "healthy" | "warning" | "offline" | "blocked" | "unknown"
// with evidence (counts, last activity, error). No fabrication — if a
// subsystem has never executed, it reports "unknown" with reason.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HealthStatus = "healthy" | "warning" | "offline" | "blocked" | "unknown";

export type SubsystemHealth = {
  id: string;
  label: string;
  status: HealthStatus;
  evidence: Record<string, string | number | boolean | null>;
  reason?: string;
};

export type RuntimeHealthReport = {
  at: string;
  org_id: string | null;
  subsystems: SubsystemHealth[];
  operational_pct: number;
};

const STALE_MIN = 24 * 60; // 24h
function minutesAgo(ts: string | null | undefined): number | null {
  if (!ts) return null;
  return Math.round((Date.now() - new Date(ts).getTime()) / 60000);
}

export const getRuntimeHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RuntimeHealthReport> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: member } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const orgId: string | null = member?.org_id ?? null;

    const subs: SubsystemHealth[] = [];

    if (!orgId) {
      subs.push({
        id: "org",
        label: "Organization Context",
        status: "blocked",
        evidence: {},
        reason: "User is not a member of any organization.",
      });
      return {
        at: new Date().toISOString(),
        org_id: null,
        subsystems: subs,
        operational_pct: 0,
      };
    }

    // Workflow Engine
    const { data: wfDefs } = await supabaseAdmin
      .from("workflows")
      .select("id")
      .eq("org_id", orgId)
      .eq("enabled", true);
    const { data: lastWfRun } = await supabaseAdmin
      .from("workflow_runs")
      .select("id, status, started_at, error")
      .eq("org_id", orgId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const wfCount = wfDefs?.length ?? 0;
    const lastWfMin = minutesAgo(lastWfRun?.started_at ?? null);
    subs.push({
      id: "workflow_engine",
      label: "Workflow Engine",
      status:
        wfCount === 0
          ? "blocked"
          : lastWfMin == null
            ? "unknown"
            : lastWfMin < STALE_MIN
              ? "healthy"
              : "warning",
      evidence: {
        workflows_enabled: wfCount,
        last_run_minutes_ago: lastWfMin,
        last_run_status: lastWfRun?.status ?? null,
      },
      reason: wfCount === 0 ? "No enabled workflows for this org." : undefined,
    });

    // Agent Runtime
    const { data: lastAgent } = await supabaseAdmin
      .from("agent_runs")
      .select("status, started_at, error")
      .eq("org_id", orgId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastAgentMin = minutesAgo(lastAgent?.started_at ?? null);
    subs.push({
      id: "agent_runtime",
      label: "Agent Runtime",
      status: lastAgentMin == null ? "unknown" : lastAgentMin < STALE_MIN ? "healthy" : "warning",
      evidence: {
        last_run_minutes_ago: lastAgentMin,
        last_run_status: lastAgent?.status ?? null,
      },
    });

    // Tool Runtime
    const { data: lastTool } = await supabaseAdmin
      .from("tool_executions")
      .select("status, created_at, error")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastToolMin = minutesAgo(lastTool?.created_at ?? null);
    subs.push({
      id: "tool_runtime",
      label: "Tool Runtime",
      status: lastToolMin == null ? "unknown" : lastToolMin < STALE_MIN ? "healthy" : "warning",
      evidence: {
        last_execution_minutes_ago: lastToolMin,
        last_status: lastTool?.status ?? null,
      },
    });

    // Event Bus
    const { count: evCount } = await supabaseAdmin
      .from("enterprise_events")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);
    const { data: lastEv } = await supabaseAdmin
      .from("enterprise_events")
      .select("occurred_at, topic, status")
      .eq("org_id", orgId)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastEvMin = minutesAgo(lastEv?.occurred_at ?? null);
    subs.push({
      id: "event_bus",
      label: "Event Bus",
      status:
        (evCount ?? 0) === 0
          ? "unknown"
          : lastEvMin != null && lastEvMin < STALE_MIN
            ? "healthy"
            : "warning",
      evidence: {
        total: evCount ?? 0,
        last_event_minutes_ago: lastEvMin,
        last_topic: lastEv?.topic ?? null,
      },
    });

    // Pending event backlog
    const { count: pendingEv } = await supabaseAdmin
      .from("enterprise_events")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "pending");
    subs.push({
      id: "event_consumer",
      label: "Event Consumer",
      status: (pendingEv ?? 0) > 100 ? "warning" : (pendingEv ?? 0) >= 0 ? "healthy" : "unknown",
      evidence: { pending_backlog: pendingEv ?? 0 },
    });

    // Audit Trail
    const { count: auditCount } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true });
    subs.push({
      id: "audit_trail",
      label: "Audit Trail",
      status: (auditCount ?? 0) > 0 ? "healthy" : "unknown",
      evidence: { total: auditCount ?? 0 },
    });

    // KPI Engine (depends on real sec_incidents data presence)
    const { count: incCount } = await supabaseAdmin
      .from("sec_incidents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);
    subs.push({
      id: "kpi_engine",
      label: "KPI Engine",
      status: (incCount ?? 0) > 0 ? "healthy" : "unknown",
      evidence: { incidents_total: incCount ?? 0 },
      reason:
        (incCount ?? 0) === 0
          ? "No operational data yet — KPIs will compute when records exist."
          : undefined,
    });

    // ARIA Knowledge
    const { count: kCount } = await supabaseAdmin
      .from("aria_knowledge")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);
    subs.push({
      id: "aria_rag",
      label: "ARIA Knowledge / RAG",
      status: (kCount ?? 0) > 0 ? "healthy" : "warning",
      evidence: { documents: kCount ?? 0 },
      reason: (kCount ?? 0) === 0 ? "No indexed enterprise knowledge." : undefined,
    });

    // Microsoft Integration — uses last_sync_status / last_test_status.
    const { data: ms } = await supabaseAdmin
      .from("integration_microsoft")
      .select(
        "tenant_id, client_id, last_sync_at, last_sync_status, last_sync_error, last_test_status",
      )
      .eq("org_id", orgId)
      .limit(1)
      .maybeSingle();
    let msStatus: HealthStatus = "offline";
    let msReason: string | undefined = "Not configured";
    if (ms) {
      const configured = Boolean(ms.tenant_id && ms.client_id);
      const sync = ms.last_sync_status;
      const test = ms.last_test_status;
      if (!configured) {
        msStatus = "blocked";
        msReason = "Waiting for credentials (tenant_id / client_id)";
      } else if (sync === "success" || test === "success") {
        msStatus = "healthy";
        msReason = undefined;
      } else if (sync === "error" || test === "error") {
        msStatus = "warning";
        msReason = ms.last_sync_error ?? "Last sync failed";
      } else {
        msStatus = "unknown";
        msReason = "Configured but never synced";
      }
    }
    subs.push({
      id: "integration_microsoft",
      label: "Microsoft 365 Integration",
      status: msStatus,
      evidence: {
        configured: Boolean(ms?.tenant_id && ms?.client_id),
        last_sync_at: ms?.last_sync_at ?? null,
        last_sync_status: ms?.last_sync_status ?? null,
      },
      reason: msReason,
    });

    // SAP / Oracle / n8n adapters — driven by tool_registry enabled flag + metadata.
    for (const [tid, label] of [
      ["sap.execute", "SAP Adapter"],
      ["oracle.execute", "Oracle Adapter"],
      ["n8n.execute", "n8n Adapter"],
    ] as const) {
      const { data: tool } = await supabaseAdmin
        .from("tool_registry")
        .select("enabled, metadata")
        .eq("id", tid)
        .maybeSingle();
      const enabled = Boolean(tool?.enabled);
      const meta = (tool?.metadata ?? {}) as Record<string, unknown>;
      const hasCreds = Object.keys(meta).some(
        (k) => k.includes("endpoint") || k.includes("url") || k.includes("base_url"),
      );
      subs.push({
        id: tid,
        label,
        status: !enabled ? "offline" : hasCreds ? "healthy" : "blocked",
        evidence: { enabled, has_config: hasCreds },
        reason: !enabled ? "Adapter disabled" : hasCreds ? undefined : "Waiting for credentials",
      });
    }

    const score = subs.reduce((acc, s) => {
      if (s.status === "healthy") return acc + 1;
      if (s.status === "warning") return acc + 0.6;
      if (s.status === "unknown") return acc + 0.3;
      return acc;
    }, 0);
    const operationalPct = Math.round((score / subs.length) * 100);

    return {
      at: new Date().toISOString(),
      org_id: orgId,
      subsystems: subs,
      operational_pct: operationalPct,
    };
  });
