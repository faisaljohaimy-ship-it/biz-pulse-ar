import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import {
  getCostBudgetStatus,
  getSecretsRotationStatus,
} from "@/lib/governance/governance.functions";

export const Route = createFileRoute("/_authenticated/observability")({
  component: ObservabilityPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Error: {error.message}</div>,
});

function ObservabilityPage() {
  const fetchBudget = useServerFn(getCostBudgetStatus);
  const fetchRotation = useServerFn(getSecretsRotationStatus);

  const audits = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
    refetchInterval: 45_000,
  });

  const usage = useQuery({
    queryKey: ["ai-usage"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_usage")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const budget = useQuery({
    queryKey: ["cost-budget"],
    queryFn: () => fetchBudget(),
    refetchInterval: 60_000,
  });

  const rotation = useQuery({
    queryKey: ["secrets-rotation"],
    queryFn: () => fetchRotation(),
    refetchInterval: 300_000,
  });

  const totals = (usage.data ?? []).reduce(
    (acc, r) => {
      acc.tokens += r.total_tokens ?? 0;
      acc.cost += Number(r.cost_usd ?? 0);
      acc.calls += 1;
      acc.latencies.push(r.latency_ms ?? 0);
      return acc;
    },
    { tokens: 0, cost: 0, calls: 0, latencies: [] as number[] },
  );

  const sorted = [...totals.latencies].sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;

  const byModel = Object.entries(
    (usage.data ?? []).reduce<Record<string, { tokens: number; cost: number; calls: number }>>(
      (acc, r) => {
        const k = r.model ?? "unknown";
        acc[k] ??= { tokens: 0, cost: 0, calls: 0 };
        acc[k].tokens += r.total_tokens ?? 0;
        acc[k].cost += Number(r.cost_usd ?? 0);
        acc[k].calls += 1;
        return acc;
      },
      {},
    ),
  ).sort((a, b) => b[1].tokens - a[1].tokens);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Observability & Governance"
        subtitle="Cost budgets, secrets rotation, AI consumption, audit trail"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="AI calls (last 500)" value={totals.calls.toLocaleString()} />
        <Stat label="Total tokens" value={totals.tokens.toLocaleString()} />
        <Stat label="Estimated cost (USD)" value={`$${totals.cost.toFixed(4)}`} />
        <Stat label="Latency p95" value={`${p95} ms`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost budgets — current month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(budget.data ?? []).map((b) => (
            <div key={b.scope} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono">{b.scope}</span>
                  <Badge
                    variant={
                      b.state === "exceeded"
                        ? "destructive"
                        : b.state === "warning"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {b.state}
                  </Badge>
                </div>
                <span className="tabular-nums">
                  ${b.month_spend_usd.toFixed(4)} /{" "}
                  {b.monthly_cap_usd > 0 ? `$${b.monthly_cap_usd.toFixed(2)}` : "no cap"}
                </span>
              </div>
              {b.monthly_cap_usd > 0 && <Progress value={Math.min(b.pct_used, 100)} />}
              {b.state === "unset" && (
                <p className="text-xs text-muted-foreground">
                  No budget configured. Insert a row into <code>cost_budgets</code> for this org to
                  enable alerts.
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Secrets rotation status</CardTitle>
        </CardHeader>
        <CardContent>
          {(rotation.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Admin role required to view rotation status, or no secrets tracked yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-2">Secret</th>
                  <th className="text-left">Last rotated</th>
                  <th className="text-left">Next due</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {rotation.data!.map((r) => (
                  <tr key={r.secret_name} className="border-t border-border/40">
                    <td className="py-2 font-mono text-xs">{r.secret_name}</td>
                    <td>
                      {r.last_rotated_at ? new Date(r.last_rotated_at).toLocaleDateString() : "—"}
                    </td>
                    <td>{r.next_due_at ? new Date(r.next_due_at).toLocaleDateString() : "—"}</td>
                    <td className="text-right">
                      {!r.last_rotated_at ? (
                        <Badge variant="outline">untracked</Badge>
                      ) : r.days_overdue ? (
                        <Badge variant="destructive">{r.days_overdue}d overdue</Badge>
                      ) : (
                        <Badge variant="secondary">ok</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI consumption by model</CardTitle>
        </CardHeader>
        <CardContent>
          {byModel.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI usage recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-2">Model</th>
                  <th className="text-right">Calls</th>
                  <th className="text-right">Tokens</th>
                  <th className="text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {byModel.map(([m, v]) => (
                  <tr key={m} className="border-t border-border/40">
                    <td className="py-2 font-mono text-xs">{m}</td>
                    <td className="text-right">{v.calls}</td>
                    <td className="text-right">{v.tokens.toLocaleString()}</td>
                    <td className="text-right">${v.cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit events</CardTitle>
        </CardHeader>
        <CardContent>
          {(audits.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
          ) : (
            <ul className="space-y-2 max-h-[480px] overflow-auto">
              {audits.data!.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 text-sm border-b border-border/40 pb-2"
                >
                  <Badge variant="outline">{a.action}</Badge>
                  {a.entity && (
                    <span className="font-mono text-xs text-muted-foreground">{a.entity}</span>
                  )}
                  {a.route && <span className="text-xs text-muted-foreground">{a.route}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-semibold mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}
