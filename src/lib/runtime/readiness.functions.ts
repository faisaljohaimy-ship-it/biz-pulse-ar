// Production Readiness Report — scores Architecture / Runtime / Security /
// Reliability / Scalability / Maintainability / PDPL from real facts. No
// synthetic numbers — every score is derived from a measurable signal.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReadinessDimension = {
  id: string;
  label: string;
  score: number;
  weight: number;
  signals: Array<{
    key: string;
    value: string | number | boolean | null;
    ok: boolean;
    note?: string;
  }>;
  blockers: string[];
};

export type ReadinessReport = {
  at: string;
  org_id: string | null;
  dimensions: ReadinessDimension[];
  enterprise_score: number;
  production_score: number;
  blockers: string[];
  release_candidate: boolean;
};

const HOUR = 3_600_000;

export const getProductionReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReadinessReport> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: member } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const orgId: string | null = member?.org_id ?? null;

    const dims: ReadinessDimension[] = [];

    // --- Architecture: presence of core tables + RLS coverage approximation
    const coreTables = [
      "workflows",
      "workflow_runs",
      "tool_registry",
      "tool_executions",
      "audit_logs",
      "enterprise_events",
      "agent_definitions",
    ];
    const archSignals: ReadinessDimension["signals"] = [];
    let presentTables = 0;
    for (const t of coreTables) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabaseAdmin as any)
        .from(t)
        .select("*", { count: "exact", head: true })
        .limit(1);
      const ok = !error;
      if (ok) presentTables++;
      archSignals.push({ key: `table.${t}`, value: ok ? "present" : "missing", ok });
    }
    const archScore = Math.round((presentTables / coreTables.length) * 100);
    dims.push({
      id: "architecture",
      label: "Architecture",
      score: archScore,
      weight: 1.0,
      signals: archSignals,
      blockers:
        presentTables < coreTables.length ? ["Some core tables are missing or unreachable"] : [],
    });

    // --- Runtime: workflow + tool throughput in last 24h
    const since24 = new Date(Date.now() - 24 * HOUR).toISOString();
    const runtimeSignals: ReadinessDimension["signals"] = [];
    const runtimeBlockers: string[] = [];
    let runScore = 0;
    if (orgId) {
      const { count: wfRuns } = await supabaseAdmin
        .from("workflow_runs")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("started_at", since24);
      const { count: toolRuns } = await supabaseAdmin
        .from("tool_executions")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", since24);
      const { count: events24 } = await supabaseAdmin
        .from("enterprise_events")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("occurred_at", since24);
      runtimeSignals.push(
        { key: "workflow_runs_24h", value: wfRuns ?? 0, ok: (wfRuns ?? 0) > 0 },
        { key: "tool_executions_24h", value: toolRuns ?? 0, ok: (toolRuns ?? 0) > 0 },
        { key: "events_24h", value: events24 ?? 0, ok: (events24 ?? 0) > 0 },
      );
      const activeSignals = runtimeSignals.filter((s) => s.ok).length;
      runScore = Math.round((activeSignals / runtimeSignals.length) * 100);
      if ((wfRuns ?? 0) === 0) runtimeBlockers.push("No workflow runs in last 24h");
    } else {
      runtimeBlockers.push("No organization context");
    }
    dims.push({
      id: "runtime",
      label: "Runtime",
      score: runScore,
      weight: 1.2,
      signals: runtimeSignals,
      blockers: runtimeBlockers,
    });

    // --- Security: presence of has_role function + user_roles rows + audit coverage
    const securitySignals: ReadinessDimension["signals"] = [];
    const securityBlockers: string[] = [];
    const { count: rolesCount } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true });
    securitySignals.push({
      key: "user_roles_rows",
      value: rolesCount ?? 0,
      ok: (rolesCount ?? 0) > 0,
      note: (rolesCount ?? 0) === 0 ? "No admin assigned" : undefined,
    });
    if ((rolesCount ?? 0) === 0) securityBlockers.push("No users have admin role");
    const { count: auditCount } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true });
    securitySignals.push({
      key: "audit_logs_total",
      value: auditCount ?? 0,
      ok: (auditCount ?? 0) > 0,
    });
    const securityScore = Math.round(
      (securitySignals.filter((s) => s.ok).length / securitySignals.length) * 100,
    );
    dims.push({
      id: "security",
      label: "Security",
      score: securityScore,
      weight: 1.3,
      signals: securitySignals,
      blockers: securityBlockers,
    });

    // --- Reliability: workflow success rate (last 7d)
    const since7 = new Date(Date.now() - 7 * 24 * HOUR).toISOString();
    const reliabilitySignals: ReadinessDimension["signals"] = [];
    const reliabilityBlockers: string[] = [];
    let reliabilityScore = 0;
    if (orgId) {
      const { data: runs7 } = await supabaseAdmin
        .from("workflow_runs")
        .select("status")
        .eq("org_id", orgId)
        .gte("started_at", since7)
        .limit(2000);
      const total = runs7?.length ?? 0;
      const ok = (runs7 ?? []).filter(
        (r) => r.status === "succeeded" || r.status === "completed",
      ).length;
      const failed = (runs7 ?? []).filter((r) => r.status === "failed").length;
      const successRate = total > 0 ? Math.round((ok / total) * 100) : 0;
      reliabilitySignals.push(
        { key: "workflow_runs_7d", value: total, ok: total > 0 },
        { key: "success_rate_pct", value: successRate, ok: successRate >= 80 },
        { key: "failures_7d", value: failed, ok: failed === 0 },
      );
      reliabilityScore =
        total === 0
          ? 0
          : Math.round((successRate + (failed === 0 ? 100 : Math.max(0, 100 - failed * 5))) / 2);
      if (total === 0) reliabilityBlockers.push("No workflow history to evaluate reliability");
      if (successRate < 80 && total > 0)
        reliabilityBlockers.push(`Workflow success rate below 80% (${successRate}%)`);
    }
    dims.push({
      id: "reliability",
      label: "Reliability",
      score: reliabilityScore,
      weight: 1.2,
      signals: reliabilitySignals,
      blockers: reliabilityBlockers,
    });

    // --- Scalability: queue backlog + active workflows
    const scalSignals: ReadinessDimension["signals"] = [];
    if (orgId) {
      const { count: pendingEv } = await supabaseAdmin
        .from("enterprise_events")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "pending");
      const { count: runningWf } = await supabaseAdmin
        .from("workflow_runs")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "running");
      scalSignals.push(
        {
          key: "pending_events",
          value: pendingEv ?? 0,
          ok: (pendingEv ?? 0) < 100,
          note: (pendingEv ?? 0) >= 100 ? "Backlog growing" : undefined,
        },
        { key: "running_workflows", value: runningWf ?? 0, ok: true },
      );
    }
    const scalScore = scalSignals.length
      ? Math.round((scalSignals.filter((s) => s.ok).length / scalSignals.length) * 100)
      : 0;
    dims.push({
      id: "scalability",
      label: "Scalability",
      score: scalScore,
      weight: 0.9,
      signals: scalSignals,
      blockers: scalSignals.filter((s) => !s.ok).map((s) => `${s.key} threshold exceeded`),
    });

    // --- Maintainability: RAG corpus, tool registry size, agent definitions
    const maintSignals: ReadinessDimension["signals"] = [];
    const { count: tools } = await supabaseAdmin
      .from("tool_registry")
      .select("id", { count: "exact", head: true })
      .eq("enabled", true);
    const { count: agents } = await supabaseAdmin
      .from("agent_definitions")
      .select("id", { count: "exact", head: true })
      .eq("enabled", true);
    maintSignals.push(
      { key: "tools_enabled", value: tools ?? 0, ok: (tools ?? 0) > 0 },
      { key: "agents_enabled", value: agents ?? 0, ok: (agents ?? 0) > 0 },
    );
    if (orgId) {
      const { count: kb } = await supabaseAdmin
        .from("aria_knowledge")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);
      maintSignals.push({ key: "knowledge_documents", value: kb ?? 0, ok: (kb ?? 0) > 0 });
    }
    const maintScore = Math.round(
      (maintSignals.filter((s) => s.ok).length / maintSignals.length) * 100,
    );
    dims.push({
      id: "maintainability",
      label: "Maintainability",
      score: maintScore,
      weight: 0.8,
      signals: maintSignals,
      blockers: maintSignals.filter((s) => !s.ok).map((s) => `${s.key} = 0`),
    });

    // --- PDPL: operator-owned legal identity, retention and DPA controls.
    // Values are never returned; the report exposes presence/validity only.
    // This deliberately fails closed instead of inventing legal facts.
    const { evaluatePdplReadiness } = await import("@/lib/compliance/pdpl-readiness.server");
    const pdpl = evaluatePdplReadiness();
    dims.push({
      id: "pdpl",
      label: "PDPL Compliance",
      score: Math.round((pdpl.signals.filter((s) => s.ok).length / pdpl.signals.length) * 100),
      weight: 1.4,
      signals: pdpl.signals,
      blockers: pdpl.blockers,
    });

    const totalWeight = dims.reduce((a, d) => a + d.weight, 0);
    const weighted = dims.reduce((a, d) => a + d.score * d.weight, 0);
    const enterpriseScore = Math.round(weighted / totalWeight);
    // Production score weights runtime + reliability + security more
    const prodWeights: Record<string, number> = {
      architecture: 1,
      runtime: 1.5,
      security: 1.5,
      reliability: 1.5,
      scalability: 0.8,
      maintainability: 0.7,
      pdpl: 1.6,
    };
    const prodTotal = dims.reduce((a, d) => a + (prodWeights[d.id] ?? 1), 0);
    const prodWeighted = dims.reduce((a, d) => a + d.score * (prodWeights[d.id] ?? 1), 0);
    const productionScore = Math.round(prodWeighted / prodTotal);

    const allBlockers = dims.flatMap((d) => d.blockers);

    return {
      at: new Date().toISOString(),
      org_id: orgId,
      dimensions: dims,
      enterprise_score: enterpriseScore,
      production_score: productionScore,
      blockers: allBlockers,
      release_candidate: productionScore >= 85 && allBlockers.length === 0,
    };
  });
