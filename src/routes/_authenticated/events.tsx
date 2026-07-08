// Enterprise Events — live realtime stream from enterprise_events.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Radio, Filter } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LiveStatus } from "@/components/state/LiveStatus";
import { useLiveRows, fmtRel } from "@/lib/runtime/useLiveRows";

export const Route = createFileRoute("/_authenticated/events")({
  component: EventsRuntime,
});

type EventRow = {
  id: string;
  topic: string;
  source: string | null;
  status: string | null;
  severity: string | null;
  occurred_at: string;
  subject_type: string | null;
  subject_id: string | null;
  payload_json: Record<string, unknown> | null;
};

const CATEGORIES = [
  "all",
  "incident",
  "workflow",
  "agent",
  "notification",
  "ai",
  "sap",
  "microsoft",
  "security",
  "audit",
  "integration",
] as const;
type Category = (typeof CATEGORIES)[number];

function categorize(topic: string): string {
  const t = topic.toLowerCase();
  if (t.startsWith("incident")) return "incident";
  if (t.startsWith("workflow")) return "workflow";
  if (t.startsWith("agent")) return "agent";
  if (t.includes("notification") || t.includes("email")) return "notification";
  if (t.startsWith("ai") || t.includes("aria")) return "ai";
  if (t.includes("sap")) return "sap";
  if (
    t.includes("microsoft") ||
    t.includes("outlook") ||
    t.includes("sharepoint") ||
    t.includes("teams")
  )
    return "microsoft";
  if (t.startsWith("security") || t.startsWith("sec.")) return "security";
  if (t.startsWith("audit")) return "audit";
  if (t.includes("integration") || t.includes("sync")) return "integration";
  return "other";
}

function severityTone(
  sev: string | null | undefined,
): "default" | "destructive" | "secondary" | "outline" {
  if (!sev) return "outline";
  const s = sev.toLowerCase();
  if (s === "critical" || s === "high") return "destructive";
  if (s === "warn" || s === "warning" || s === "medium") return "default";
  return "secondary";
}

function EventsRuntime() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [filter, setFilter] = useState<Category>("all");

  const { rows: events, loading } = useLiveRows<EventRow>("enterprise_events", (q) =>
    q
      .select("id,topic,source,status,severity,occurred_at,subject_type,subject_id,payload_json")
      .order("occurred_at", { ascending: false })
      .limit(200),
  );

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => categorize(e.topic) === filter);
  }, [events, filter]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of events) {
      const c = categorize(e.topic);
      m[c] = (m[c] ?? 0) + 1;
    }
    m.all = events.length;
    return m;
  }, [events]);

  return (
    <Section>
      <PageHeader
        icon={Radio}
        title={ar ? "بثّ الأحداث المؤسسية" : "Enterprise Event Stream"}
        subtitle={
          ar
            ? "كل ما يحدث في النظام لحظياً."
            : "Everything happening across the system, in realtime."
        }
        badge={ar ? "حي" : "Live"}
      />

      <Card className="p-3 glass-card">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {CATEGORIES.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={filter === c ? "default" : "outline"}
              onClick={() => setFilter(c)}
              className="shrink-0"
            >
              <span className="capitalize">{c}</span>
              <Badge variant="secondary" className="ms-2 text-[10px]">
                {counts[c] ?? 0}
              </Badge>
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-4 glass-card">
        {loading ? (
          <LiveStatus
            variant="initializing"
            label={ar ? "الاتصال بالناقل..." : "Connecting to event bus..."}
          />
        ) : filtered.length === 0 ? (
          <LiveStatus
            variant="monitoring"
            label={ar ? "بانتظار الأحداث..." : "Waiting for events..."}
          />
        ) : (
          <ScrollArea className="h-[640px] pr-2">
            <div className="space-y-1">
              {filtered.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start gap-3 rounded-md border border-border/30 bg-background/30 p-2 text-sm"
                >
                  <div className="w-20 shrink-0 text-[10px] text-muted-foreground tabular-nums">
                    {fmtRel(e.occurred_at)}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                    {categorize(e.topic)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{e.topic}</div>
                    {e.subject_type && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {e.subject_type}
                        {e.subject_id ? `:${e.subject_id.slice(0, 8)}` : ""}
                        {e.source && <> · {e.source}</>}
                      </div>
                    )}
                  </div>
                  {e.severity && (
                    <Badge variant={severityTone(e.severity)} className="shrink-0">
                      {e.severity}
                    </Badge>
                  )}
                  {e.status && (
                    <Badge variant="secondary" className="shrink-0">
                      {e.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </Section>
  );
}
