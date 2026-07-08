// Cinematic Initialization HUD — shown while EnterpriseRuntime hydrates.
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Building2,
  Radar,
  Activity,
  BarChart3,
  Bot,
  Radio,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

const STAGES = [
  { key: "auth", label_ar: "المصادقة", label_en: "Authentication", icon: ShieldCheck },
  { key: "org", label_ar: "بيانات المؤسسة", label_en: "Organization", icon: Building2 },
  { key: "twin", label_ar: "التوأم الرقمي", label_en: "Digital Twin", icon: Radar },
  { key: "ops", label_ar: "العمليات", label_en: "Operations", icon: Activity },
  { key: "kpi", label_ar: "مؤشرات الأداء", label_en: "Executive KPIs", icon: BarChart3 },
  { key: "agents", label_ar: "الوكلاء", label_en: "Agents", icon: Bot },
  { key: "realtime", label_ar: "البث اللحظي", label_en: "Realtime", icon: Radio },
  { key: "aria", label_ar: "ARIA", label_en: "ARIA Runtime", icon: Sparkles },
] as const;

export function InitializingShell({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry?: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (error) return;
    const id = window.setInterval(() => {
      setStep((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 220);
    return () => window.clearInterval(id);
  }, [error]);

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#061A2E] text-white"
    >
      {/* Ambient grid */}
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(0,212,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#00D4FF]/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-xl px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00D4FF]/40 bg-[#00D4FF]/10 shadow-[0_0_40px_rgba(0,212,255,0.35)]">
            <Sparkles className="h-7 w-7 text-[#3AE8FF]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {error ? "تعذّر تهيئة المنصة" : "تهيئة نظام التشغيل المؤسسي"}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {error
              ? "تحقق من اتصالك وحاول مجدداً"
              : "NEXUS AI OS — Industrial Security, Western Region"}
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-100">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" />
              <span>Runtime bootstrap failed</span>
            </div>
            <p className="mb-4 break-all text-red-200/80">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="rounded-lg border border-red-300/50 bg-red-500/20 px-4 py-2 text-xs font-medium uppercase tracking-wider text-red-100 transition hover:bg-red-500/30"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <ol className="space-y-2">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const done = i < step;
              const active = i === step;
              return (
                <li
                  key={stage.key}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                    done
                      ? "border-[#00D4FF]/30 bg-[#00D4FF]/5"
                      : active
                        ? "border-[#3AE8FF]/60 bg-[#3AE8FF]/10 shadow-[0_0_30px_rgba(58,232,255,0.25)]"
                        : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        done
                          ? "bg-[#00D4FF]/20 text-[#3AE8FF]"
                          : active
                            ? "bg-[#3AE8FF]/30 text-white"
                            : "bg-white/5 text-white/40"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-medium">{stage.label_ar}</div>
                      <div className="text-[11px] uppercase tracking-wider text-white/40">
                        {stage.label_en}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wider">
                    {done ? (
                      <span className="text-[#3AE8FF]">Ready</span>
                    ) : active ? (
                      <span className="animate-pulse text-white/80">Initializing…</span>
                    ) : (
                      <span className="text-white/30">Queued</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <p className="mt-6 text-center text-[11px] uppercase tracking-[0.3em] text-white/30">
          Enterprise Runtime · v1.0
        </p>
      </div>
    </div>
  );
}
