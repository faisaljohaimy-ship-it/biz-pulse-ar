import { useNavigate } from "@tanstack/react-router";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { usePredictions } from "@/lib/use-fabric";
import { NexusCard, NexusPill } from "@/components/nexus-frame";

const KIND_ICON = {
  forecast: TrendingUp,
  anomaly: AlertTriangle,
  risk: AlertTriangle,
  opportunity: Lightbulb,
  recommendation: Sparkles,
} as const;

export function PredictionsPanel({ compact = false }: { compact?: boolean }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const { data, isLoading } = usePredictions();
  const preds = data?.predictions ?? [];

  return (
    <NexusCard glow>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">
            {ar ? "الذكاء التنبؤي" : "PREDICTIVE INTELLIGENCE"}
          </div>
        </div>
        <NexusPill tone="violet">
          {isLoading
            ? ar
              ? "تحليل..."
              : "Analyzing..."
            : `${preds.length} ${ar ? "إشارة" : "signals"}`}
        </NexusPill>
      </div>

      {preds.length === 0 && !isLoading && (
        <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center text-sm text-slate-400">
          {ar ? "لا توجد توقعات حرجة. النظام مستقر." : "No critical predictions. System stable."}
        </div>
      )}

      <div className={`mt-3 grid gap-2 ${compact ? "" : "md:grid-cols-2"}`}>
        {preds.slice(0, compact ? 3 : 6).map((p) => {
          const Icon = KIND_ICON[p.kind] ?? Sparkles;
          return (
            <button
              key={p.id}
              onClick={() => p.route && navigate({ to: p.route })}
              className="group rounded-lg border border-white/5 bg-white/[0.02] p-3 text-start transition hover:border-white/15 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 text-${p.tone}-300`} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white line-clamp-2">
                      {ar ? p.title_ar : p.title_en}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                      {ar ? p.detail_ar : p.detail_en}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-500 group-hover:text-white" />
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <NexusPill tone={p.tone}>{p.kind}</NexusPill>
                <NexusPill tone="cyan">
                  {p.confidence}% {ar ? "ثقة" : "conf"}
                </NexusPill>
                <NexusPill tone={p.impact === "critical" || p.impact === "high" ? "rose" : "amber"}>
                  {p.impact}
                </NexusPill>
                <span className="text-[10px] text-slate-500">{p.horizonDays}d</span>
              </div>
            </button>
          );
        })}
      </div>
    </NexusCard>
  );
}
