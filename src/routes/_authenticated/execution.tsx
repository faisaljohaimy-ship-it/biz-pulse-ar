import { createFileRoute } from "@tanstack/react-router";
import { GitBranch, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { useEnterprisePulse } from "@/lib/enterprise-pulse";

export const Route = createFileRoute("/_authenticated/execution")({
  component: ExecutionPage,
});

const RISK_TONE = { low: "emerald", medium: "cyan", high: "amber", critical: "rose" } as const;

function ExecutionPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const pulse = useEnterprisePulse();

  const stuck = pulse.execution.filter((e) => e.status === "blocked" || e.completion < 25).length;
  const avgCompletion = Math.round(pulse.execution.reduce((s, e) => s + e.completion, 0) / Math.max(1, pulse.execution.length));
  const critical = pulse.execution.filter((e) => e.risk === "critical").length;

  return (
    <NexusPage
      eyebrow="EXECUTION INTELLIGENCE"
      title={ar ? "طبقة ذكاء التنفيذ" : "Execution Intelligence Layer"}
      subtitle={
        ar
          ? "قرار ← إجراء ← مالك ← إدارة ← تبعية ← خطر ← إنجاز."
          : "Decision → Action → Owner → Department → Dependency → Risk → Completion."
      }
      actions={<NexusPill tone="cyan"><GitBranch className="h-3 w-3" /> CHAIN</NexusPill>}
      why={ar ? "القرارات تُتخذ ثم تختفي بين الإدارات قبل التنفيذ." : "Decisions get made and then disappear between departments before execution."}
      whatNext={ar ? "حدد البنود المتوقفة وأزل عوائقها فوراً." : "Identify blocked steps and unblock them immediately."}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NexusStat label={ar ? "متوسط الإنجاز" : "Avg completion"} value={`${avgCompletion}%`} tone="cyan" />
        <NexusStat label={ar ? "متوقفة" : "Stuck"} value={String(stuck)} tone="amber" />
        <NexusStat label={ar ? "خطر حرج" : "Critical risk"} value={String(critical)} tone="rose" />
      </div>

      <div className="grid gap-3">
        {pulse.execution.map((e) => {
          const riskTone = RISK_TONE[e.risk];
          return (
            <NexusCard key={e.id} glow={e.risk === "critical"}>
              <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_140px] lg:items-center">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{ar ? "قرار" : "Decision"}</div>
                  <div className="text-sm font-semibold text-slate-100">{ar ? e.decision_ar : e.decision_en}</div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-cyan-300/80">
                    <ArrowRight className="h-3 w-3" /> {ar ? e.action_ar : e.action_en}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400">
                  <div>{ar ? "المالك" : "Owner"}: <span className="text-slate-200">{e.owner}</span></div>
                  <div>{ar ? "الإدارة" : "Dept"}: <span className="text-slate-200">{e.department}</span></div>
                </div>
                <div className="text-[11px] text-slate-400">
                  <div>{ar ? "تبعية" : "Dependency"}: <span className="text-slate-200">{ar ? e.dependency_ar : e.dependency_en}</span></div>
                  <div className="mt-1 flex items-center gap-2">
                    <NexusPill tone={riskTone}>{ar ? "خطر" : "Risk"}: {e.risk}</NexusPill>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{ar ? "إنجاز" : "Completion"}</div>
                  <div className="text-lg font-bold text-cyan-300">{e.completion}%</div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full ${e.status === "blocked" ? "bg-rose-400" : "bg-gradient-to-r from-cyan-400 to-emerald-400"}`} style={{ width: `${e.completion}%` }} />
                  </div>
                  <div className="mt-1 text-[10px] uppercase text-slate-500">{e.status.replace("_", " ")}</div>
                </div>
              </div>
            </NexusCard>
          );
        })}
      </div>
    </NexusPage>
  );
}
