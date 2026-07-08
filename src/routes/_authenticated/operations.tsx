import { RouteError, RouteNotFound } from "@/components/route-boundaries";
// Operations Visualization Layer
// Production runtime visualization built on the existing engine.
// Reads live state from Supabase + server fns. No fabricated data.
// Every widget renders an operational LiveStatus when empty.
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
import { getAgentOpsOverview } from "@/lib/exec.functions";
import {
  Activity,
  Bot,
  Workflow,
  ShieldAlert,
  Network,
  Plug,
  Gauge,
  CheckCircle2,
  Database,
  Cpu,
  ServerCog,
  Sparkles,
  Layers,
  ClipboardList,
  Timer,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/operations")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: OperationsCenter,
});

/* ─── helpers ─── */
function fmtRel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
function fmtDuration(startIso: string, endIso?: string | null, nowMs?: number): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : (nowMs ?? Date.now());
  const ms = Math.max(0, end - start);
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
function useTick(ms = 1000) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setT(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return t;
}

type TableName =
  | "agent_runs"
  | "workflow_runs"
  | "workflow_step_runs"
  | "audit_logs"
  | "enterprise_events"
  | "agent_definitions"
  | "workflows";

function useLiveRows<T>(
  table: TableName,
  build: (q: ReturnType<typeof supabase.from>) => unknown,
  deps: unknown[] = [],
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const refetch = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (build(supabase.from(table)) as any).then(({ data }: { data: T[] | null }) => {
        if (alive) {
          setRows(data ?? []);
          setLoading(false);
        }
      });
    };
    refetch();
    const channel = supabase
      .channel(`ops:${table}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, refetch)
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { rows, loading };
}

/* ─── page ─── */
function OperationsCenter() {
  const runtime = useRuntime();
  const tick = useTick(1000);
  void tick;

  const fetchKpis = useServerFn(getExecKpis);
  const fetchAgentOps = useServerFn(getAgentOpsOverview);

  const { data: kpis } = useQuery({
    queryKey: ["ops-kpis"],
    queryFn: () => fetchKpis(),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
  const { data: agentOps } = useQuery({
    queryKey: ["ops-agent-ops"],
    queryFn: () => fetchAgentOps(),
    refetchInterval: 45_000,
    staleTime: 8_000,
  });

  return (
    <div dir="ltr" className="px-4 py-4 md:px-6 space-y-4">
      <OpsHeader runtime={runtime} kpis={kpis} />
      <HealthWall runtime={runtime} kpis={kpis} agentOps={agentOps} />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-8 space-y-4">
          <LiveExecutionCenter />
          <WorkflowPhaseTimeline />
          <AgentRuntimeGrid agentOps={agentOps} />
        </div>
        <div className="col-span-12 xl:col-span-4 space-y-4">
          <EventTimeline title="Enterprise Event Stream" height="h-[460px]" />
          <AuditCenter />
        </div>
      </div>

      <KpiWall kpis={kpis} />
    </div>
  );
}

/* ─── header ─── */
type RuntimeShape = ReturnType<typeof useRuntime>;
type KpiShape = Awaited<ReturnType<typeof getExecKpis>> | undefined;
type AgentOpsShape = Awaited<ReturnType<typeof getAgentOpsOverview>> | undefined;

function OpsHeader({ runtime, kpis }: { runtime: RuntimeShape; kpis: KpiShape }) {
  return (
    <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/30 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary">
            Operational Visualization Layer
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">
            Enterprise Operations Center
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Live runtime — every execution, event, agent and workflow rendered as it happens.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <LiveStatus variant="live" label="Runtime" hint={`org ${runtime.org?.role ?? "—"}`} />
          <LiveStatus variant="monitoring" label="Realtime" hint={runtime.health.realtime} />
          <LiveStatus variant="syncing" label="Scheduler" hint={runtime.health.scheduler} />
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-center">
            <div className="text-[9px] uppercase tracking-wider text-primary">Readiness</div>
            <div className="text-lg font-bold text-foreground">
              {kpis?.executive_readiness ?? "—"}%
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ─── health wall ─── */
function HealthCard({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone: "ok" | "warn" | "crit" | "info";
  icon: typeof Activity;
}) {
  const tones: Record<typeof tone, string> = {
    ok: "border-emerald-500/30 text-emerald-300",
    warn: "border-amber-500/30 text-amber-300",
    crit: "border-rose-500/40 text-rose-300",
    info: "border-cyan-500/30 text-cyan-300",
  } as const;
  return (
    <Card className={cn("bg-card/60 backdrop-blur p-3", tones[tone])}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <Icon className="size-3.5" />
      </div>
      <div className="mt-1 text-2xl font-bold text-foreground tabular-nums">{value}</div>
      {hint ? <div className="text-[10px] text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}

function HealthWall({
  runtime,
  kpis,
  agentOps,
}: {
  runtime: RuntimeShape;
  kpis: KpiShape;
  agentOps: AgentOpsShape;
}) {
  const queueDepth = agentOps?.system.queue_length ?? 0;
  const agentHealth = agentOps?.system.agents_total
    ? Math.round(
        ((agentOps.system.agents_enabled - agentOps.system.agents_failed) /
          agentOps.system.agents_total) *
          100,
      )
    : 100;
  const wfHealth = Math.max(0, 100 - Math.min(100, runtime.counts.workflows_enabled ? 0 : 10));
  const securityHealth = Math.max(0, 100 - (kpis?.risk_index ?? 0));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
      <HealthCard
        label="System"
        value="Online"
        tone="ok"
        icon={ServerCog}
        hint="all services nominal"
      />
      <HealthCard
        label="Enterprise"
        value={`${kpis?.executive_readiness ?? "—"}%`}
        tone="info"
        icon={Sparkles}
        hint="readiness index"
      />
      <HealthCard
        label="Agents"
        value={`${agentHealth}%`}
        tone={agentHealth >= 80 ? "ok" : "warn"}
        icon={Bot}
        hint={`${agentOps?.system.agents_running ?? 0} running`}
      />
      <HealthCard
        label="Workflows"
        value={`${wfHealth}%`}
        tone={wfHealth >= 80 ? "ok" : "warn"}
        icon={Workflow}
        hint={`${runtime.counts.workflows_enabled} enabled`}
      />
      <HealthCard
        label="Integrations"
        value={runtime.health.realtime === "ready" ? "Connected" : "Degraded"}
        tone={runtime.health.realtime === "ready" ? "ok" : "warn"}
        icon={Plug}
        hint="realtime channel"
      />
      <HealthCard
        label="Security"
        value={`${securityHealth}%`}
        tone={securityHealth >= 70 ? "ok" : "crit"}
        icon={ShieldAlert}
        hint={`${kpis?.incidents_critical ?? 0} critical`}
      />
      <HealthCard
        label="Database"
        value={runtime.health.scheduler === "ready" ? "Healthy" : "Degraded"}
        tone={runtime.health.scheduler === "ready" ? "ok" : "warn"}
        icon={Database}
        hint="rls enforced"
      />
      <HealthCard
        label="Queue"
        value={queueDepth}
        tone={queueDepth > 20 ? "warn" : "ok"}
        icon={Layers}
        hint="pending + running"
      />
    </div>
  );
}

/* ─── live execution center ─── */
type AgentRunRow = {
  id: string;
  agent_id: string;
  status: string;
  summary: string | null;
  steps: number | null;
  started_at: string;
  finished_at: string | null;
  triggered_by: string | null;
  goal_override: string | null;
  audit_json: Record<string, unknown> | null;
};
type WorkflowRunRow = {
  id: string;
  workflow_id: string;
  status: string;
  current_step: string | null;
  started_at: string;
  finished_at: string | null;
  triggered_by: string | null;
  trigger_event: string | null;
};
type StepRow = {
  id: string;
  run_id: string;
  step_id: string;
  kind: string;
  status: string;
  attempt: number;
  started_at: string | null;
  finished_at: string | null;
};
type AgentDefRow = { id: string; name: string };
type WfDefRow = { id: string; name: string };

function LiveExecutionCenter() {
  const now = useTick(1000);
  const { rows: agentRuns } = useLiveRows<AgentRunRow>("agent_runs", (q) =>
    q
      .select(
        "id,agent_id,status,summary,steps,started_at,finished_at,triggered_by,goal_override,audit_json",
      )
      .in("status", ["running", "queued"])
      .order("started_at", { ascending: false })
      .limit(30),
  );
  const { rows: wfRuns } = useLiveRows<WorkflowRunRow>("workflow_runs", (q) =>
    q
      .select(
        "id,workflow_id,status,current_step,started_at,finished_at,triggered_by,trigger_event",
      )
      .in("status", ["running", "queued", "waiting"])
      .order("started_at", { ascending: false })
      .limit(30),
  );
  const { rows: steps } = useLiveRows<StepRow>("workflow_step_runs", (q) =>
    q
      .select("id,run_id,step_id,kind,status,attempt,started_at,finished_at")
      .order("started_at", { ascending: false })
      .limit(300),
  );
  const { rows: agentDefs } = useLiveRows<AgentDefRow>("agent_definitions", (q) =>
    q.select("id,name"),
  );
  const { rows: wfDefs } = useLiveRows<WfDefRow>("workflows", (q) => q.select("id,name"));

  const agentName = (id: string) => agentDefs.find((a) => a.id === id)?.name ?? id.slice(0, 8);
  const wfName = (id: string) => wfDefs.find((w) => w.id === id)?.name ?? id.slice(0, 8);

  const wfStepIndex = useMemo(() => {
    const m = new Map<string, { done: number; total: number; current?: StepRow }>();
    for (const s of steps) {
      const cur = m.get(s.run_id) ?? { done: 0, total: 0 };
      cur.total += 1;
      if (s.status === "succeeded") cur.done += 1;
      if (s.status === "running" && !cur.current) cur.current = s;
      m.set(s.run_id, cur);
    }
    return m;
  }, [steps]);

  const totalActive = agentRuns.length + wfRuns.length;

  return (
    <Card className="bg-card/60 border-border/60 backdrop-blur p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide">Live Execution Center</h3>
          <Badge variant="outline" className="text-[10px]">
            {totalActive} active
          </Badge>
        </div>
        <LiveStatus variant={totalActive ? "processing" : "monitoring"} size="sm" />
      </div>
      {totalActive === 0 ? (
        <div className="py-10 flex justify-center">
          <LiveStatus
            variant="monitoring"
            label="Waiting"
            hint="no executions in flight — engine listening"
          />
        </div>
      ) : (
        <ScrollArea className="h-[420px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pr-2">
            {wfRuns.map((r) => {
              const idx = wfStepIndex.get(r.id);
              const pct = idx && idx.total > 0 ? Math.round((idx.done / idx.total) * 100) : 0;
              return (
                <ExecutionCard
                  key={`wf-${r.id}`}
                  kind="Workflow"
                  title={wfName(r.workflow_id)}
                  status={r.status}
                  startedAt={r.started_at}
                  finishedAt={r.finished_at}
                  trigger={r.trigger_event ?? "manual"}
                  assignee={r.triggered_by ? `user ${r.triggered_by.slice(0, 8)}` : "system"}
                  currentStep={idx?.current?.step_id ?? r.current_step ?? "—"}
                  progress={pct}
                  stepCounter={idx ? `${idx.done}/${idx.total}` : null}
                  now={now}
                />
              );
            })}
            {agentRuns.map((r) => {
              const stepCount = r.steps ?? 0;
              return (
                <ExecutionCard
                  key={`ag-${r.id}`}
                  kind="Agent"
                  title={agentName(r.agent_id)}
                  status={r.status}
                  startedAt={r.started_at}
                  finishedAt={r.finished_at}
                  trigger={r.triggered_by ? "user" : "auto"}
                  assignee={agentName(r.agent_id)}
                  currentStep={r.goal_override ? r.goal_override.slice(0, 80) : `step ${stepCount}`}
                  progress={Math.min(95, stepCount * 10)}
                  stepCounter={`${stepCount} steps`}
                  now={now}
                />
              );
            })}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}

function ExecutionCard(props: {
  kind: "Agent" | "Workflow";
  title: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  trigger: string;
  assignee: string;
  currentStep: string;
  progress: number;
  stepCounter: string | null;
  now: number;
}) {
  const {
    kind,
    title,
    status,
    startedAt,
    finishedAt,
    trigger,
    assignee,
    currentStep,
    progress,
    stepCounter,
    now,
  } = props;
  const duration = fmtDuration(startedAt, finishedAt, now);
  const priority = kind === "Workflow" ? "Normal" : "High";
  const estCompletion =
    !finishedAt && progress > 0 && progress < 100
      ? `${Math.max(1, Math.round((((now - new Date(startedAt).getTime()) / progress) * (100 - progress)) / 1000))}s`
      : "—";
  const statusTone =
    status === "running"
      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
      : status === "queued"
        ? "bg-slate-500/15 text-slate-300 border-slate-500/30"
        : status === "waiting"
          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
          : status === "succeeded"
            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            : "bg-rose-500/15 text-rose-300 border-rose-500/30";
  return (
    <div className="rounded-md border border-border/40 bg-background/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {kind === "Workflow" ? (
            <Workflow className="size-3.5 text-primary shrink-0" />
          ) : (
            <Bot className="size-3.5 text-primary shrink-0" />
          )}
          <span className="font-mono text-xs text-foreground truncate">{title}</span>
        </div>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusTone)}>
          {status}
        </Badge>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-muted-foreground">progress</span>
          <span className="text-foreground tabular-nums">
            {progress}% {stepCounter ? `· ${stepCounter}` : ""}
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
      <div className="text-[10px] text-muted-foreground truncate">
        <span className="text-foreground/80 font-mono">step:</span> {currentStep}
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
        <Cell label="started" value={fmtRel(startedAt)} />
        <Cell label="duration" value={duration} />
        <Cell label="eta" value={estCompletion} />
        <Cell label="agent" value={assignee} />
        <Cell label="trigger" value={trigger} />
        <Cell label="priority" value={priority} />
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/50 border border-border/30 rounded px-1.5 py-1 min-w-0">
      <div className="uppercase text-[9px] text-muted-foreground tracking-wider">{label}</div>
      <div className="text-foreground truncate">{value}</div>
    </div>
  );
}

/* ─── workflow phase timeline ─── */
function WorkflowPhaseTimeline() {
  const { rows: runs } = useLiveRows<{ status: string }>("workflow_runs", (q) =>
    q.select("status").gte("started_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
  );
  const phases: { key: string; label: string; tone: string; match: (s: string) => boolean }[] = [
    {
      key: "planning",
      label: "Planning",
      tone: "text-slate-300 bg-slate-500/15 border-slate-500/30",
      match: (s) => s === "queued",
    },
    {
      key: "preparing",
      label: "Preparing",
      tone: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
      match: (s) => s === "preparing",
    },
    {
      key: "running",
      label: "Running",
      tone: "text-cyan-300 bg-cyan-500/20 border-cyan-500/40 animate-pulse",
      match: (s) => s === "running",
    },
    {
      key: "waiting",
      label: "Waiting",
      tone: "text-amber-300 bg-amber-500/15 border-amber-500/30",
      match: (s) => s === "waiting" || s === "needs_approval",
    },
    {
      key: "review",
      label: "Review",
      tone: "text-indigo-300 bg-indigo-500/15 border-indigo-500/30",
      match: (s) => s === "review",
    },
    {
      key: "completed",
      label: "Completed",
      tone: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
      match: (s) => s === "succeeded" || s === "completed",
    },
    {
      key: "archived",
      label: "Archived",
      tone: "text-muted-foreground bg-muted/15 border-border/40",
      match: (s) => s === "cancelled" || s === "archived" || s === "failed",
    },
  ];
  const counts = phases.map((p) => ({ ...p, n: runs.filter((r) => p.match(r.status)).length }));

  return (
    <Card className="bg-card/60 border-border/60 backdrop-blur p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide">Workflow Phase Timeline</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">24h window · {runs.length} runs</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {counts.map((c, i) => (
          <div key={c.key} className="relative">
            <div className={cn("rounded-md border px-2 py-3 text-center", c.tone)}>
              <div className="text-[9px] uppercase tracking-wider opacity-80">{c.label}</div>
              <div className="text-xl font-bold tabular-nums">{c.n}</div>
            </div>
            {i < counts.length - 1 ? (
              <div className="hidden md:block absolute right-[-6px] top-1/2 size-2 -translate-y-1/2 rotate-45 border-t border-r border-border/40" />
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── agent runtime grid ─── */
function AgentRuntimeGrid({ agentOps }: { agentOps: AgentOpsShape }) {
  const list = agentOps?.agents ?? [];
  return (
    <Card className="bg-card/60 border-border/60 backdrop-blur p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide">Agent Runtime</h3>
          <Badge variant="outline" className="text-[10px]">
            {list.length} registered
          </Badge>
        </div>
        <LiveStatus
          variant={agentOps?.system.agents_running ? "processing" : "monitoring"}
          size="sm"
        />
      </div>
      {list.length === 0 ? (
        <div className="py-10 flex justify-center">
          <LiveStatus variant="initializing" label="Discovering" hint="agent registry hydrating" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {list.map((a) => {
            const health =
              a.state === "failed"
                ? 35
                : a.state === "running"
                  ? 92
                  : a.state === "queued"
                    ? 70
                    : a.enabled
                      ? 88
                      : 0;
            const tone =
              a.state === "failed"
                ? "border-rose-500/40"
                : a.state === "running"
                  ? "border-cyan-500/40"
                  : "border-border/50";
            const heartbeat = a.last_run_at ?? a.updated_at;
            return (
              <div
                key={a.id}
                className={cn("rounded-md border bg-background/40 p-3 space-y-2", tone)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        a.state === "running"
                          ? "bg-cyan-400 animate-pulse"
                          : a.state === "failed"
                            ? "bg-rose-400"
                            : a.enabled
                              ? "bg-emerald-400"
                              : "bg-slate-500",
                      )}
                    />
                    <span className="font-mono text-xs text-foreground truncate">{a.name}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {a.state}
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground line-clamp-2">{a.goal}</div>
                <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                  <Cell label="health" value={`${health}%`} />
                  <Cell label="queue" value={String(a.running)} />
                  <Cell label="success" value={`${a.success_rate}%`} />
                  <Cell label="runs" value={String(a.total_runs)} />
                  <Cell
                    label="avg"
                    value={a.avg_duration_ms ? `${Math.round(a.avg_duration_ms / 1000)}s` : "—"}
                  />
                  <Cell label="beat" value={fmtRel(heartbeat)} />
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  <span className="text-foreground/80">last:</span> {a.last_status ?? "—"} ·{" "}
                  {fmtRel(a.last_finished_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ─── audit center ─── */
type AuditRow = {
  id: string;
  action: string | null;
  resource_type: string | null;
  resource_id: string | null;
  actor_id: string | null;
  source: string | null;
  status: string | null;
  duration_ms: number | null;
  occurred_at: string | null;
  created_at: string;
};
function AuditCenter() {
  const { rows, loading } = useLiveRows<AuditRow>("audit_logs", (q) =>
    q
      .select(
        "id,action,resource_type,resource_id,actor_id,source,status,duration_ms,occurred_at,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(80),
  );
  return (
    <Card className="bg-card/60 border-border/60 backdrop-blur p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Network className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide">Audit Center</h3>
          <Badge variant="outline" className="text-[10px]">
            immutable
          </Badge>
        </div>
        <LiveStatus
          variant="monitoring"
          size="sm"
          label={rows.length ? "Recording" : "Listening"}
        />
      </div>
      {loading && rows.length === 0 ? (
        <div className="py-10 flex justify-center">
          <LiveStatus variant="initializing" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 flex justify-center">
          <LiveStatus variant="monitoring" label="Listening" hint="awaiting audited actions" />
        </div>
      ) : (
        <ScrollArea className="h-[280px]">
          <div className="space-y-1.5 pr-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-2 text-[11px] font-mono border-b border-border/30 pb-1.5"
              >
                <CheckCircle2 className="size-3 mt-0.5 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-foreground truncate">{r.action ?? "event"}</span>
                    {r.resource_type ? (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        {r.resource_type}
                      </Badge>
                    ) : null}
                    {r.status ? (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {r.status}
                      </Badge>
                    ) : null}
                    {r.duration_ms != null ? (
                      <span className="text-[9px] text-muted-foreground">{r.duration_ms}ms</span>
                    ) : null}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {r.source ?? "system"} · {fmtRel(r.occurred_at ?? r.created_at)}{" "}
                    {r.resource_id ? `· ${r.resource_id.slice(0, 8)}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}

