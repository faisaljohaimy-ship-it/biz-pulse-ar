import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Activity, ArrowRight, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { useEnterprisePulse } from "@/lib/enterprise-pulse";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/crisis")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CrisisPage,
});

const CAT_LABELS: Record<string, { ar: string; en: string }> = {
  delay: { ar: "تأخر", en: "Delay" },
  silence: { ar: "صمت", en: "Silence" },
  bottleneck: { ar: "اختناق", en: "Bottleneck" },
  dependency: { ar: "تبعية", en: "Dependency" },
  workflow: { ar: "سير عمل", en: "Workflow" },
  escalation: { ar: "تصعيد", en: "Escalation" },
  missed_commitment: { ar: "التزام مفقود", en: "Missed commitment" },
};

function CrisisPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const pulse = useEnterprisePulse();
  const sorted = [...pulse.crises].sort((a, b) => b.riskScore - a.riskScore);

  const critical = sorted.filter((c) => c.riskScore >= 75).length;
  const high = sorted.filter((c) => c.riskScore >= 60 && c.riskScore < 75).length;
  const avgRisk = Math.round(
    sorted.reduce((s, c) => s + c.riskScore, 0) / Math.max(1, sorted.length),
  );

  return (
    <NexusPage
      eyebrow="CRISIS PREDICTION"
      title={ar ? "محرك التنبؤ بالأزمات" : "Crisis Prediction Engine"}
      subtitle={
        ar
          ? "تنبيهات تنفيذية قبل أن تتحول المخاطر إلى أزمات."
          : "Executive alerts before risks become crises."
      }
      actions={
        <NexusPill tone="rose">
          <Zap className="h-3 w-3" /> PREDICTIVE
        </NexusPill>
      }
      why={
        ar
          ? "المخاطر تتراكم بصمت قبل الانفجار التشغيلي."
          : "Risks compound silently before operational blow-ups."
      }
      whatNext={
        ar
          ? "ابدأ بأعلى درجة خطورة وأسند الإجراء الموصى به."
          : "Start with the highest risk score and assign the recommended action."
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat
          label={ar ? "تنبؤات نشطة" : "Active predictions"}
          value={String(sorted.length)}
          tone="cyan"
        />
        <NexusStat label={ar ? "حرج" : "Critical"} value={String(critical)} tone="rose" />
        <NexusStat label={ar ? "مرتفع" : "High"} value={String(high)} tone="amber" />
        <NexusStat
          label={ar ? "متوسط الخطورة" : "Avg risk score"}
          value={`${avgRisk}/100`}
          tone="violet"
        />
      </div>

      <div className="grid gap-3">
        {sorted.map((c) => {
          const tone = c.riskScore >= 75 ? "rose" : c.riskScore >= 60 ? "amber" : "cyan";
          return (
            <NexusCard key={c.id} glow={c.riskScore >= 75}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
                <div className="flex w-full shrink-0 flex-row items-center justify-between gap-3 lg:w-44 lg:flex-col lg:items-start">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">
                      {ar ? "درجة الخطورة" : "Risk score"}
                    </div>
                    <div
                      className={`text-3xl font-bold ${tone === "rose" ? "text-rose-300" : tone === "amber" ? "text-amber-300" : "text-cyan-300"}`}
                    >
                      {c.riskScore}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {ar ? "احتمال" : "probability"} {c.probability}%
                    </div>
                  </div>
                  <NexusPill tone={tone}>
                    {ar ? CAT_LABELS[c.category].ar : CAT_LABELS[c.category].en}
                  </NexusPill>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-100">
                    {ar ? c.title_ar : c.title_en}
                  </h3>
                  <div className="grid gap-2 text-[12px] sm:grid-cols-2">
                    <div className="rounded-md border border-rose-500/15 bg-rose-500/5 p-2">
                      <div className="text-[10px] uppercase tracking-widest text-rose-300/80">
                        {ar ? "الأثر" : "Impact"}
                      </div>
                      <div className="text-slate-200">{ar ? c.impact_ar : c.impact_en}</div>
                    </div>
                    <div className="rounded-md border border-emerald-500/15 bg-emerald-500/5 p-2">
                      <div className="text-[10px] uppercase tracking-widest text-emerald-300/80">
                        {ar ? "إجراء موصى" : "Recommended action"}
                      </div>
                      <div className="text-slate-200">{ar ? c.action_ar : c.action_en}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="text-[11px] text-slate-400">
                      {ar ? "المالك" : "Owner"}: <span className="text-slate-200">{c.owner}</span>
                    </div>
                    <Link
                      to={c.route}
                      className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"
                    >
                      {ar ? "افتح المصدر" : "Open source"} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </NexusCard>
          );
        })}
      </div>

      <NexusCard>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <Activity className="h-4 w-4 text-cyan-300" />
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          <span>
            {ar
              ? "يتم تحديث التنبؤات تلقائياً من إشارات الذاكرة المؤسسية والأنظمة المتكاملة."
              : "Predictions auto-refresh from enterprise memory signals and integrated systems."}
          </span>
        </div>
      </NexusCard>
    </NexusPage>
  );
}
