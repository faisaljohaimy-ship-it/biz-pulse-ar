import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getWorkflowRunDetail,
  cancelWorkflowRunFn,
  resumeWorkflowRunFn,
} from "@/lib/exec.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

type StepRow = {
  id: string;
  step_id: string;
  kind: string;
  status: string;
  attempt: number;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  tool_execution_id: string | null;
  output_json: unknown;
};

type RunDetail = {
  run: {
    id: string;
    workflow_id: string;
    status: string;
    current_step: string | null;
    started_at: string;
    finished_at: string | null;
    error: string | null;
    triggered_by: string | null;
    trigger_event: string | null;
    context_json: unknown;
  };
  steps: StepRow[];
};

function statusIcon(status: string) {
  if (status === "succeeded")
    return <CheckCircle2 className="size-4 text-emerald-400" />;
  if (status === "failed")
    return <XCircle className="size-4 text-red-400" />;
  if (status === "running")
    return <Play className="size-4 text-cyan-400 animate-pulse" />;
  if (status === "cancelled")
    return <Ban className="size-4 text-zinc-400" />;
  if (status === "paused" || status === "waiting_approval")
    return <Pause className="size-4 text-amber-400" />;
  return <Clock className="size-4 text-slate-400" />;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    succeeded: "bg-emerald-500/20 text-emerald-300",
    failed: "bg-red-500/20 text-red-300",
    running: "bg-cyan-500/20 text-cyan-300 animate-pulse",
    queued: "bg-slate-500/20 text-slate-300",
    cancelled: "bg-zinc-500/20 text-zinc-300",
    paused: "bg-amber-500/20 text-amber-300",
    waiting_approval: "bg-amber-500/20 text-amber-300",
    rolled_back: "bg-orange-500/20 text-orange-300",
  };
  return (
    <Badge className={map[status] ?? "bg-slate-500/20"}>{status}</Badge>
  );
}

function fmtDuration(start: string | null, end: string | null) {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const ms = Math.max(0, e - s);
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

export function WorkflowRunDetail({
  runId,
  open,
  onOpenChange,
}: {
  runId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const detailFn = useServerFn(getWorkflowRunDetail);
  const cancelFn = useServerFn(cancelWorkflowRunFn);
  const resumeFn = useServerFn(resumeWorkflowRunFn);

  const detail = useQuery<RunDetail>({
    queryKey: ["exec", "run-detail", runId],
    queryFn: () => detailFn({ data: { runId: runId! } }) as Promise<RunDetail>,
    enabled: !!runId && open,
    refetchInterval: 3000,
  });

  // Realtime: subscribe to step changes for this run (best-effort)
  useEffect(() => {
    if (!runId || !open) return;
    const topic = `wf-run-${runId}:${Math.random().toString(36).slice(2, 8)}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    try {
      channel = supabase.channel(topic);
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workflow_step_runs", filter: `run_id=eq.${runId}` },
        () => void qc.invalidateQueries({ queryKey: ["exec", "run-detail", runId] }),
      );
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "workflow_runs", filter: `id=eq.${runId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["exec", "run-detail", runId] });
          void qc.invalidateQueries({ queryKey: ["exec", "runs"] });
        },
      );
      channel.subscribe();
    } catch (err) {
      console.warn("[workflow-run-detail] realtime unavailable", err);
    }
    return () => {
      if (channel) { try { void supabase.removeChannel(channel); } catch { /* noop */ } }
    };
  }, [runId, open, qc]);

  const cancelMut = useMutation({
    mutationFn: () => cancelFn({ data: { runId: runId! } }),
    onSuccess: () => {
      toast.success("Run cancellation requested");
      void qc.invalidateQueries({ queryKey: ["exec", "run-detail", runId] });
      void qc.invalidateQueries({ queryKey: ["exec", "runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resumeMut = useMutation({
    mutationFn: () => resumeFn({ data: { runId: runId! } }),
    onSuccess: () => {
      toast.success("Run resumed");
      void qc.invalidateQueries({ queryKey: ["exec", "run-detail", runId] });
      void qc.invalidateQueries({ queryKey: ["exec", "runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = detail.data?.run;
  const steps = detail.data?.steps ?? [];
  const canCancel = run && ["running", "queued", "paused"].includes(run.status);
  const canResume =
    run && ["failed", "paused", "cancelled"].includes(run.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Workflow Run
            {run && statusBadge(run.status)}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {runId}
          </DialogDescription>
        </DialogHeader>

        {detail.isLoading && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading run details…
          </div>
        )}

        {detail.error && (
          <div className="p-4 rounded-md border border-red-500/30 bg-red-500/10 text-sm text-red-300">
            {(detail.error as Error).message}
          </div>
        )}

        {run && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">Started</div>
                <div className="font-mono">
                  {new Date(run.started_at).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Duration</div>
                <div className="font-mono">
                  {fmtDuration(run.started_at, run.finished_at)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Trigger</div>
                <div className="font-mono">{run.trigger_event ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Current step</div>
                <div className="font-mono">{run.current_step ?? "—"}</div>
              </div>
            </div>

            {run.error && (
              <div className="p-3 rounded-md border border-red-500/30 bg-red-500/10 text-xs text-red-300 whitespace-pre-wrap">
                {run.error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={!canCancel || cancelMut.isPending}
                onClick={() => cancelMut.mutate()}
                className="gap-1"
              >
                <Ban className="size-3" />
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!canResume || resumeMut.isPending}
                onClick={() => resumeMut.mutate()}
                className="gap-1"
              >
                <RotateCcw className="size-3" />
                Resume
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => detail.refetch()}
                disabled={detail.isFetching}
              >
                Refresh
              </Button>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">
                Steps ({steps.length})
              </h4>
              <ScrollArea className="h-[40vh]">
                <ol className="relative border-s border-border ms-3 space-y-3">
                  {steps.map((s) => (
                    <li key={s.id} className="ms-4">
                      <span className="absolute -start-2 flex size-4 items-center justify-center rounded-full bg-background ring-2 ring-border">
                        {statusIcon(s.status)}
                      </span>
                      <div className="p-3 rounded-md border bg-card/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium font-mono">
                            {s.step_id}
                            <span className="ms-2 text-[10px] text-muted-foreground uppercase">
                              {s.kind}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.attempt > 1 && (
                              <span className="text-[10px] text-amber-300">
                                attempt {s.attempt}
                              </span>
                            )}
                            {statusBadge(s.status)}
                          </div>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground font-mono">
                          {fmtDuration(s.started_at, s.finished_at)}
                          {s.tool_execution_id && (
                            <>
                              {" · exec "}
                              {s.tool_execution_id.slice(0, 8)}…
                            </>
                          )}
                        </div>
                        {s.error && (
                          <div className="mt-1 text-xs text-red-300 whitespace-pre-wrap">
                            {s.error}
                          </div>
                        )}
                        {s.status === "succeeded" &&
                          s.output_json != null && (
                            <details className="mt-1">
                              <summary className="text-[11px] text-muted-foreground cursor-pointer">
                                output
                              </summary>
                              <pre className="mt-1 text-[10px] bg-muted/30 p-2 rounded overflow-x-auto max-h-40">
                                {JSON.stringify(s.output_json, null, 2)}
                              </pre>
                            </details>
                          )}
                      </div>
                    </li>
                  ))}
                  {steps.length === 0 && (
                    <li className="text-sm text-muted-foreground text-center p-4">
                      No steps recorded yet.
                    </li>
                  )}
                </ol>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
