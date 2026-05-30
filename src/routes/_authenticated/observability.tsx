import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/observability")({
  component: ObservabilityPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Error: {error.message}</div>,
});

function ObservabilityPage() {
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
    refetchInterval: 15_000,
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

  const totals = (usage.data ?? []).reduce(
    (acc, r) => {
      acc.tokens += r.total_tokens ?? 0;
      acc.cost += Number(r.cost_usd ?? 0);
      acc.calls += 1;
      return acc;
    },
    { tokens: 0, cost: 0, calls: 0 },
  );

  const byModel = Object.entries(
    (usage.data ?? []).reduce<Record<string, { tokens: number; cost: number; calls: number }>>((acc, r) => {
      const k = r.model ?? "unknown";
      acc[k] ??= { tokens: 0, cost: 0, calls: 0 };
      acc[k].tokens += r.total_tokens ?? 0;
      acc[k].cost += Number(r.cost_usd ?? 0);
      acc[k].calls += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].tokens - a[1].tokens);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Observability" subtitle="Audit logs, AI token consumption, system health" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="AI calls (last 500)" value={totals.calls.toLocaleString()} />
        <Stat label="Total tokens" value={totals.tokens.toLocaleString()} />
        <Stat label="Estimated cost (USD)" value={`$${totals.cost.toFixed(4)}`} />
      </div>

      <Card>
        <CardHeader><CardTitle>AI consumption by model</CardTitle></CardHeader>
        <CardContent>
          {byModel.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI usage recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground"><tr>
                <th className="text-left py-2">Model</th>
                <th className="text-right">Calls</th>
                <th className="text-right">Tokens</th>
                <th className="text-right">Cost</th>
              </tr></thead>
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
        <CardHeader><CardTitle>Recent audit events</CardTitle></CardHeader>
        <CardContent>
          {(audits.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
          ) : (
            <ul className="space-y-2 max-h-[480px] overflow-auto">
              {audits.data!.map((a) => (
                <li key={a.id} className="flex items-center gap-3 text-sm border-b border-border/40 pb-2">
                  <Badge variant="outline">{a.action}</Badge>
                  {a.entity && <span className="font-mono text-xs text-muted-foreground">{a.entity}</span>}
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
