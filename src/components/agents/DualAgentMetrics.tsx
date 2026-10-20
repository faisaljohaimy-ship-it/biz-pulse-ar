import { CheckCircle2, Clock3, AlertTriangle, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";

export type DualAgentMetricValues = {
  sampleSize: number;
  succeeded: number;
  failed: number;
  pendingApproval: number;
  running: number;
  successRate: number | null;
};

export function DualAgentMetrics({ metrics }: { metrics?: DualAgentMetricValues }) {
  const items = [
    { label: "نجحت", value: metrics?.succeeded, Icon: CheckCircle2 },
    { label: "تحتاج مراجعة", value: metrics?.failed, Icon: AlertTriangle },
    { label: "بانتظار الاعتماد", value: metrics?.pendingApproval, Icon: Clock3 },
    { label: "قيد التنفيذ", value: metrics?.running, Icon: Activity },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="مؤشرات سجل التنفيذ">
      {items.map(({ label, value, Icon }) => (
        <Card key={label} className="min-w-0 space-y-3 p-4">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">
            {value === undefined ? "لم يُقَس" : value.toLocaleString("ar-SA")}
          </p>
        </Card>
      ))}
    </div>
  );
}

export function DualAgentDistribution({ metrics }: { metrics: DualAgentMetricValues }) {
  const rows = [
    { label: "نجحت", count: metrics.succeeded },
    { label: "تحتاج مراجعة", count: metrics.failed },
    { label: "بانتظار الاعتماد", count: metrics.pendingApproval },
    { label: "قيد التنفيذ", count: metrics.running },
  ];
  return (
    <div className="space-y-3" aria-label="توزيع الحالات في العينة">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>{row.label}</span>
            <span>{row.count.toLocaleString("ar-SA")}</span>
          </div>
          <meter
            className="h-3 w-full accent-primary"
            min={0}
            max={Math.max(1, metrics.sampleSize)}
            value={row.count}
            aria-label={row.label}
          />
        </div>
      ))}
    </div>
  );
}
