// Workflows page — live runtime view of workflow definitions and runs.
// Subscribes to workflows + workflow_runs in realtime. No placeholders.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
  Workflow as WorkflowIcon,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Timer,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LiveStatus } from "@/components/state/LiveStatus";
import { useLiveRows, fmtRel, fmtDuration } from "@/lib/runtime/useLiveRows";
import { triggerWorkflowFn, cancelWorkflowRunFn } from "@/lib/exec.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workflows")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: WorkflowsRuntime,
});

type WfRow = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger_topic: string | null;
  updated_at: string;
};
type RunRow = {
  id: string;
  workflow_id: string;
  status: string;
  current_step: string | null;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  triggered_by: string | null;
};
type StepRow = {
  id: string;
  run_id: string;
  step_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
};

const STATUS_PHASES = [
  "planning",
  "preparing",
  "running",
  "waiting",
  "review",
  "completed",
  "archived",
] as const;

const PHASE_MAP: Record<string, (typeof STATUS_PHASES)[number]> = {
  queued: "planning",
  pending: "preparing",
  running: "running",
  waiting_approval: "waiting",
  paused: "waiting",
  approved: "review",
  succeeded: "completed",
  completed: "completed",
  failed: "archived",
  cancelled: "archived",
};

function WorkflowsRuntime() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const { rows: workflows, loading: wfLoading } = useLiveRows<WfRow>("workflows", (q) =>
    q
      .select("id,name,description,enabled,trigger_topic,updated_at")
      .order("updated_at", { ascending: false }),
  );
  const { rows: runs, loading: runsLoading } = useLiveRows<RunRow>("workflow_runs", (q) =>
    q
      .select("id,workflow_id,status,current_step,started_at,finished_at,error,triggered_by")
      .order("started_at", { ascending: false })
      .limit(100),
  );
  const { rows: steps } = useLiveRows<StepRow>("workflow_step_runs", (q) =>
    q
      .select("id,run_id,step_id,status,started_at,finished_at")
      .order("started_at", { ascending: false })
      .limit(300),
  );

  const phaseCounts = useMemo(() => {
    const m = Object.fromEntries(STATUS_PHASES.map((p) => [p, 0])) as Record<string, number>;
    for (const r of runs) {
      const p = PHASE_MAP[r.status] ?? "running";
      m[p] = (m[p] ?? 0) + 1;
    }
    return m;
  }, [runs]);

  const wfById = useMemo(() => new Map(workflows.map((w) => [w.id, w])), [workflows]);

  return (
    <Section>
      <PageHeader
        icon={WorkflowIcon}
        title={ar ? "محرك السير العمليّ" : "Workflow Runtime"}
        subtitle={
          ar
            ? "تنفيذ مباشر، تتبع المراحل، السيطرة على التشغيل."
            : "Live execution, phase tracking, runtime control."
        }
        badge={ar ? "حي" : "Live"}
      />

      {/* Phase board */}
      <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {STATUS_PHASES.map((p) => (
          <Card key={p} className="p-3 glass-card">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{phaseCounts[p] ?? 0}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        {/* Definitions */}
        <Card className="p-4 glass-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">
              {ar ? "السير المعرّفة" : "Workflow Definitions"}
            </div>
            <Badge variant="outline">{workflows.length}</Badge>
          </div>
          {wfLoading ? (
            <LiveStatus variant="initializing" />
          ) : workflows.length === 0 ? (
            <LiveStatus
              variant="monitoring"
              label={ar ? "بانتظار تعريف أول سير" : "Awaiting first workflow definition"}
            />
          ) : (
            <ScrollArea className="h-[480px] pr-2">
              <div className="space-y-2">
                {workflows.map((w) => (
                  <WorkflowDefRow
                    key={w.id}
                    wf={w}
                    liveRuns={runs.filter((r) => r.workflow_id === w.id)}
                    ar={ar}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* Recent runs */}
        <Card className="p-4 glass-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">{ar ? "آخر التنفيذات" : "Recent Runs"}</div>
            <Badge variant="outline">{runs.length}</Badge>
          </div>
          {runsLoading ? (
            <LiveStatus variant="initializing" />
          ) : runs.length === 0 ? (
            <LiveStatus
              variant="monitoring"
              label={ar ? "في انتظار الأحداث..." : "Waiting for events..."}
            />
          ) : (
            <ScrollArea className="h-[480px] pr-2">
              <div className="space-y-2">
                {runs.map((r) => (
                  <RunRowCard
                    key={r.id}
                    run={r}
                    wfName={wfById.get(r.workflow_id)?.name ?? r.workflow_id.slice(0, 8)}
                    steps={steps.filter((s) => s.run_id === r.id)}
                    ar={ar}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>
    </Section>
  );
}

function WorkflowDefRow({ wf, liveRuns, ar }: { wf: WfRow; liveRuns: RunRow[]; ar: boolean }) {
  const trigger = useServerFn(triggerWorkflowFn);
  const [pending, setPending] = useState(false);
  const running = liveRuns.filter(
    (r) => r.status === "running" || r.status === "pending" || r.status === "queued",
  ).length;

  const onRun = async () => {
    setPending(true);
    try {
      await trigger({ data: { workflowId: wf.id, payload: {} } });
      toast.success(ar ? "بدأ التنفيذ" : "Execution started");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{wf.name}</div>
          {wf.description && (
            <div className="truncate text-[11px] text-muted-foreground">{wf.description}</div>
          )}
        </div>
        <Badge variant={wf.enabled ? "default" : "secondary"} className="shrink-0">
          {wf.enabled ? (ar ? "مفعّل" : "Enabled") : ar ? "موقوف" : "Disabled"}
        </Badge>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {wf.trigger_topic && (
            <Badge variant="outline" className="text-[10px]">
              {wf.trigger_topic}
            </Badge>
          )}
          <span>
            {ar ? "نشِط" : "Active"}: {running}
          </span>
        </div>
        <Button size="sm" variant="outline" disabled={!wf.enabled || pending} onClick={onRun}>
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          <span className="ms-1">{ar ? "تشغيل" : "Run"}</span>
        </Button>
      </div>
    </div>
  );
}

function RunRowCard({
  run,
  wfName,
  steps,
  ar,
}: {
  run: RunRow;
  wfName: string;
  steps: StepRow[];
  ar: boolean;
}) {
  const cancel = useServerFn(cancelWorkflowRunFn);
  const completed = steps.filter(
    (s) => s.status === "succeeded" || s.status === "completed",
  ).length;
  const progress = steps.length
    ? Math.round((completed / steps.length) * 100)
    : run.status === "completed" || run.status === "succeeded"
      ? 100
      : 0;
  const Icon =
    run.status === "failed"
      ? AlertTriangle
      : run.status === "completed" || run.status === "succeeded"
        ? CheckCircle2
        : run.status === "running"
          ? Loader2
          : Timer;

  const onCancel = async () => {
    try {
      await cancel({ data: { runId: run.id } });
      toast.success(ar ? "تم الإلغاء" : "Cancelled");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const tone =
    run.status === "failed" ? "destructive" : run.status === "running" ? "default" : "secondary";

  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon
            className={`h-4 w-4 shrink-0 ${run.status === "running" ? "animate-spin text-cyan-400" : run.status === "failed" ? "text-rose-400" : "text-emerald-400"}`}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{wfName}</div>
            <div className="text-[10px] text-muted-foreground">
              {fmtRel(run.started_at)} · {fmtDuration(run.started_at, run.finished_at)}
              {run.current_step && (
                <>
                  {" "}
                  · step: <span className="text-foreground/80">{run.current_step}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Badge variant={tone as "default" | "destructive" | "secondary"} className="shrink-0">
          {run.status}
        </Badge>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
        <div
          className={`h-full ${run.status === "failed" ? "bg-rose-400" : "bg-gradient-to-r from-cyan-400 to-emerald-400"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {run.error && <div className="mt-2 truncate text-[11px] text-rose-300">{run.error}</div>}
      {(run.status === "running" || run.status === "pending" || run.status === "queued") && (
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <Pause className="h-3 w-3" />
            <span className="ms-1">{ar ? "إلغاء" : "Cancel"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
