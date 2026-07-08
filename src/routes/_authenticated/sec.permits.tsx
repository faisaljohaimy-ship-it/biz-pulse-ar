import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPermits, getOmsKpis } from "@/lib/oms.functions";
import { SecPageHeader, StatCard, severityClass, statusClass } from "@/components/sec/sec-shell";
import { NewPermitDialog, PermitActions } from "@/components/sec/oms-dialogs";
import { LiveStatus } from "@/components/state/LiveStatus";

export const Route = createFileRoute("/_authenticated/sec/permits")({
  component: Permits,
});

type Permit = {
  id: string;
  ref: string;
  work_type: string;
  contractor: string;
  risk_level: string;
  status: string;
  starts_at: string;
  ends_at: string;
  approver: string | null;
};

function Permits() {
  const fetchPermits = useServerFn(listPermits);
  const fetchKpis = useServerFn(getOmsKpis);
  const { data } = useQuery({
    queryKey: ["oms-permits"],
    queryFn: () => fetchPermits(),
    refetchInterval: 30_000,
  });
  const { data: kpis } = useQuery({
    queryKey: ["oms-kpis"],
    queryFn: () => fetchKpis(),
    refetchInterval: 30_000,
  });
  const rows = (data ?? []) as Permit[];

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="إدارة التصاريح (Permit to Work)"
        subtitle={`${rows.length} تصريح — اعتماد متعدد المستويات`}
      >
        <NewPermitDialog />
      </SecPageHeader>

      {kpis && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="إجمالي" value={kpis.permits.total} />
          <StatCard label="نشطة" value={kpis.permits.active} tone="success" />
          <StatCard label="قيد الاعتماد" value={kpis.permits.pending} tone="warning" />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">المرجع</th>
              <th className="px-3 py-2 text-start">نوع العمل</th>
              <th className="px-3 py-2 text-start">المقاول</th>
              <th className="px-3 py-2 text-start">الخطورة</th>
              <th className="px-3 py-2 text-start">الحالة</th>
              <th className="px-3 py-2 text-start">من</th>
              <th className="px-3 py-2 text-start">إلى</th>
              <th className="px-3 py-2 text-start">المعتمِد</th>
              <th className="px-3 py-2 text-start">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{p.ref}</td>
                <td className="px-3 py-2">{p.work_type}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.contractor}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${severityClass(p.risk_level)}`}
                  >
                    {p.risk_level}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(p.status)}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {new Date(p.starts_at).toLocaleDateString("ar-SA")}
                </td>
                <td className="px-3 py-2 text-xs">
                  {new Date(p.ends_at).toLocaleDateString("ar-SA")}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{p.approver ?? "—"}</td>
                <td className="px-3 py-2">
                  <PermitActions id={p.id} status={p.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center">
                  <LiveStatus
                    variant="monitoring"
                    hint="نظام التصاريح متصل — لا تصاريح نشطة الآن"
                    size="sm"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
