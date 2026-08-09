// SADEED RAG — WS-8. لوحة مراقبة استعلامات RAG (بوابة الأدلة، زمن الاستجابة،
// أفضل الاستعلامات، آخر السجلات). قراءة فقط عبر rag_query_log مع عزل المستأجر.

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { PageHeader, Section } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/EmptyState";
import { Search, ShieldCheck, ShieldX, TimerReset, Gauge, Quote, TrendingDown } from "lucide-react";
import { getRagStats, type RagStatsRow } from "@/lib/sadeed/rag/stats.functions";

export const Route = createFileRoute("/_authenticated/rag-monitor")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: RagMonitor,
});

const gateTone: Record<string, string> = {
  passed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  below_threshold: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  no_citations: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  injection_blocked: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  rate_limited: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  error: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  pending: "bg-muted/40 text-muted-foreground border-border",
};

// المادة ٢٧ — الصدق العددي: ما لم يُقَس يُعرض بنصّه لا بصفر مُختلق.
const UNMEASURED = "لم يُقَس";

function fmt(v: number | null | undefined, suffix = ""): string {
  if (v === null || v === undefined) return UNMEASURED;
  return `${v}${suffix}`;
}

// نسبة عبور البوابة: null ⇐ «لم يُقَس» بدل 0%.
function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return UNMEASURED;
  return `${Math.round(v * 100)}%`;
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-bold text-foreground">{value}</div>
        {hint ? <div className="text-[12px] text-muted-foreground">{hint}</div> : null}
      </div>
    </Card>
  );
}

function RagMonitor() {
  const fetchStats = useServerFn(getRagStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["rag-monitor"],
    queryFn: () => fetchStats({}),
    refetchInterval: 15_000,
  });

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="مراقبة نظام RAG"
        subtitle="بوابة الأدلة، زمن الاستجابة، وسجل الاستعلامات — آخر 24 ساعة"
      />

      {error ? (
        <Card className="p-4 text-sm text-rose-300">
          تعذّر تحميل الإحصاءات: {(error as Error).message}
        </Card>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Search className="w-5 h-5" />}
          label="إجمالي الاستعلامات"
          value={fmt(data?.total)}
        />
        <StatCard
          icon={<ShieldCheck className="w-5 h-5" />}
          label="نسبة عبور بوابة الأدلة"
          value={fmtPct(data?.pass_rate)}
          hint={data ? `${data.passed} من ${data.total}` : undefined}
        />
        <StatCard
          icon={<TimerReset className="w-5 h-5" />}
          label="متوسط زمن الاستجابة"
          value={fmt(data?.avg_latency_ms, " ms")}
        />
        <StatCard
          icon={<Gauge className="w-5 h-5" />}
          label="متوسط أعلى تشابه"
          value={fmt(data?.avg_max_similarity)}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<ShieldCheck className="w-5 h-5" />}
          label="عبَر البوابة"
          value={fmt(data?.passed)}
        />
        {/* ثلاث بطاقات **فشل** كانت تحمل درع النجاح نفسه الذي تحمله بطاقة
            «عبَر البوابة» — فتقرأ الأربع سواءً وهي أربع حالات متناقضة. */}
        <StatCard
          icon={<TrendingDown className="w-5 h-5" />}
          label="أقل من العتبة"
          value={fmt(data?.below_threshold)}
        />
        <StatCard
          icon={<Quote className="w-5 h-5" />}
          label="بلا استشهادات كافية"
          value={fmt(data?.no_citations)}
        />
        <StatCard
          icon={<ShieldX className="w-5 h-5" />}
          label="أخطاء / حجب حقن"
          value={fmt(data?.errors)}
        />
      </div>

      <Section>
        <div className="mb-2">
          <div className="text-sm font-semibold">آخر الاستعلامات</div>
          <div className="text-xs text-muted-foreground">
            حتى 50 استعلامًا مع نتيجة بوابة الأدلة
          </div>
        </div>
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">جارٍ التحميل…</div>
          ) : (data?.recent ?? []).length === 0 ? (
            <EmptyState
              reason="waiting"
              title="لا توجد استعلامات بعد"
              description="ستظهر هنا كل استعلامات RAG خلال آخر 24 ساعة."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs">
                  <tr>
                    <th className="text-right p-3">الاستعلام</th>
                    <th className="text-right p-3">النتيجة</th>
                    <th className="text-right p-3">أعلى تشابه</th>
                    <th className="text-right p-3">النتائج</th>
                    <th className="text-right p-3">الزمن</th>
                    <th className="text-right p-3">المسار</th>
                    <th className="text-right p-3">الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent ?? []).map((r: RagStatsRow) => (
                    <tr key={r.id} className="border-t border-border/40">
                      <td className="p-3 max-w-[320px] truncate" title={r.query_text}>
                        {r.query_text}
                      </td>
                      <td className="p-3">
                        <Badge className={gateTone[r.gate_result] ?? gateTone.pending}>
                          {r.gate_result}
                        </Badge>
                      </td>
                      <td className="p-3 tabular-nums">
                        {r.max_similarity === null ? "—" : r.max_similarity.toFixed(3)}
                      </td>
                      <td className="p-3 tabular-nums">{r.hits_count}</td>
                      <td className="p-3 tabular-nums">
                        {r.latency_ms === null ? "—" : `${r.latency_ms} ms`}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{r.route ?? "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("ar-SA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>
    </div>
  );
}
