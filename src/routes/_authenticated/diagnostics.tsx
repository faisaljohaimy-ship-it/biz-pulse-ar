// Runtime Diagnostics — live tail of enterprise events, workflow runs, tool
// executions, and audit logs. Filter by trace_id / topic / status. Click any
// row to open the unified Execution Timeline.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Stethoscope, Filter, Eye } from "lucide-react";
import { z } from "zod";
import { PageHeader, Section } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ExecutionTimeline } from "@/components/runtime/ExecutionTimeline";
import { EmptyState } from "@/components/state/EmptyState";
import { useLiveRows, fmtRel } from "@/lib/runtime/useLiveRows";
import { useI18n } from "@/lib/i18n";

const SearchSchema = z.object({
  subsystem: z.string().optional(),
  trace: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/diagnostics")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: Diagnostics,
});

type EvRow = { id: string; topic: string; source: string; status: string; severity: string; occurred_at: string; correlation_id: string | null; subject_id: string | null };
type WfRow = { id: string; workflow_id: string; status: string; current_step: string | null; started_at: string; finished_at: string | null; error: string | null };
type ToolRow = { id: string; tool_id: string; status: string; started_at: string | null; finished_at: string | null; duration_ms: number | null; error: string | null; created_at: string };
type AuditRow = { id: string; action: string; resource_type: string | null; resource_id: string | null; status: string | null; source: string | null; occurred_at: string; correlation_id: string | null };

function StatusPill({ s }: { s: string }) {
  const cls =
    s === "succeeded" || s === "completed" || s === "ok" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : s === "failed" || s === "error" ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
    : s === "running" || s === "pending" ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
    : "bg-muted/30 text-muted-foreground border-border/40";
  return <Badge variant="outline" className={`text-[10px] ${cls}`}>{s}</Badge>;
}

