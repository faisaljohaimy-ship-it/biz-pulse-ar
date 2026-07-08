// Execution Timeline UI — renders the unified timeline returned by
// getExecutionTimeline as a vertical stepper with per-step request/response,
// duration, error, trace ID, and a Retry action.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Wrench,
  Database,
  GitBranch,
  FileText,
  Zap,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getExecutionTimeline,
  type TimelinePhase,
  type TimelineEntry,
} from "@/lib/runtime/execution-timeline.functions";
import { fmtRel, fmtDuration } from "@/lib/runtime/useLiveRows";
import { EmptyState } from "@/components/state/EmptyState";

const PHASE_META: Record<
  TimelinePhase,
  { icon: typeof Clock; tone: string; bg: string; label: string }
> = {
  queued: { icon: Clock, tone: "text-muted-foreground", bg: "bg-muted/40", label: "Queued" },
  running: { icon: Loader2, tone: "text-cyan-300", bg: "bg-cyan-500/10", label: "Running" },
  tool: { icon: Wrench, tone: "text-violet-300", bg: "bg-violet-500/10", label: "Tool" },
  database: { icon: Database, tone: "text-blue-300", bg: "bg-blue-500/10", label: "Database" },
  workflow: { icon: GitBranch, tone: "text-amber-300", bg: "bg-amber-500/10", label: "Workflow" },
  audit: { icon: FileText, tone: "text-slate-300", bg: "bg-slate-500/10", label: "Audit" },
  completed: {
    icon: CheckCircle2,
    tone: "text-emerald-400",
    bg: "bg-emerald-500/10",
    label: "Completed",
  },
  failed: { icon: XCircle, tone: "text-rose-400", bg: "bg-rose-500/10", label: "Failed" },
  rolled_back: {
    icon: RotateCcw,
    tone: "text-orange-300",
    bg: "bg-orange-500/10",
    label: "Rolled back",
  },
};

function copy(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    void navigator.clipboard.writeText(text).then(() => toast.success("Copied"));
  }
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const [open, setOpen] = useState(entry.phase === "failed");
  const meta = PHASE_META[entry.phase];
  const Icon = meta.icon;
  const spin = entry.phase === "running";
  return (
    <div className="relative ps-8">
      <div
        className={`absolute start-2 top-2 h-6 w-6 rounded-full ${meta.bg} flex items-center justify-center ring-2 ring-background`}
      >
        <Icon className={`h-3.5 w-3.5 ${meta.tone} ${spin ? "animate-spin" : ""}`} />
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-start rounded-md border border-border/40 bg-background/40 p-2.5 hover:bg-background/70 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            {open ? (
              <ChevronDown className="h-3 w-3 shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate text-xs font-medium">{entry.title}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {meta.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-[10px] text-muted-foreground">
            {entry.duration_ms != null && <span>{Math.round(entry.duration_ms)}ms</span>}
            <span>{fmtRel(entry.at)}</span>
          </div>
        </div>
        {open && (
          <div className="mt-2 space-y-2 border-t border-border/30 pt-2">
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">
                {entry.source}
              </Badge>
              <span>
                status: <span className="text-foreground">{entry.status}</span>
              </span>
              {entry.trace_id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copy(entry.trace_id!);
                  }}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  title={entry.trace_id}
                >
                  <Copy className="h-3 w-3" />
                  trace: {entry.trace_id.slice(0, 8)}…
                </button>
              )}
            </div>
            {entry.error && (
              <div className="rounded border border-rose-500/30 bg-rose-500/5 p-2 text-[11px] text-rose-300 whitespace-pre-wrap">
                {entry.error}
              </div>
            )}
            {entry.request !== null && entry.request !== undefined && (
              <details className="text-[11px]">
                <summary className="cursor-pointer text-muted-foreground">Request</summary>
                <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted/30 p-2 text-[10px]">
                  {JSON.stringify(entry.request, null, 2)}
                </pre>
              </details>
            )}
            {entry.response !== null && entry.response !== undefined && (
              <details className="text-[11px]" open={entry.phase === "failed"}>
                <summary className="cursor-pointer text-muted-foreground">Response</summary>
                <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted/30 p-2 text-[10px]">
                  {JSON.stringify(entry.response, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </button>
    </div>
  );
}

export function ExecutionTimeline({
  runId,
  executionId,
  traceId,
  onRetry,
}: {
  runId?: string;
  executionId?: string;
  traceId?: string;
  onRetry?: () => void;
}) {
  const fetchTl = useServerFn(getExecutionTimeline);
  const id = runId ?? executionId ?? traceId;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["execution-timeline", id],
    queryFn: () => fetchTl({ data: { runId, executionId, traceId } }),
    enabled: !!id,
    refetchInterval: 5_000,
    staleTime: 0,
  });

  if (!id) {
    return (
      <EmptyState
        reason="no-rows"
        title="No execution selected"
        description="Pick a workflow run, tool execution, or trace ID to inspect."
        compact
      />
    );
  }
  if (isLoading) {
    return (
      <Card className="glass-card p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading timeline…
      </Card>
    );
  }
  if (error) {
    return (
      <EmptyState
        reason="error"
        title="Timeline unavailable"
        description={(error as Error).message}
        compact
      />
    );
  }
  if (!data || data.entries.length === 0) {
    return (
      <EmptyState
        reason="waiting"
        title="No timeline events yet"
        description="The execution exists but has not emitted any audit, step, or event records. Refresh in a few seconds."
        action={
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RotateCcw className="h-3 w-3 me-1" /> Refresh
          </Button>
        }
        compact
      />
    );
  }

  return (
    <Card className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-cyan-300" />
          <span className="text-sm font-semibold">Execution Timeline</span>
          <Badge variant="outline" className="text-[10px]">
            {data.summary.total} events
          </Badge>
          {data.summary.failed > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {data.summary.failed} failed
            </Badge>
          )}
          {data.summary.completed && (
            <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              completed
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data.summary.duration_ms != null && (
            <span className="text-[10px] text-muted-foreground">
              total {fmtDuration(data.entries[0]!.at, data.entries[data.entries.length - 1]!.at)}
            </span>
          )}
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RotateCcw className="h-3 w-3 me-1" /> Retry
            </Button>
          )}
        </div>
      </div>
      <div className="relative space-y-2">
        <div className="absolute start-[18px] top-0 bottom-0 w-px bg-border/40" />
        {data.entries.map((e) => (
          <TimelineRow key={e.id} entry={e} />
        ))}
      </div>
    </Card>
  );
}
