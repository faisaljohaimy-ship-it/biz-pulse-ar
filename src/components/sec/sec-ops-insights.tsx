/**
 * رؤى غرفة العمليات داخل النظرة العامة — «تعديلات إضافية V4» (١١٩١):
 * «نقل أعلى 3 مخاطر، إجراءات موصى بها، مخاطر متوقعة إلى نظرة عامة وحذف
 * الباقي من الصفحة لأنه متكرر في النظرة العامة».
 *
 * الأقسام الثلاثة وزرّ «ابدأ الموجز التنفيذي» انتقلت من
 * `src/routes/_authenticated/situation-room.tsx` (المحجوبة الآن —
 * hidden-routes.ts) إلى هذا المكوّن الذي تُركّبه نظرة عامة `/sec`.
 *
 * دوالّ الجلب نفسها بلا تغيير — عقيدة «بيانات لا تفرغ» قائمة فيها:
 *   - `getExecutiveDecisions` قراءة محضة خلف `optionalSupabaseAuth`.
 *   - `getPredictedRisks` خلف `optionalSupabaseAuth` + `resilient()`
 *     (مهلة 4 ثوانٍ ⇐ محاكاة مرجعية).
 *   - `generateExecutiveBriefing` خلف `optionalSupabaseAuth`.
 *
 * التلوين من طبقة الرموز (المادة ٣٣): الصفحة تعمل بالوضعين، فالبطاقات
 * بنمط ألواح النظرة العامة (`border-border bg-card`) وشارات الأولوية عبر
 * `severityClass` من sec-shell — لا خلفيات داكنة مكتوبة يدويًا كما كانت
 * في الصفحة الأم الداكنة.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, PlayCircle, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { screenNameAr, screenNameEn } from "@/lib/nav/screen-names";
import { severityClass } from "@/components/sec/sec-shell";
import { BriefingStage } from "@/components/bridge/BriefingStage";
import {
  getExecutiveDecisions,
  type DecisionItem,
  type ExecutiveDecisions,
} from "@/lib/exec/decisions.functions";
import { getPredictedRisks, type PredictedRisk } from "@/lib/exec/predictive.functions";
import { generateExecutiveBriefing, type ExecutiveBriefing } from "@/lib/exec/briefing.functions";
import { userFacingError } from "@/lib/errors/user-facing-error";

/** تسميات الأولوية بالكلمة لا باللون وحده (WCAG 2.2 §1.4.1). */
const PRIORITY_LABEL: Record<DecisionItem["priority"], { ar: string; en: string }> = {
  critical: { ar: "حرج", en: "Critical" },
  high: { ar: "عالٍ", en: "High" },
  medium: { ar: "متوسط", en: "Medium" },
  low: { ar: "منخفض", en: "Low" },
};

const SEVERITY_LABEL: Record<PredictedRisk["severity"], { ar: string; en: string }> = {
  high: { ar: "عالٍ", en: "High" },
  medium: { ar: "متوسط", en: "Medium" },
  low: { ar: "منخفض", en: "Low" },
};

/**
 * درجة اليقين — **مصطلحٌ لا نسبة مئوية.**
 *
 * كان يُعرض «ثقة ٨٧٪»، ومصدر الرقم على مسار النموذج رقمٌ يقوله النموذج
 * عن نفسه، وعلى مسار المحاكاة ثابتٌ مكتوب. والنسبة توحي بدقّةٍ لا مصدر
 * لها، فحلّ محلّها المصطلح ومعه **العدّات المرصودة نفسها**.
 */
const CONFIDENCE_LABEL: Record<PredictedRisk["confidence"], { ar: string; en: string }> = {
  measured: { ar: "مقيس", en: "Measured" },
  derived: { ar: "مشتقّ", en: "Derived" },
  estimated: { ar: "تقديريّ", en: "Estimated" },
};

