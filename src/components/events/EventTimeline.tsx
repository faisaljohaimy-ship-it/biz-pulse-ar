import {
  useEventStream,
  type EventFilter,
  type EnterpriseEventRow,
} from "@/lib/events/useEventStream";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, AlertTriangle, CheckCircle2, Info, Zap, Clock } from "lucide-react";

const SEVERITY_STYLE: Record<string, { cls: string; icon: typeof Info }> = {
  debug: { cls: "bg-slate-500/15 text-slate-300 border-slate-500/30", icon: Info },
  info: { cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30", icon: Activity },
  notice: { cls: "bg-sky-500/15 text-sky-300 border-sky-500/30", icon: Info },
  warn: { cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: AlertTriangle },
  error: { cls: "bg-rose-500/15 text-rose-300 border-rose-500/30", icon: AlertTriangle },
  critical: { cls: "bg-red-600/20 text-red-200 border-red-600/40 animate-pulse", icon: Zap },
};

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleString();
}

export type EventTimelineProps = {
  title?: string;
  filter?: EventFilter;
  height?: string;
  compact?: boolean;
  emptyLabel?: string;
};

export function EventTimeline({
  title = "Live Event Stream",
  filter,
  height = "h-[420px]",
  compact = false,
  emptyLabel = "Monitoring — no events in window",
}: EventTimelineProps) {
  const { events, loading, error } = useEventStream(filter ?? {});

  return (
    <Card className="bg-card/60 backdrop-blur border-border/60 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-foreground tracking-wide">{title}</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {events.length} {events.length === 1 ? "event" : "events"}
        </Badge>
      </div>
      {error ? (
        <div className="text-xs text-rose-400 py-6 text-center">{error}</div>
      ) : loading && events.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center flex items-center justify-center gap-2">
          <Clock className="size-3 animate-spin" /> Initializing stream…
        </div>
      ) : events.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">{emptyLabel}</div>
      ) : (
        <ScrollArea className={height}>
          <div className="space-y-2 pr-2">
            {events.map((ev) => (
              <EventRow key={ev.id} event={ev} compact={compact} />
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}

function EventRow({ event, compact }: { event: EnterpriseEventRow; compact: boolean }) {
  const sev = SEVERITY_STYLE[event.severity] ?? SEVERITY_STYLE.info;
  const Icon = event.status === "processed" ? CheckCircle2 : sev.icon;
  return (
    <div className="flex items-start gap-3 p-2 rounded-md border border-border/40 bg-background/40 hover:bg-background/60 transition-colors">
      <Icon
        className={`size-4 mt-0.5 ${sev.cls.split(" ").find((c) => c.startsWith("text-")) ?? ""}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-foreground truncate">{event.topic}</span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sev.cls}`}>
            {event.severity}
          </Badge>
          {event.subject_type ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {event.subject_type}
            </Badge>
          ) : null}
          {event.duration_ms != null ? (
            <span className="text-[10px] text-muted-foreground">{event.duration_ms}ms</span>
          ) : null}
        </div>
        {!compact && event.subject_id ? (
          <div className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
            {event.subject_id}
          </div>
        ) : null}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
          <span>{event.source}</span>
          <span>•</span>
          <span>{relTime(event.occurred_at)}</span>
          {event.correlation_id ? (
            <>
              <span>•</span>
              <span className="font-mono truncate">{event.correlation_id.slice(0, 8)}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EnterpriseActivityFeed(props: Omit<EventTimelineProps, "title">) {
  return <EventTimeline title="Enterprise Activity Feed" {...props} />;
}

export function ExecutionTimeline({
  correlationId,
  ...props
}: { correlationId: string } & Omit<EventTimelineProps, "title" | "filter">) {
  return (
    <EventTimeline
      title="Execution Timeline"
      filter={{ correlationId, limit: 100 }}
      emptyLabel="No steps recorded for this execution."
      {...props}
    />
  );
}