function Diagnostics() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const search = Route.useSearch();
  const [filter, setFilter] = useState(search.trace ?? "");
  const [selected, setSelected] = useState<{ runId?: string; executionId?: string; traceId?: string } | null>(null);

  const { rows: events } = useLiveRows<EvRow>(
    "enterprise_events",
    (q) => q.select("id,topic,source,status,severity,occurred_at,correlation_id,subject_id").order("occurred_at", { ascending: false }).limit(150),
  );
  const { rows: runs } = useLiveRows<WfRow>(
    "workflow_runs",
    (q) => q.select("id,workflow_id,status,current_step,started_at,finished_at,error").order("started_at", { ascending: false }).limit(100),
  );
  const { rows: tools } = useLiveRows<ToolRow>(
    "tool_executions",
    (q) => q.select("id,tool_id,status,started_at,finished_at,duration_ms,error,created_at").order("created_at", { ascending: false }).limit(100),
  );
  const { rows: audits } = useLiveRows<AuditRow>(
    "audit_logs",
    (q) => q.select("id,action,resource_type,resource_id,status,source,occurred_at,correlation_id").order("occurred_at", { ascending: false }).limit(100),
  );

  const f = filter.trim().toLowerCase();
  const match = (s: string | null | undefined) => !f || (s ?? "").toLowerCase().includes(f);

  const fEvents = useMemo(() => events.filter((e) => match(e.topic) || match(e.source) || match(e.correlation_id) || match(e.subject_id)), [events, f]);
  const fRuns = useMemo(() => runs.filter((r) => match(r.id) || match(r.workflow_id) || match(r.status) || match(r.current_step)), [runs, f]);
  const fTools = useMemo(() => tools.filter((t) => match(t.id) || match(t.tool_id) || match(t.status)), [tools, f]);
  const fAudits = useMemo(() => audits.filter((a) => match(a.action) || match(a.resource_id) || match(a.correlation_id)), [audits, f]);

  return (
    <Section>
      <PageHeader
        icon={Stethoscope}
        title={ar ? "تشخيصات التشغيل" : "Runtime Diagnostics"}
        subtitle={ar ? "تدفق حي للأحداث وعمليات التشغيل والأدوات والتدقيق." : "Live stream of events, runs, tool executions, and audit logs."}
        badge={ar ? "حي" : "Live"}
      />

      <Card className="glass-card p-3 flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={ar ? "تصفية بالطوبيك / الحالة / trace / id" : "Filter by topic, status, trace id, resource id…"}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-8 text-xs"
        />
        {filter && <Button size="sm" variant="ghost" onClick={() => setFilter("")}>{ar ? "مسح" : "Clear"}</Button>}
      </Card>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="events">Events <Badge variant="outline" className="ms-1 text-[10px]">{fEvents.length}</Badge></TabsTrigger>
          <TabsTrigger value="runs">Workflows <Badge variant="outline" className="ms-1 text-[10px]">{fRuns.length}</Badge></TabsTrigger>
          <TabsTrigger value="tools">Tools <Badge variant="outline" className="ms-1 text-[10px]">{fTools.length}</Badge></TabsTrigger>
          <TabsTrigger value="audits">Audits <Badge variant="outline" className="ms-1 text-[10px]">{fAudits.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-2">
          {fEvents.length === 0 ? (
            <EmptyState reason={filter ? "filtered" : "waiting"} title="No events" description={filter ? "Adjust the filter to see more." : "No events received yet. Triggers will appear here in real time."} compact />
          ) : (
            <Card className="glass-card divide-y divide-border/40">
              {fEvents.map((e) => (
                <button key={e.id} type="button" onClick={() => setSelected({ traceId: e.correlation_id ?? e.subject_id ?? e.id })} className="w-full text-start p-2.5 hover:bg-background/40 flex items-center gap-2">
                  <StatusPill s={e.status} />
                  <span className="text-xs font-medium truncate flex-1">{e.topic}</span>
                  <span className="text-[10px] text-muted-foreground">{e.source}</span>
                  <span className="text-[10px] text-muted-foreground">{fmtRel(e.occurred_at)}</span>
                  <Eye className="h-3 w-3 text-cyan-300" />
                </button>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="runs" className="mt-2">
          {fRuns.length === 0 ? (
            <EmptyState reason={filter ? "filtered" : "waiting"} title="No workflow runs" description={filter ? "Adjust the filter." : "Trigger a workflow from /workflows to see runs here."} compact />
          ) : (
            <Card className="glass-card divide-y divide-border/40">
              {fRuns.map((r) => (
                <button key={r.id} type="button" onClick={() => setSelected({ runId: r.id })} className="w-full text-start p-2.5 hover:bg-background/40 flex items-center gap-2">
                  <StatusPill s={r.status} />
                  <span className="text-xs truncate flex-1">{r.workflow_id.slice(0, 8)} · {r.current_step ?? "—"}</span>
                  {r.error && <Badge variant="destructive" className="text-[10px]">err</Badge>}
                  <span className="text-[10px] text-muted-foreground">{fmtRel(r.started_at)}</span>
                  <Eye className="h-3 w-3 text-cyan-300" />
                </button>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tools" className="mt-2">
          {fTools.length === 0 ? (
            <EmptyState reason={filter ? "filtered" : "waiting"} title="No tool executions" description={filter ? "Adjust the filter." : "Run a tool from /tools to see executions here."} compact />
          ) : (
            <Card className="glass-card divide-y divide-border/40">
              {fTools.map((t) => (
                <button key={t.id} type="button" onClick={() => setSelected({ executionId: t.id })} className="w-full text-start p-2.5 hover:bg-background/40 flex items-center gap-2">
                  <StatusPill s={t.status} />
                  <span className="text-xs truncate flex-1">{t.tool_id}</span>
                  {t.duration_ms != null && <span className="text-[10px] text-muted-foreground">{t.duration_ms}ms</span>}
                  <span className="text-[10px] text-muted-foreground">{fmtRel(t.created_at)}</span>
                  <Eye className="h-3 w-3 text-cyan-300" />
                </button>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audits" className="mt-2">
          {fAudits.length === 0 ? (
            <EmptyState reason={filter ? "filtered" : "waiting"} title="No audit entries" description={filter ? "Adjust the filter." : "Audit entries appear automatically when events are emitted."} compact />
          ) : (
            <Card className="glass-card divide-y divide-border/40">
              {fAudits.map((a) => (
                <button key={a.id} type="button" onClick={() => setSelected({ traceId: a.correlation_id ?? a.resource_id ?? a.id })} className="w-full text-start p-2.5 hover:bg-background/40 flex items-center gap-2">
                  {a.status && <StatusPill s={a.status} />}
                  <span className="text-xs truncate flex-1">{a.action}</span>
                  <span className="text-[10px] text-muted-foreground">{a.resource_type ?? "—"}</span>
                  <span className="text-[10px] text-muted-foreground">{fmtRel(a.occurred_at)}</span>
                  <Eye className="h-3 w-3 text-cyan-300" />
                </button>
              ))}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{ar ? "خط زمن التنفيذ" : "Execution Timeline"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {selected && <ExecutionTimeline runId={selected.runId} executionId={selected.executionId} traceId={selected.traceId} />}
          </div>
        </SheetContent>
      </Sheet>
    </Section>
  );
}
