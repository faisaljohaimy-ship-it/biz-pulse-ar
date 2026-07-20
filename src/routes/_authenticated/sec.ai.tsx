import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { useAuth } from "@/lib/auth-context";
import { SecPageHeader } from "@/components/sec/sec-shell";
import { SecLiveBadge } from "@/components/sec/SecLiveBadge";
import { Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sec/ai")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: AIRec,
});

function AIRec() {
  const { user, loading: authLoading } = useAuth();
  const fetchOverview = useServerFn(getSecOverview);
  const { data, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["sec-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    enabled: !authLoading,
  });
  if (!data) return <div className="text-sm text-muted-foreground">جاري التحميل…</div>;

  const recs: {
    title: string;
    rationale: string;
    impact: "عالٍ" | "متوسط" | "منخفض";
    action: string;
  }[] = [];
  if (data.counts.incidents_critical > 0)
    recs.push({
      title: `معالجة فورية لـ ${data.counts.incidents_critical} بلاغ حرج`,
      rationale: "بلاغات بدرجة حرجة لا تزال مفتوحة وتؤثر على المؤشرات التنفيذية.",
      impact: "عالٍ",
      action: "تصعيد إلى مدير المنطقة وفتح غرفة استجابة",
    });
  if (data.counts.cctv_new > 3)
    recs.push({
      title: "زيادة مراقبي شاشات CCTV في الوردية الحالية",
      rationale: `${data.counts.cctv_new} تنبيهات لم تُستجَب لها — يُشير إلى ضعف تغطية وردية المراقبة.`,
      impact: "متوسط",
      action: "تعزيز فريق غرفة العمليات بمراقب إضافي",
    });
  if (data.counts.assets_offline > 0)
    recs.push({
      title: `إصلاح ${data.counts.assets_offline} أصل أمني متأثر`,
      rationale: "أصول أمنية بحالة متدنية أو متعطلة قد تخلق ثغرات.",
      impact: "عالٍ",
      action: "فتح أمر صيانة عاجل للوحدة التقنية",
    });
  const expiringPermits = data.permits.filter(
    (p) => p.status === "active" && new Date(p.ends_at).getTime() - Date.now() < 3 * 24 * 3600_000,
  ).length;
  if (expiringPermits > 0)
    recs.push({
      title: `${expiringPermits} تصريح ينتهي خلال 72 ساعة`,
      rationale: "تجديد متأخر يُعرّض الأعمال للتوقف وإغلاقات غير مخطّطة.",
      impact: "متوسط",
      action: "إشعار المعتمِدين وفتح طلبات تجديد",
    });
  const lowCompliance = data.contractors.filter((c) => c.compliance_score < 80).length;
  if (lowCompliance > 0)
    recs.push({
      title: `مراجعة امتثال ${lowCompliance} مقاول`,
      rationale: "نقاط امتثال منخفضة قد تستوجب تنبيهات أو إيقافاً مؤقتاً.",
      impact: "متوسط",
      action: "إصدار خطة تصحيحية ومتابعتها أسبوعياً",
    });
  if (recs.length === 0)
    recs.push({
      title: "لا توجد توصيات حرجة الآن",
      rationale: "جميع المؤشرات ضمن النطاق المقبول.",
      impact: "منخفض",
      action: "متابعة الخطة الأسبوعية المعتادة",
    });

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="التوصيات الذكية"
        subtitle="مولّدة من بيانات العمليات لحظياً"
        badge="ARIA Insights"
      >
        <SecLiveBadge dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} source="sec_overview" />
      </SecPageHeader>
      <div className="grid gap-3 md:grid-cols-2">
        {recs.map((r, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> {r.title}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{r.rationale}</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                الأثر: <span className="font-semibold text-foreground">{r.impact}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-primary">
                <ArrowRight className="h-3 w-3" /> {r.action}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
