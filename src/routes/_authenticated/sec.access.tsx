import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { SecPageHeader, StatCard, SampleBadge } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec/access")({
  component: AccessControl,
});

function AccessControl() {
  const fetchOverview = useServerFn(getSecOverview);
  const { data } = useQuery({ queryKey: ["sec-overview"], queryFn: () => fetchOverview() });
  const visitors = data?.visitors ?? [];
  const permits = data?.permits ?? [];
  return (
    <div className="space-y-4">
      <SecPageHeader title="التحكم بالدخول" subtitle="نظرة موحدة على الزوار والتصاريح والصلاحيات" badge="Sample" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="بطاقات نشطة" value={visitors.filter((v) => v.status === "inside").length} />
        <StatCard label="تصاريح فعّالة" value={permits.filter((p) => p.status === "active").length} />
        <StatCard label="محاولات مرفوضة (24س)" value={4} hint="بيانات تجريبية" tone="warning" />
        <StatCard label="بوّابات نشطة" value={6} hint="بيانات تجريبية" />
      </div>
      <SampleBadge />
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        طبقة التكامل مع نظام مراقبة الدخول (Lenel/Genetec/HID) جاهزة بصيغة REST — راجع صفحة التكاملات لتفعيلها.
      </div>
    </div>
  );
}
