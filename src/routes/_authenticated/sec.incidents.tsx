import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listIncidents, getOmsKpis } from "@/lib/oms.functions";
import { SecPageHeader, StatCard, severityClass, statusClass } from "@/components/sec/sec-shell";
import { NewIncidentDialog, IncidentDrawer } from "@/components/sec/oms-dialogs";
import { LiveStatus } from "@/components/state/LiveStatus";

export const Route = createFileRoute("/_authenticated/sec/incidents")({
  component: Incidents,
});

type IncRow = {
  id: string; ref: string; category: string; title_ar: string; severity: string;
  status: string; priority: string | null; owner: string | null; assigned_to: string | null;
  reported_at: string; ai_summary: string | null; ai_risk_score: number | null;
  root_cause: string | null; response_minutes: number | null;
  corrective_actions: unknown; escalated: boolean;
};

function Incidents() {
  const fetchList = useServerFn(listIncidents);
  const fetchKpis = useServerFn(getOmsKpis);
  const { data: rows } = useQuery({ queryKey: ["oms-incidents"], queryFn: () => fetchList(), refetchInterval: 30_000 });
  const { data: kpis } = useQuery({ queryKey: ["oms-kpis"], queryFn: () => fetchKpis(), refetchInterval: 30_000 });
  const [selected, setSelected] = useState<IncRow | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "critical" | "escalated">("all");
  const list = (rows ?? []) as IncRow[];
  const filtered = list.filter((i) => {
    if (filter === "open") return i.status !== "closed";
    if (filter === "critical") return i.severity === "critical";
    if (filter === "escalated") return i.escalated;
    return true;
  });

  return (
    <div className="space-y-4">
      <SecPageHeader title="إدارة البلاغات" subtitle={`${list.length} بلاغ — متصل بسير العمل التنفيذي`}>
        <NewIncidentDialog />
      </SecPageHeader>

      {kpis && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="مفتوحة" value={kpis.incidents.open} tone="warning" />
          <StatCard label="حرجة" value={kpis.incidents.critical} tone="danger" />
          <StatCard label="متوسط الاستجابة" value={`${kpis.incidents.avg_response_minutes} د`} />
          <StatCard label="معدل المخاطر" value={`${kpis.incidents.avg_risk_score}/100`} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "open", "critical", "escalated"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}>
            {f === "all" ? "الكل" : f === "open" ? "مفتوحة" : f === "critical" ? "حرجة" : "مُصعَّدة"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">المرجع</th>
              <th className="px-3 py-2 text-start">العنوان</th>
              <th className="px-3 py-2 text-start">الفئة</th>
              <th className="px-3 py-2 text-start">الخطورة</th>
              <th className="px-3 py-2 text-start">الحالة</th>
              <th className="px-3 py-2 text-start">المخاطر</th>
              <th className="px-3 py-2 text-start">الموكَّل</th>
              <th className="px-3 py-2 text-start">بُلِّغ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} onClick={() => setSelected(i)} className="cursor-pointer border-t border-border hover:bg-muted/40">
                <td className="px-3 py-2 font-mono text-xs">{i.ref}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {i.escalated && <span className="rounded-full border border-red-500/40 bg-red-500/15 px-1.5 py-0.5 text-[9px] text-red-600">مُصعَّد</span>}
                    <span>{i.title_ar}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{i.category}</td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${severityClass(i.severity)}`}>{i.severity}</span></td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(i.status)}`}>{i.status}</span></td>
                <td className="px-3 py-2 text-xs">{i.ai_risk_score ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{i.assigned_to ?? i.owner ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(i.reported_at).toLocaleString("ar-SA")}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center"><LiveStatus variant="monitoring" hint="قنوات البلاغات نشطة — لا حوادث مفتوحة" size="sm" /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <IncidentDrawer incident={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
