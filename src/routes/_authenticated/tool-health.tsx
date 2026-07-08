import { RouteError, RouteNotFound } from "@/components/route-boundaries";
/**
 * Tool Health — live forensic dashboard for tool_executions. Pure read.
 * Shows success/failure %, P50/P95/P99 latency, top error classes,
 * and per-tool failure rates over the last 24 hours and last hour.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ErrClass = "timeout" | "schema" | "auth" | "rate_limit" | "upstream" | "network" | "permanent";

function classify(err: string | null | undefined): ErrClass {
  const m = (err ?? "").toLowerCase();
  if (m.includes("timed out") || m.includes("timeout")) return "timeout";
  if (
    m.includes("unknown column") ||
    m.includes("does not exist") ||
    m.includes("invalid input") ||
    m.includes("not in sql.read allowlist")
  )
    return "schema";
  if (
    m.includes("unauthorized") ||
    m.includes("forbidden") ||
    m.includes("401") ||
    m.includes("403")
  )
    return "auth";
  if (m.includes("rate") || m.includes("429")) return "rate_limit";
  if (m.includes("(5") || m.includes("upstream") || m.includes("bad gateway")) return "upstream";
  if (m.includes("network") || m.includes("fetch failed") || m.includes("econnreset"))
    return "network";
  return "permanent";
}

const fetchHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Admin-only endpoint: exposes tool identifiers, failure counts, and raw error text.
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      throw new Response("Forbidden", { status: 403 });
    }

    const sinceDay = new Date(Date.now() - 24 * 3600_000).toISOString();
    const sinceHour = new Date(Date.now() - 3600_000).toISOString();

    // Use the RLS-scoped client so tenant_isolation policies apply.
    const [day, hour] = await Promise.all([
      supabase
        .from("tool_executions")
        .select("status, duration_ms, error, tool_id")
        .gte("created_at", sinceDay)
        .limit(50_000),
      supabase
        .from("tool_executions")
        .select("status, duration_ms, error, tool_id")
        .gte("created_at", sinceHour)
        .limit(10_000),
    ]);

    const summarize = (
      rows: { status: string; duration_ms: number | null; error: string | null; tool_id: string }[],
    ) => {
      const total = rows.length;
      const failed = rows.filter((r) => r.status === "failed").length;
      const ok = rows.filter((r) => r.status === "succeeded").length;
      const durations = rows
        .map((r) => r.duration_ms ?? 0)
        .filter((n) => n > 0)
        .sort((a, b) => a - b);
      const pct = (p: number) =>
        durations.length
          ? durations[Math.min(durations.length - 1, Math.floor((p / 100) * durations.length))]
          : 0;
      const errorClasses: Record<ErrClass, number> = {
        timeout: 0,
        schema: 0,
        auth: 0,
        rate_limit: 0,
        upstream: 0,
        network: 0,
        permanent: 0,
      };
      const perTool: Record<string, { c: number; f: number }> = {};
      for (const r of rows) {
        const t = (perTool[r.tool_id] ??= { c: 0, f: 0 });
        t.c++;
        if (r.status === "failed") {
          t.f++;
          errorClasses[classify(r.error)]++;
        }
      }
      const topTools = Object.entries(perTool)
        .sort((a, b) => b[1].c - a[1].c)
        .slice(0, 10)
        .map(([id, v]) => ({
          id,
          count: v.c,
          failed: v.f,
          pct: v.c ? Math.round((v.f * 10000) / v.c) / 100 : 0,
        }));
      return {
        total,
        ok,
        failed,
        success_pct: total ? Math.round((ok * 10000) / total) / 100 : 0,
        failure_pct: total ? Math.round((failed * 10000) / total) / 100 : 0,
        latency: {
          p50: pct(50),
          p95: pct(95),
          p99: pct(99),
          avg: durations.length
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : 0,
        },
        errorClasses,
        topTools,
      };
    };

    return { day: summarize(day.data ?? []), hour: summarize(hour.data ?? []) };
  });

const healthOpts = queryOptions({
  queryKey: ["tool-health"],
  queryFn: () => fetchHealth(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/_authenticated/tool-health")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  loader: ({ context }) => context.queryClient.ensureQueryData(healthOpts),
  component: ToolHealthPage,
});

function StatRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono ${tone ?? "text-cyan-200"}`}>{value}</span>
    </div>
  );
}

function ToolHealthPage() {
  const { data } = useSuspenseQuery(healthOpts);
  const window = (w: typeof data.day, title: string) => (
    <Card className="border-cyan-500/20 bg-[#08172a]">
      <CardHeader>
        <CardTitle className="text-base text-cyan-100">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <StatRow label="Total" value={w.total.toLocaleString()} />
        <StatRow
          label="Succeeded"
          value={`${w.ok.toLocaleString()} (${w.success_pct}%)`}
          tone="text-emerald-300"
        />
        <StatRow
          label="Failed"
          value={`${w.failed.toLocaleString()} (${w.failure_pct}%)`}
          tone={w.failure_pct < 1 ? "text-emerald-300" : "text-red-300"}
        />
        <div className="pt-2 border-t border-cyan-500/10" />
        <StatRow label="Latency P50" value={`${w.latency.p50} ms`} />
        <StatRow label="Latency P95" value={`${w.latency.p95} ms`} />
        <StatRow label="Latency P99" value={`${w.latency.p99} ms`} />
        <StatRow label="Latency avg" value={`${w.latency.avg} ms`} />
        <div className="pt-2 border-t border-cyan-500/10" />
        <p className="text-xs text-slate-500 pt-1">Failure classification</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(Object.entries(w.errorClasses) as [ErrClass, number][])
            .filter(([, n]) => n > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([k, n]) => (
              <Badge key={k} variant="outline" className="border-cyan-500/30 text-cyan-200">
                {k}: {n}
              </Badge>
            ))}
          {Object.values(w.errorClasses).every((n) => n === 0) && (
            <span className="text-xs text-emerald-300">No failures.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-cyan-100">Tool Health · صحة الأدوات</h1>
        <p className="text-sm text-slate-400">
          Forensic view of <code>tool_executions</code>. Targets: failure &lt; 1%, P95 &lt; 5s.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {window(data.hour, "Last hour")}
        {window(data.day, "Last 24 hours")}
      </div>

      <Card className="border-cyan-500/20 bg-[#08172a]">
        <CardHeader>
          <CardTitle className="text-base text-cyan-100">Top tools (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-cyan-500/10">
                <th className="py-2">Tool</th>
                <th className="py-2 text-right">Calls</th>
                <th className="py-2 text-right">Failed</th>
                <th className="py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {data.day.topTools.map((t) => (
                <tr key={t.id} className="border-b border-cyan-500/5">
                  <td className="py-2 font-mono text-cyan-200">{t.id}</td>
                  <td className="py-2 text-right">{t.count.toLocaleString()}</td>
                  <td className="py-2 text-right">{t.failed}</td>
                  <td
                    className={`py-2 text-right ${t.pct < 1 ? "text-emerald-300" : "text-red-300"}`}
                  >
                    {t.pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
