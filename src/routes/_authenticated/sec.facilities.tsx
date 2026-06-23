import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { SecPageHeader, statusClass, severityClass } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec/facilities")({
  component: Facilities,
});

function Facilities() {
  const fetchOverview = useServerFn(getSecOverview);
  const { data } = useQuery({ queryKey: ["sec-overview"], queryFn: () => fetchOverview() });
  const sites = data?.sites ?? [];
  return (
    <div className="space-y-4">
      <SecPageHeader title="حالة المواقع" subtitle={`${sites.length} موقع في المنطقة الغربية`} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {sites.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{s.name_ar}</div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(s.status)}`}>{s.status}</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{s.code} · {s.name_en}</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">الحساسية</div>
                <span className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] ${severityClass(s.sensitivity)}`}>{s.sensitivity}</span>
              </div>
              <div>
                <div className="text-muted-foreground">عدد الحرّاس</div>
                <div className="font-semibold text-foreground">{s.guards_count}</div>
              </div>
            </div>
            {s.notes && <p className="mt-3 text-[11px] text-muted-foreground">{s.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
