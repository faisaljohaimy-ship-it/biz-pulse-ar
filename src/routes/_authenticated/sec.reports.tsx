import { createFileRoute, Link } from "@tanstack/react-router";
import { SecPageHeader, SampleBadge } from "@/components/sec/sec-shell";
import { FileText, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sec/reports")({
  component: Reports,
});

const REPORTS = [
  { id: "RPT-D-2026-06-22", title: "التقرير اليومي للعمليات الأمنية", type: "يومي", date: "2026-06-22", channels: ["SharePoint", "Teams", "Outlook"] },
  { id: "RPT-W-2026-W25", title: "التقرير الأسبوعي للمؤشرات", type: "أسبوعي", date: "2026-06-21", channels: ["SharePoint", "Teams"] },
  { id: "RPT-M-2026-05", title: "تقرير شهر مايو 2026", type: "شهري", date: "2026-06-01", channels: ["SharePoint"] },
  { id: "RPT-INC-2026-0118", title: "تقرير الحادث — اختراق محيط محطة جدة 2", type: "حادث", date: "2026-06-18", channels: ["SharePoint", "Outlook"] },
];

function Reports() {
  return (
    <div className="space-y-4">
      <SecPageHeader
        title="التقارير التنفيذية"
        subtitle="توليد ونشر التقارير إلى SharePoint و Teams و Outlook"
      >
        <Link to="/executive-reports" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <FileText className="h-3.5 w-3.5" /> فتح مولّد التقارير
        </Link>
      </SecPageHeader>
      <SampleBadge />
      <div className="rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {REPORTS.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-foreground">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.id} · {r.type} · {r.date}</div>
              </div>
              <div className="flex items-center gap-2">
                {r.channels.map(ch => (
                  <span key={ch} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">{ch}</span>
                ))}
                <button className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                  <ExternalLink className="h-3 w-3" /> فتح
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
