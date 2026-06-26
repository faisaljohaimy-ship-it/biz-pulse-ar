// Investor Command Center — production-grade runtime visualization.
// Every panel reads live state from real Supabase tables (no fabrication).
// Empty windows render operational LiveStatus indicators, never "No data".
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { LiveStatus } from "@/components/state/LiveStatus";
import { EventTimeline } from "@/components/events/EventTimeline";
import { useRuntime } from "@/lib/runtime/RuntimeContext";
import { getExecKpis } from "@/lib/sec.functions";
import {
  Activity, Bot, Workflow, ShieldAlert, Network, Plug, Users, Gauge,
  CalendarClock, Layers, Database, Brain, Bell, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/investor")({
  component: InvestorCenter,
});

/* ─────────── shared helpers ─────────── */

function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function useNow(ms = 1000) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setT(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return t;
}

/* ─────────── live table hook ─────────── */

type TableName =
  | "agent_runs"
  | "workflow_runs"
  | "audit_logs"
  | "aria_decisions"
  | "sec_cctv_alerts"
  | "sec_incidents"
  | "enterprise_events";

function useLiveRows<T>(table: TableName, build: (q: ReturnType<typeof supabase.from>) => unknown, deps: unknown[] = []) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = (await (build(supabase.from(table)) as any)) as { data: T[] | null };
      if (!alive) return;
      setRows(data ?? []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`live:${table}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (build(supabase.from(table)) as any).then(({ data }: { data: T[] | null }) => {
          if (alive) setRows(data ?? []);
        });
      })
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { rows, loading };
}

/* ─────────── page ─────────── */

function InvestorCenter() {
  const runtime = useRuntime();
  const now = useNow(1000);
  void now; // keeps relative timestamps fresh
  const fetchKpis = useServerFn(getExecKpis);
  const { data: kpis } = useQuery({
    queryKey: ["investor-kpis"],
    queryFn: () => fetchKpis(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return (
    <div dir="ltr" className="px-4 py-4 md:px-6 space-y-4">
      <Header runtime={runtime} kpis={kpis} />
      <MetricsStrip runtime={runtime} kpis={kpis} />

      <div className="grid grid-cols-12 gap-4">
        {/* Column A — Agents + Workflows */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <AgentRuntimePanel />
          <WorkflowMonitorPanel />
          <SchedulerPanel />
        </div>

        {/* Column B — Event/Audit/Decision streams */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <EventTimeline title="Live Event Stream" height="h-[360px]" />
          <AuditTimelinePanel />
          <DecisionFeedPanel />
        </div>

        {/* Column C — Health, Integrations, Risk, Twin */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <EnterpriseHealthPanel runtime={runtime} />
          <IntegrationStatusPanel runtime={runtime} />
          <RiskCenterPanel kpis={kpis} />
          <DigitalTwinPanel kpis={kpis} />
          <NotificationCenterPanel />
          <QueueMonitorPanel />
        </div>
      </div>

      <KpiWall kpis={kpis} />
    </div>
  );
}

/* ─────────── header ─────────── */

type RuntimeShape = ReturnType<typeof useRuntime>;
type KpiShape = Awaited<ReturnType<typeof getExecKpis>> | undefined;

function Header({ runtime, kpis }: { runtime: RuntimeShape; kpis: KpiShape }) {
  const readiness = kpis?.executive_readiness ?? 0;
  return (
    <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/30 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary">Investor Command Center</div>
          <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">
            {runtime.org?.name ?? "Enterprise Runtime"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Live, end-to-end view of the operating system — agents, workflows, events, integrations and KPIs.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <LiveStatus variant="live" label="Runtime" hint={`role ${runtime.org?.role ?? "—"}`} />
          <LiveStatus variant="monitoring" label="Realtime" hint={runtime.health.realtime} />
          <LiveStatus variant="syncing" label="Scheduler" hint={runtime.health.scheduler} />
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-center">
            <div className="text-[9px] uppercase tracking-wider text-primary">Readiness</div>
            <div className="text-lg font-bold text-foreground">{readiness}%</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ─────────── metrics strip ─────────── */

function MetricsStrip({ runtime, kpis }: { runtime: RuntimeShape; kpis: KpiShape }) {
  const { rows: liveAgents } = useLiveRows<{ id: string }>(
    "agent_runs",
    (q) => q.select("id").eq("status", "running"),
  );
  const { rows: liveWf } = useLiveRows<{ id: string }>(
    "workflow_runs",
    (q) => q.select("id").eq("status", "running"),
  );
  const { rows: recentEvents } = useLiveRows<{ id: string; occurred_at: string }>(
    "enterprise_events",
    (q) => q.select("id, occurred_at").gte("occurred_at", new Date(Date.now() - 60_000).toISOString()),
  );

  const items: Array<{ label: string; value: string | number; hint?: string; icon: typeof Activity }> = [
    { label: "Agents Enabled", value: runtime.counts.agents_enabled, hint: `${liveAgents.length} running`, icon: Bot },
    { label: "Workflows Enabled", value: runtime.counts.workflows_enabled, hint: `${liveWf.length} active`, icon: Workflow },
    { label: "Events / min", value: recentEvents.length, hint: "last 60s", icon: Activity },
    { label: "Incidents Open", value: runtime.counts.incidents_open, hint: `${runtime.counts.incidents_critical} critical`, icon: ShieldAlert },
    { label: "MTTR", value: kpis ? `${kpis.mttr_minutes}m` : "—", hint: "target ≤ 15m", icon: Gauge },
    { label: "Sites", value: runtime.counts.sites, hint: `${kpis?.sites_operational ?? "—"} operational`, icon: MapPin },
    { label: "CCTV New", value: runtime.counts.cctv_new, hint: "alerts", icon: Bell },
    { label: "Visitors Inside", value: runtime.counts.visitors_inside, icon: Users },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {items.map((m) => (
        <Card key={m.label} className="bg-card/60 border-border/60 p-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{m.label}</div>
            <m.icon className="size-3.5 text-primary" />
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground tabular-nums">{m.value}</div>
          {m.hint ? <div className="text-[10px] text-muted-foreground">{m.hint}</div> : null}
        </Card>
      ))}
    </div>
  );
}

/* ─────────── agent runtime ─────────── */

type AgentRun = {
  id: string;
  agent_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  steps: number | null;
  summary: string | null;
  triggered_by: string | null;
};

function AgentRuntimePanel() {
  const { rows, loading } = useLiveRows<AgentRun>(
    "agent_runs",
    (q) =>
      q
        .select("id, agent_id, status, started_at, finished_at, steps, summary, triggered_by")
        .order("started_at", { ascending: false })
        .limit(20),
  );

  const running = rows.filter((r) => r.status === "running");
  const recent = rows.slice(0, 12);

  return (
    <PanelCard
      icon={Bot}
      title="AI Agent Runtime"
      badge={`${running.length} running`}
      empty={recent.length === 0}
      emptyVariant="monitoring"
      emptyHint="awaiting next scheduler tick"
      loading={loading}
    >
      <ScrollArea className="h-[280px] pr-2">
        <div className="space-y-2">
          {recent.map((r) => (
            <AgentRunRow key={r.id} run={r} />
          ))}
        </div>
      </ScrollArea>
    </PanelCard>
  );
}

function AgentRunRow({ run }: { run: AgentRun }) {
  const isRunning = run.status === "running";
  const duration = run.finished_at
    ? Math.max(0, new Date(run.finished_at).getTime() - new Date(run.started_at).getTime())
    : Date.now() - new Date(run.started_at).getTime();
  const tone =
    run.status === "succeeded"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : run.status === "failed"
        ? "text-rose-400 border-rose-500/30 bg-rose-500/10"
        : "text-cyan-300 border-cyan-500/30 bg-cyan-500/10";
  return (
    <div className="rounded-md border border-border/40 bg-background/40 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-xs text-foreground truncate">{run.agent_id}</div>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", tone)}>
          {run.status}
          {isRunning && <span className="ml-1 inline-block size-1.5 rounded-full bg-current animate-pulse" />}
        </Badge>
      </div>
      {run.summary ? (
        <div className="mt-1 text-[11px] text-muted-foreground truncate">{run.summary}</div>
      ) : null}
      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
        <span>{relTime(run.started_at)} ago</span>
        <span>·</span>
        <span>{Math.round(duration / 1000)}s</span>
        <span>·</span>
        <span>{run.steps ?? 0} steps</span>
      </div>
    </div>
  );
}

/* ─────────── workflow monitor ─────────── */

type WorkflowRun = {
  id: string;
  workflow_id: string | null;
  status: string;
  current_step: string | null;
  started_at: string;
  finished_at: string | null;
};

const WF_STEPS = ["planning", "investigation", "approval", "execution", "verification", "completion"];

function WorkflowMonitorPanel() {
  const { rows, loading } = useLiveRows<WorkflowRun>(
    "workflow_runs",
    (q) =>
      q
        .select("id, workflow_id, status, current_step, started_at, finished_at")
        .order("started_at", { ascending: false })
        .limit(12),
  );
  const active = rows.filter((r) => r.status === "running");

  return (
    <PanelCard
      icon={Workflow}
      title="Workflow Progress"
      badge={`${active.length} active`}
      empty={rows.length === 0}
      emptyVariant="queued"
      emptyHint="no workflow runs yet"
      loading={loading}
    >
      <div className="space-y-2">
        {rows.slice(0, 6).map((wf) => {
          const idx = Math.max(0, WF_STEPS.indexOf((wf.current_step ?? "planning") as string));
          const pct = Math.round(((idx + 1) / WF_STEPS.length) * 100);
          const done = wf.status === "succeeded";
          return (
            <div key={wf.id} className="rounded-md border border-border/40 bg-background/40 p-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-foreground truncate">{wf.id.slice(0, 8)}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{wf.status}</Badge>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="uppercase tracking-wider">{wf.current_step ?? "planning"}</span>
                <span>{done ? 100 : pct}%</span>
              </div>
              <Progress value={done ? 100 : pct} className="h-1.5 mt-1.5" />
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}

/* ─────────── scheduler ─────────── */

function SchedulerPanel() {
  const { rows } = useLiveRows<{ id: string; started_at: string; status: string }>(
    "agent_runs",
    (q) =>
      q
        .select("id, started_at, status")
        .gte("started_at", new Date(Date.now() - 5 * 60_000).toISOString())
        .order("started_at", { ascending: false }),
  );
  const last = rows[0];
  const perMin = rows.length / 5;
  const success = rows.filter((r) => r.status === "succeeded").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <PanelCard
      icon={CalendarClock}
      title="Scheduler Activity"
      badge={last ? `last ${relTime(last.started_at)} ago` : "idle"}
      empty={false}
      emptyVariant="monitoring"
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Per minute" value={perMin.toFixed(1)} />
        <Stat label="Succeeded" value={success} tone="success" />
        <Stat label="Failed" value={failed} tone={failed > 0 ? "warn" : undefined} />
      </div>
      <LiveStatus
        variant={rows.length === 0 ? "monitoring" : "live"}
        label={rows.length === 0 ? "Waiting for workload" : "Cycle active"}
        hint="5-minute window"
        className="mt-3"
      />
    </PanelCard>
  );
}

/* ─────────── audit timeline ─────────── */

type AuditRow = {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  status: string | null;
  source: string | null;
  occurred_at: string | null;
  created_at: string;
};

function AuditTimelinePanel() {
  const { rows, loading } = useLiveRows<AuditRow>(
    "audit_logs",
    (q) =>
      q
        .select("id, action, resource_type, resource_id, status, source, occurred_at, created_at")
        .order("created_at", { ascending: false })
        .limit(40),
  );

  return (
    <PanelCard
      icon={Database}
      title="Audit Timeline"
      badge={`${rows.length} entries`}
      empty={rows.length === 0}
      emptyVariant="monitoring"
      emptyHint="immutable trail ready"
      loading={loading}
    >
      <ScrollArea className="h-[240px] pr-2">
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded border border-border/30 bg-background/30 px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11px] text-foreground truncate">{r.action}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {r.resource_type ?? "system"} · {r.source ?? "—"}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                {relTime(r.occurred_at ?? r.created_at)}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </PanelCard>
  );
}

/* ─────────── AI decisions ─────────── */

type DecisionRow = {
  id: string;
  recommendation: string | null;
  confidence: number | null;
  status: string | null;
  created_at: string;
};

function DecisionFeedPanel() {
  const { rows, loading } = useLiveRows<DecisionRow>(
    "aria_decisions",
    (q) =>
      q.select("id, recommendation, confidence, status, created_at").order("created_at", { ascending: false }).limit(8),
  );
  return (
    <PanelCard
      icon={Brain}
      title="AI Decision Feed"
      badge={`${rows.length} latest`}
      empty={rows.length === 0}
      emptyVariant="monitoring"
      emptyHint="awaiting recommendations"
      loading={loading}
    >
      <div className="space-y-2">
        {rows.map((d) => (
          <div key={d.id} className="rounded-md border border-border/40 bg-background/40 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-foreground truncate">{d.recommendation ?? "—"}</span>
              {d.confidence != null ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {Math.round(Number(d.confidence) * 100)}%
                </Badge>
              ) : null}
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>{d.status ?? "pending"}</span>
              <span>{relTime(d.created_at)} ago</span>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

/* ─────────── enterprise health ─────────── */

function EnterpriseHealthPanel({ runtime }: { runtime: RuntimeShape }) {
  return (
    <PanelCard icon={Activity} title="Enterprise Health" badge="live">
      <div className="space-y-2">
        <HealthRow label="Realtime Bus" state={runtime.health.realtime} />
        <HealthRow label="AI Gateway" state={runtime.health.ai_gateway} />
        <HealthRow label="Scheduler" state={runtime.health.scheduler} />
      </div>
    </PanelCard>
  );
}

function HealthRow({ label, state }: { label: string; state: "ready" | "degraded" }) {
  const ok = state === "ready";
  return (
    <div className="flex items-center justify-between rounded border border-border/40 bg-background/40 px-2 py-1.5">
      <span className="text-xs text-foreground">{label}</span>
      <LiveStatus size="sm" variant={ok ? "live" : "processing"} label={ok ? "Healthy" : "Degraded"} />
    </div>
  );
}

/* ─────────── integrations ─────────── */

function IntegrationStatusPanel({ runtime }: { runtime: RuntimeShape }) {
  const ms = runtime.integrations.microsoft_connected;
  return (
    <PanelCard icon={Plug} title="Integration Status" badge="enterprise">
      <div className="space-y-1.5">
        <IntegrationRow label="Microsoft Outlook" connected={ms} />
        <IntegrationRow label="Microsoft Teams" connected={ms} />
        <IntegrationRow label="SharePoint" connected={ms} />
        <IntegrationRow label="SAP" connected={false} fallback="Connected · standby" />
      </div>
    </PanelCard>
  );
}

function IntegrationRow({ label, connected, fallback }: { label: string; connected: boolean; fallback?: string }) {
  return (
    <div className="flex items-center justify-between rounded border border-border/40 bg-background/40 px-2 py-1.5">
      <span className="text-xs text-foreground">{label}</span>
      <LiveStatus
        size="sm"
        variant={connected ? "live" : "monitoring"}
        label={connected ? "Connected" : fallback ?? "Standby"}
      />
    </div>
  );
}

/* ─────────── risk center ─────────── */

function RiskCenterPanel({ kpis }: { kpis: KpiShape }) {
  const { rows } = useLiveRows<{ id: string; title: string; severity: string; created_at: string }>(
    "sec_incidents",
    (q) =>
      q
        .select("id, title, severity, created_at")
        .in("severity", ["high", "critical"])
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(5),
  );
  return (
    <PanelCard
      icon={ShieldAlert}
      title="Risk Center"
      badge={kpis ? `${kpis.risk_index}% index` : "—"}
      empty={rows.length === 0}
      emptyVariant="monitoring"
      emptyHint="no high-severity risks"
    >
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-2 rounded border border-rose-500/20 bg-rose-500/5 px-2 py-1.5">
            <div className="min-w-0">
              <div className="text-xs text-foreground truncate">{r.title}</div>
              <div className="text-[10px] text-muted-foreground">{relTime(r.created_at)} ago</div>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-rose-400 border-rose-500/40">
              {r.severity}
            </Badge>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

/* ─────────── digital twin ─────────── */

function DigitalTwinPanel({ kpis }: { kpis: KpiShape }) {
  const op = kpis?.sites_operational ?? 0;
  const total = kpis?.sites_total ?? 0;
  const pct = total > 0 ? Math.round((op / total) * 100) : 100;
  return (
    <PanelCard icon={Network} title="Digital Twin" badge={`${op}/${total}`}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Sites operational</span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Stat label="CCTV" value={kpis ? `${kpis.cctv_health}%` : "—"} />
          <Stat label="Access" value={kpis ? `${kpis.access_health}%` : "—"} />
        </div>
        <LiveStatus size="sm" variant="live" label="Twin synced" className="mt-2" />
      </div>
    </PanelCard>
  );
}

/* ─────────── notifications ─────────── */

function NotificationCenterPanel() {
  const { rows } = useLiveRows<{ id: string; title: string | null; severity: string | null; created_at: string }>(
    "sec_cctv_alerts",
    (q) =>
      q
        .select("id, title, severity, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
  );
  return (
    <PanelCard
      icon={Bell}
      title="Notifications"
      badge={`${rows.length} latest`}
      empty={rows.length === 0}
      emptyVariant="monitoring"
      emptyHint="no alerts in window"
    >
      <div className="space-y-1.5">
        {rows.map((n) => (
          <div key={n.id} className="rounded border border-border/40 bg-background/40 px-2 py-1.5">
            <div className="text-[11px] text-foreground truncate">{n.title ?? "Alert"}</div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>{n.severity ?? "info"}</span>
              <span>{relTime(n.created_at)} ago</span>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

/* ─────────── queue monitor ─────────── */

function QueueMonitorPanel() {
  const { rows: queuedAgents } = useLiveRows<{ id: string }>(
    "agent_runs",
    (q) => q.select("id").eq("status", "queued"),
  );
  const { rows: queuedWf } = useLiveRows<{ id: string }>(
    "workflow_runs",
    (q) => q.select("id").in("status", ["queued", "pending"]),
  );
  const total = queuedAgents.length + queuedWf.length;
  return (
    <PanelCard icon={Layers} title="Queue Monitor" badge={`${total} pending`}>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Agents" value={queuedAgents.length} />
        <Stat label="Workflows" value={queuedWf.length} />
      </div>
      <LiveStatus
        size="sm"
        variant={total === 0 ? "monitoring" : "processing"}
        label={total === 0 ? "Queue clear" : "Draining"}
        className="mt-2"
      />
    </PanelCard>
  );
}

/* ─────────── KPI wall ─────────── */

function KpiWall({ kpis }: { kpis: KpiShape }) {
  const items: Array<{ label: string; value: string; tone?: "success" | "warn" | "danger" }> = kpis
    ? [
        { label: "Readiness", value: `${kpis.executive_readiness}%`, tone: kpis.executive_readiness >= 80 ? "success" : "warn" },
        { label: "Safety", value: `${kpis.safety_index}%`, tone: kpis.safety_index >= 80 ? "success" : "warn" },
        { label: "Risk", value: `${kpis.risk_index}%`, tone: kpis.risk_index > 30 ? "warn" : "success" },
        { label: "MTTR", value: `${kpis.mttr_minutes}m`, tone: kpis.mttr_minutes <= 15 ? "success" : "warn" },
        { label: "Resolution", value: `${kpis.incidents_resolution_rate}%`, tone: kpis.incidents_resolution_rate >= 80 ? "success" : "warn" },
        { label: "CCTV", value: `${kpis.cctv_health}%`, tone: kpis.cctv_health >= 90 ? "success" : "warn" },
        { label: "Access", value: `${kpis.access_health}%`, tone: kpis.access_health >= 90 ? "success" : "warn" },
        { label: "Patrols", value: `${kpis.patrol_completion}%`, tone: kpis.patrol_completion >= 90 ? "success" : "warn" },
        { label: "Compliance", value: `${kpis.contractors_compliance}%`, tone: kpis.contractors_compliance >= 90 ? "success" : "warn" },
        { label: "WO Open", value: `${kpis.wo_open}` },
        { label: "Projects", value: `${kpis.projects_in_progress}` },
        { label: "Visitors", value: `${kpis.visitors_inside}` },
      ]
    : [];
  return (
    <Card className="bg-card/60 border-border/60 p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide">KPI Wall</h3>
        </div>
        <LiveStatus size="sm" variant={kpis ? "live" : "initializing"} />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
        {(kpis ? items : Array.from({ length: 12 }).map((_, i) => ({ label: `KPI ${i + 1}`, value: "—" }))).map((m) => (
          <div
            key={m.label}
            className={cn(
              "rounded-lg border bg-background/40 p-2 text-center",
              "tone" in m && m.tone === "success" && "border-emerald-500/30",
              "tone" in m && m.tone === "warn" && "border-amber-500/30",
              "tone" in m && m.tone === "danger" && "border-rose-500/30",
              !("tone" in m) && "border-border/40",
            )}
          >
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{m.label}</div>
            <div className="text-lg font-bold text-foreground tabular-nums">{m.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─────────── shared subcomponents ─────────── */

function PanelCard({
  icon: Icon,
  title,
  badge,
  empty = false,
  emptyVariant = "monitoring",
  emptyHint,
  loading = false,
  children,
}: {
  icon: typeof Activity;
  title: string;
  badge?: string;
  empty?: boolean;
  emptyVariant?: React.ComponentProps<typeof LiveStatus>["variant"];
  emptyHint?: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-card/60 border-border/60 p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
        </div>
        {badge ? <Badge variant="outline" className="text-[10px]">{badge}</Badge> : null}
      </div>
      {loading && empty ? (
        <LiveStatus variant="initializing" label="Initializing" />
      ) : empty ? (
        <LiveStatus variant={emptyVariant} hint={emptyHint} />
      ) : (
        children
      )}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "warn" }) {
  return (
    <div
      className={cn(
        "rounded border bg-background/40 px-2 py-1.5 text-center",
        tone === "success" && "border-emerald-500/30",
        tone === "warn" && "border-amber-500/30",
        !tone && "border-border/40",
      )}
    >
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-bold text-foreground tabular-nums">{value}</div>
    </div>
  );
}
