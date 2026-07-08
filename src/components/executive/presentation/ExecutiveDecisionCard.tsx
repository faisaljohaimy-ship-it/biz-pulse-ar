// Executive Decision Card — Phase 5. Floating recommendation surface.
// Emits demo-only telemetry via a toast; never mutates data.
import * as React from "react";
import { Check, X, Search, UserPlus, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { DemoDecisionOption } from "@/lib/demo/scenes";

interface Payload {
  decisions: DemoDecisionOption[];
  stepId: string;
  sceneTitle_en: string;
  sceneTitle_ar: string;
}

const ICONS: Record<DemoDecisionOption["id"], React.ReactNode> = {
  approve: <Check className="h-3.5 w-3.5" />,
  reject: <X className="h-3.5 w-3.5" />,
  investigate: <Search className="h-3.5 w-3.5" />,
  assign: <UserPlus className="h-3.5 w-3.5" />,
  open_report: <FileText className="h-3.5 w-3.5" />,
};

const TONE: Record<DemoDecisionOption["id"], string> = {
  approve: "border-[#7CFFB8]/50 text-[#B8FFDA] hover:bg-[#7CFFB8]/10",
  reject: "border-[#FF6A9A]/50 text-[#FFB0C7] hover:bg-[#FF6A9A]/10",
  investigate: "border-[#F5C86B]/50 text-[#FBE29A] hover:bg-[#F5C86B]/10",
  assign: "border-[#3AE8FF]/50 text-[#B8F3FF] hover:bg-[#3AE8FF]/10",
  open_report: "border-white/25 text-white hover:bg-white/10",
};

export function ExecutiveDecisionCard() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [payload, setPayload] = React.useState<Payload | null>(null);
  const [dismissed, setDismissed] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onDecision = (e: Event) => {
      const detail = (e as CustomEvent<Payload>).detail;
      if (!detail?.decisions?.length) return;
      setPayload(detail);
    };
    window.addEventListener("nexios:demo-decision", onDecision as EventListener);
    return () => window.removeEventListener("nexios:demo-decision", onDecision as EventListener);
  }, []);

  if (!payload || dismissed === payload.stepId) return null;

  const t = (a: string, e: string) => (ar ? a : e);
  const title = ar ? payload.sceneTitle_ar : payload.sceneTitle_en;

  const onDecide = (d: DemoDecisionOption) => {
    toast.success(t("تم تسجيل قرار العرض التنفيذي", "Executive decision recorded (demo)"), {
      description: `${ar ? d.label_ar : d.label_en} · ${title}`,
      duration: 2600,
    });
    setDismissed(payload.stepId);
  };

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="pointer-events-none fixed bottom-[168px] end-3 z-[93] w-[min(340px,calc(100vw-1.5rem))] sm:end-4"
      style={{ animation: "nx-dec-in 420ms ease-out both" }}
    >
      <div className="pointer-events-auto rounded-2xl border border-[#3AE8FF]/40 bg-[#061A2E]/90 p-3 shadow-[0_0_40px_rgba(0,212,255,0.28)] backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#3AE8FF]/80">
          <Sparkles className="h-3 w-3" />
          {t("قرار تنفيذي مقترح", "Executive Decision")}
        </div>
        <div className="mt-1 truncate text-sm font-semibold text-white">{title}</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {payload.decisions.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onDecide(d)}
              className={`inline-flex items-center gap-1.5 rounded-full border bg-white/5 px-2.5 py-1 text-[11px] font-semibold transition ${TONE[d.id]}`}
            >
              {ICONS[d.id]}
              {ar ? d.label_ar : d.label_en}
            </button>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-white/40">
          {t("عرض توضيحي فقط · لا تأثير على البيانات", "Demo-only · no data mutation")}
        </div>
      </div>
      <style>{`@keyframes nx-dec-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
