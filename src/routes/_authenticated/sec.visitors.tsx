import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { SecPageHeader, statusClass } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec/visitors")({
  component: Visitors,
});

function Visitors() {
  const fetchOverview = useServerFn(getSecOverview);
  const { data } = useQuery({ queryKey: ["sec-overview"], queryFn: () => fetchOverview() });
  const rows = data?.visitors ?? [];
  return (
    <div className="space-y-4">
      <SecPageHeader title="إدارة الزوار" subtitle={`${rows.length} زائر مسجّل`} />
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">المرجع</th>
              <th className="px-3 py-2 text-start">الاسم</th>
              <th className="px-3 py-2 text-start">الجهة</th>
              <th className="px-3 py-2 text-start">المضيف</th>
              <th className="px-3 py-2 text-start">الغرض</th>
              <th className="px-3 py-2 text-start">البطاقة</th>
              <th className="px-3 py-2 text-start">دخول</th>
              <th className="px-3 py-2 text-start">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{v.ref}</td>
                <td className="px-3 py-2">{v.full_name}</td>
                <td className="px-3 py-2 text-muted-foreground">{v.organization ?? "—"}</td>
                <td className="px-3 py-2">{v.host}</td>
                <td className="px-3 py-2 text-muted-foreground">{v.purpose ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{v.badge_no ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(v.check_in_at).toLocaleString("ar-SA")}</td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass(v.status)}`}>{v.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