export function SecOpsInsights() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const fetchDecisions = useServerFn(getExecutiveDecisions);
  const fetchRisks = useServerFn(getPredictedRisks);
  const genBriefing = useServerFn(generateExecutiveBriefing);

  const decisions = useQuery<ExecutiveDecisions>({
    queryKey: ["sec-ops-decisions"],
    queryFn: () => fetchDecisions(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  const risks = useQuery({
    queryKey: ["sec-ops-predicted-risks"],
    queryFn: () => fetchRisks(),
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const startBriefing = useMutation({
    mutationFn: () => genBriefing(),
    onSuccess: (data) => setBriefing(data),
  });

  return (
    <section aria-label={ar ? "رؤى غرفة العمليات" : "Operations insights"} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InsightPanel
          icon={AlertTriangle}
          title={ar ? "أعلى 3 مخاطر" : "Top 3 Risks"}
          loading={decisions.isLoading}
          error={decisions.isError}
          onRetry={() => void decisions.refetch()}
          isEmpty={(decisions.data?.risks ?? []).length === 0}
          emptyText={ar ? "لا توجد بنود ذات أولوية حالياً." : "No priority items at this time."}
        >
          <DecisionList ar={ar} items={decisions.data?.risks ?? []} />
        </InsightPanel>

        <InsightPanel
          icon={Target}
          title={ar ? "إجراءات موصى بها" : "Recommended Actions"}
          loading={decisions.isLoading}
          error={decisions.isError}
          onRetry={() => void decisions.refetch()}
          isEmpty={(decisions.data?.actions ?? []).length === 0}
          emptyText={ar ? "لا توجد بنود ذات أولوية حالياً." : "No priority items at this time."}
        >
          <DecisionList ar={ar} items={decisions.data?.actions ?? []} />
        </InsightPanel>

        <InsightPanel
          icon={TrendingUp}
          title={ar ? "مخاطر متوقعة" : "Predicted Risks"}
          loading={risks.isLoading}
          error={risks.isError}
          onRetry={() => void risks.refetch()}
          isEmpty={(risks.data ?? []).length === 0}
          // الحالة الفارغة هنا خبر طيّب لا نقص بيانات — تُقال بنبرة سليمة.
          emptyTone="success"
          emptyText={
            ar
              ? "لا تنبيهات متوقعة. الوضع ضمن المعدّل التشغيلي."
              : "No predicted anomalies. Operations are within baseline."
          }
        >
          <PredictedRiskList ar={ar} items={(risks.data ?? []).slice(0, 3)} />
        </InsightPanel>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => startBriefing.mutate(undefined)}
          disabled={startBriefing.isPending}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-xl px-6 py-3",
            "bg-primary text-sm font-semibold text-primary-foreground shadow-glow",
            "transition-colors hover:bg-primary/90",
            "disabled:cursor-not-allowed disabled:opacity-60",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label={ar ? "ابدأ الموجز التنفيذي" : "Begin Executive Briefing"}
        >
          {startBriefing.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <PlayCircle className="h-5 w-5" />
          )}
          {ar ? "ابدأ الموجز التنفيذي · 60 ثانية" : "Begin Executive Briefing · 60s"}
        </button>
        {startBriefing.error && (
          <div className="w-full text-center text-sm text-red-600 dark:text-red-400">
            {/* userFacingError يُعرِّب ويحجب أي نصّ مصادقة خام. */}
            {userFacingError(startBriefing.error)}
          </div>
        )}
      </div>

      {briefing && (
        <BriefingStage
          briefing={briefing}
          ar={ar}
          backTo={{ ar: screenNameAr("/sec"), en: screenNameEn("/sec") }}
          onClose={() => setBriefing(null)}
        />
      )}
    </section>
  );
}

/** لوح بنمط ألواح النظرة العامة نفسه — عنوان بأيقونة ثم محتوى بحالاته الثلاث. */
function InsightPanel({
  icon: Icon,
  title,
  loading,
  error,
  onRetry,
  isEmpty,
  emptyText,
  emptyTone = "muted",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  isEmpty: boolean;
  emptyText: string;
  emptyTone?: "muted" | "success";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-center text-[13px] text-muted-foreground">
          {/* رسالة عربية محايدة — لا نصّ خطأ خام (nexios-ui-patterns). */}
          <div>تعذّر جلب البيانات مؤقتًا.</div>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex min-h-[44px] items-center rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : isEmpty ? (
        <div
          className={cn(
            "rounded-lg border p-3 text-[13px]",
            emptyTone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-border bg-muted/20 text-muted-foreground",
          )}
        >
          {emptyText}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function DecisionList({ ar, items }: { ar: boolean; items: DecisionItem[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((it) => (
        <li key={it.id} className="py-2 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">
                {ar ? it.title_ar : it.title_en}
              </div>
              {(ar ? it.detail_ar : it.detail_en) && (
                <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                  {ar ? it.detail_ar : it.detail_en}
                </div>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                <span className="tabular-nums">
                  {ar ? "ثقة" : "Conf."} {Math.round(it.confidence * 100)}%
                </span>
                {it.business_impact && <span className="truncate">· {it.business_impact}</span>}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-medium",
                severityClass(it.priority),
              )}
            >
              {ar ? PRIORITY_LABEL[it.priority].ar : PRIORITY_LABEL[it.priority].en}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PredictedRiskList({ ar, items }: { ar: boolean; items: PredictedRisk[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((r) => (
        <li key={r.id} className="py-2 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">
                {ar ? r.title_ar : r.title_en}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                {ar ? r.recommendation_ar : r.recommendation_en}
              </div>
              <div className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">
                {/*
                 * العدّات المرصودة تتقدّم المصطلح: هي ما يُبنى عليه القرار،
                 * وكانت محجوبة خلف نسبةٍ مئوية لا أصل لها.
                 */}
                {r.signal ? (
                  <>
                    {ar
                      ? `${r.signal.total7d} بلاغًا/7أ · حرج ${r.signal.critical7d} · آخر 24س ${r.signal.last24h}`
                      : `${r.signal.total7d} inc/7d · ${r.signal.critical7d} crit · ${r.signal.last24h} in 24h`}
                    {" · "}
                  </>
                ) : null}
                {ar ? CONFIDENCE_LABEL[r.confidence].ar : CONFIDENCE_LABEL[r.confidence].en}
                {" · "}
                {r.horizon_hours}h
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-medium",
                severityClass(r.severity),
              )}
            >
              {ar ? SEVERITY_LABEL[r.severity].ar : SEVERITY_LABEL[r.severity].en}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
