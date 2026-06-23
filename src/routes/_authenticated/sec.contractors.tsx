import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { SecPageHeader, statusClass } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec/contractors")({
  component: Contractors,
});

function Contractors() {
  const fetchOverview = useServerFn(getSecOverview);
  const { data } = useQuery({ queryKey: ["sec-overview"], queryFn: () => fetchOverview() });
  const rows = data?.contractors ?? [];
  return (
    <div className="space-y-4">
      <SecPageHeader title="إدارة المقاولين" subtitle={`${rows.length} مقاول مسجّل`} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{c.name}</div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(c.status)}`}>{c.status}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">عقد: {c.contract_no}</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div><div className="text-muted-foreground">العمالة</div><div className="font-semibold text-foreground">{c.workers_count}</div></div>
              <div><div className="text-muted-foreground">امتثال</div><div className={`font-semibold ${c.compliance_score >= 90 ? "text-emerald-500" : c.compliance_score >= 70 ? "text-amber-500" : "text-red-500"}`}>{c.compliance_score}%</div></div>
            </div>
            {c.expires_at && (
              <div className="mt-2 text-[11px] text-muted-foreground">
                ينتهي: {new Date(c.expires_at).toLocaleDateString("ar-SA")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
