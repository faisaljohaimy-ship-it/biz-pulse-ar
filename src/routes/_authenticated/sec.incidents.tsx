import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { SecPageHeader, severityClass, statusClass } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec/incidents")({
  component: Incidents,
});

function Incidents() {
  const fetchOverview = useServerFn(getSecOverview);
  const { data } = useQuery({ queryKey: ["sec-overview"], queryFn: () => fetchOverview() });
  const rows = data?.incidents ?? [];
  return (
    <div className="space-y-4">
      <SecPageHeader title="إدارة البلاغات" subtitle={`${rows.length} بلاغ — يتضمّن المغلق والمفتوح`} />
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">المرجع</th>
              <th className="px-3 py-2 text-start">العنوان</th>
              <th className="px-3 py-2 text-start">الفئة</th>
              <th className="px-3 py-2 text-start">الخطورة</th>
              <th className="px-3 py-2 text-start">الحالة</th>
              <th className="px-3 py-2 text-start">المسؤول</th>
              <th className="px-3 py-2 text-start">الاستجابة (د)</th>
              <th className="px-3 py-2 text-start">بُلِّغ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{i.ref}</td>
                <td className="px-3 py-2">{i.title_ar}</td>
                <td className="px-3 py-2 text-muted-foreground">{i.category}</td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityClass(i.severity)}`}>{i.severity}</span></td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass(i.status)}`}>{i.status}</span></td>
                <td className="px-3 py-2 text-muted-foreground">{i.owner ?? "—"}</td>
                <td className="px-3 py-2">{i.response_minutes ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(i.reported_at).toLocaleString("ar-SA")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
