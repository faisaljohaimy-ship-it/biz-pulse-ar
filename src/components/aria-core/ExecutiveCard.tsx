/**
 * ExecutiveCard — compact, arabic-first render of ARIA's current
 * ExecutionEnvelope. Consumes `useAriaStore().activeExecution` and shows
 * only executive-facing fields: summary, risk, priority, confidence,
 * recommended action, approval requirement, next step.
 *
 * No provider/model names, no raw JSON, no stack traces, no internal
 * queue states surfaced to the user.
 */
import { ShieldAlert, Gauge, CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { useAriaStore } from "@/lib/aria-core/store";
import { cn } from "@/lib/utils";
import type { RiskLevel, PriorityLevel } from "@/lib/aria-core/types/executive";

const RISK_AR: Record<RiskLevel, string> = {
  critical: "حرجة",
  high: "مرتفعة",
  medium: "متوسطة",
  low: "منخفضة",
  info: "معلوماتية",
};

const PRIORITY_AR: Record<PriorityLevel, string> = {
  P0: "قصوى — P0",
  P1: "عالية — P1",
  P2: "متوسطة — P2",
  P3: "منخفضة — P3",
  INFO: "معلوماتية",
};

const RISK_TONE: Record<RiskLevel, string> = {
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  high: "text-destructive border-destructive/30 bg-destructive/5",
  medium: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  low: "text-primary border-primary/30 bg-primary/5",
  info: "text-muted-foreground border-border/40 bg-secondary/20",
};

export function ExecutiveCard() {
  const env = useAriaStore((s) => s.activeExecution);
  if (!env) return null;

  const nextStep = env.steps[0];
  const approvalRequired = env.approval.required && env.approval.status !== "granted";
  const confidencePct = Math.round(env.confidence.percent);

  return (
    <section
      dir="rtl"
      aria-label="ملخص ARIA التنفيذي"
      className="mx-4 mb-3 mt-1 rounded-xl border border-primary/25 bg-card/70 p-3 shadow-sm backdrop-blur-md"
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-primary/80">
          ملخص تنفيذي
        </span>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
            RISK_TONE[env.risk.level],
          )}
        >
          مخاطر: {RISK_AR[env.risk.level]}
        </span>
      </header>

      <p className="mb-3 text-sm leading-relaxed text-foreground">
        {env.objective_ar || env.recommendedAction_ar}
      </p>

      <dl className="mb-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-md border border-border/40 bg-background/40 px-2 py-1.5">
          <dt className="mb-0.5 flex items-center gap-1 text-muted-foreground">
            <ShieldAlert className="h-3 w-3" aria-hidden />
            الأولوية
          </dt>
          <dd className="font-medium text-foreground">{PRIORITY_AR[env.priority.level]}</dd>
        </div>
        <div className="rounded-md border border-border/40 bg-background/40 px-2 py-1.5">
          <dt className="mb-0.5 flex items-center gap-1 text-muted-foreground">
            <Gauge className="h-3 w-3" aria-hidden />
            الثقة
          </dt>
          <dd className="font-medium text-foreground">{confidencePct}%</dd>
        </div>
      </dl>

      <div className="mb-2 rounded-md border border-primary/20 bg-primary/5 px-2 py-2">
        <div className="mb-1 flex items-center gap-1 text-[11px] text-primary">
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          الإجراء الموصى به
        </div>
        <p className="text-xs leading-relaxed text-foreground">
          {env.recommendedAction_ar || "لا توجد توصية متاحة حاليًا."}
        </p>
      </div>

      {nextStep ? (
        <div className="mb-2 flex items-start gap-2 rounded-md border border-border/40 bg-background/40 px-2 py-2">
          <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden />
          <div className="text-xs leading-relaxed text-foreground">
            <span className="text-[10px] text-muted-foreground">الخطوة التالية</span>
            <br />
            {nextStep.label_ar}
          </div>
        </div>
      ) : null}

      {approvalRequired ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-400">
          <Lock className="h-3 w-3" aria-hidden />
          يتطلب موافقة قبل التنفيذ
        </div>
      ) : null}
    </section>
  );
}