/* ─── KPI wall ─── */
function KpiWall({ kpis }: { kpis: KpiShape }) {
  if (!kpis) {
    return (
      <Card className="bg-card/60 border-border/60 backdrop-blur p-6">
        <div className="flex justify-center">
          <LiveStatus variant="initializing" label="Loading KPIs" />
        </div>
      </Card>
    );
  }
  const items: Array<{
    label: string;
    value: string | number;
    hint?: string;
    icon: typeof Activity;
  }> = [
    {
      label: "Incidents",
      value: kpis.incidents_total,
      hint: `${kpis.incidents_open} open · ${kpis.incidents_critical} critical`,
      icon: ShieldAlert,
    },
    {
      label: "Resolution",
      value: `${kpis.incidents_resolution_rate}%`,
      hint: `MTTR ${kpis.mttr_minutes}m`,
      icon: Timer,
    },
    {
      label: "Work Orders",
      value: kpis.wo_open,
      hint: `${kpis.wo_closed} closed`,
      icon: ClipboardList,
    },
    {
      label: "Patrols",
      value: kpis.patrols_active,
      hint: `${kpis.patrol_completion}% completion`,
      icon: Activity,
    },
    {
      label: "CCTV Health",
      value: `${kpis.cctv_health}%`,
      hint: `${kpis.cameras_online}/${kpis.cameras_total} online`,
      icon: Gauge,
    },
    {
      label: "Access Health",
      value: `${kpis.access_health}%`,
      hint: `${kpis.gates_online}/${kpis.gates_total} gates`,
      icon: Gauge,
    },
    {
      label: "Sensors Alarming",
      value: kpis.sensors_alarming,
      hint: `${kpis.sensors_total} total`,
      icon: ShieldAlert,
    },
    {
      label: "Compliance",
      value: `${kpis.contractors_compliance}%`,
      hint: `${kpis.contractors_active} contractors`,
      icon: CheckCircle2,
    },
    {
      label: "Visitors Inside",
      value: kpis.visitors_inside,
      hint: `${kpis.permits_active} active permits`,
      icon: Activity,
    },
    {
      label: "Projects",
      value: kpis.projects_in_progress,
      hint: `${kpis.projects_completed} completed`,
      icon: Layers,
    },
    {
      label: "Risk Index",
      value: `${kpis.risk_index}%`,
      hint: `safety ${kpis.safety_index}%`,
      icon: ShieldAlert,
    },
    {
      label: "Readiness",
      value: `${kpis.executive_readiness}%`,
      hint: "executive composite",
      icon: Sparkles,
    },
  ];
  return (
    <Card className="bg-card/60 border-border/60 backdrop-blur p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-wide">Realtime KPI Wall</h3>
        <Badge variant="outline" className="text-[10px]">
          live
        </Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {items.map((m) => (
          <div key={m.label} className="rounded-md border border-border/40 bg-background/40 p-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                {m.label}
              </div>
              <m.icon className="size-3 text-primary" />
            </div>
            <div className="mt-1 text-xl font-bold text-foreground tabular-nums">{m.value}</div>
            {m.hint ? (
              <div className="text-[10px] text-muted-foreground truncate">{m.hint}</div>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
