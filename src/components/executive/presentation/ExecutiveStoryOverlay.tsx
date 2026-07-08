// Executive Story Overlay — the 8-section scene card. Phase 5.
// Renders synchronized with ARIA narration for the active demo step.
import * as React from "react";
import type { DemoScene } from "@/lib/demo/scenes";
import { sceneForStep } from "@/lib/demo/scenes";
import { useDemoMode } from "@/lib/demo/demo-controller";
import { useI18n } from "@/lib/i18n";
import {
  ScrollText,
  Search,
  BrainCircuit,
  GitBranch,
  LineChart,
  Rocket,
  ShieldCheck,
} from "lucide-react";

export function ExecutiveStoryOverlay() {
  const demo = useDemoMode();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const scene: DemoScene | null = React.useMemo(() => sceneForStep(demo.step), [demo.step]);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    setVisible(true);
  }, [scene?.stepId]);

  if (!demo.isActive || !scene) return null;

  const t = (a: string, e: string) => (ar ? a : e);
  const sections: Array<{ icon: React.ReactNode; label: string; body: string; tone?: string }> = [
    {
      icon: <ScrollText className="h-3.5 w-3.5" />,
      label: t("الرسالة التنفيذية", "Executive Message"),
      body: ar ? scene.executiveMessage_ar : scene.executiveMessage_en,
    },
    {
      icon: <Search className="h-3.5 w-3.5" />,
      label: t("الأدلة", "Evidence"),
      body: ar ? scene.evidence_ar : scene.evidence_en,
    },
    {
      icon: <BrainCircuit className="h-3.5 w-3.5" />,
      label: t("المنطق", "Reasoning"),
      body: ar ? scene.reasoning_ar : scene.reasoning_en,
    },
    {
      icon: <GitBranch className="h-3.5 w-3.5" />,
      label: t("القرار", "Decision"),
      body: ar ? scene.decision_ar : scene.decision_en,
      tone: "text-[#3AE8FF]",
    },
    {
      icon: <LineChart className="h-3.5 w-3.5" />,
      label: t("الأثر الأعمالي", "Business Impact"),
      body: ar ? scene.businessImpact_ar : scene.businessImpact_en,
    },
    {
      icon: <Rocket className="h-3.5 w-3.5" />,
      label: t("الخطوة التالية", "Next Action"),
      body: ar ? scene.nextAction_ar : scene.nextAction_en,
    },
  ];

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className={`pointer-events-none fixed start-3 top-[86px] z-[91] w-[min(380px,calc(100vw-1.5rem))] transition-all duration-500 sm:start-4 ${visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
    >
      <div className="pointer-events-auto rounded-2xl border border-[#3AE8FF]/40 bg-[#061A2E]/90 p-3 shadow-[0_0_50px_rgba(0,212,255,0.25)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.28em] text-[#3AE8FF]/80">
            {t("مشهد", "Scene")}
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/60 hover:bg-white/10"
          >
            {t("إخفاء", "Hide")}
          </button>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#3AE8FF]" />
          <div className="truncate text-sm font-semibold text-white">
            {ar ? scene.title_ar : scene.title_en}
          </div>
          <span className="ms-auto rounded-full border border-[#3AE8FF]/30 px-2 py-0.5 text-[10px] text-[#3AE8FF]/80">
            {t("ثقة", "Conf")} {Math.round(scene.confidence * 100)}%
          </span>
        </div>

        <div className="mt-3 grid max-h-[52vh] gap-2 overflow-y-auto pe-1">
          {sections.map((s, i) => (
            <div
              key={s.label}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-2 transition-colors hover:bg-white/[0.06]"
              style={{
                animation: `nx-scene-in 420ms ease-out both`,
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#3AE8FF]/70">
                <span className="text-[#3AE8FF]">{s.icon}</span>
                {s.label}
              </div>
              <div className={`mt-1 text-xs leading-relaxed text-white/85 ${s.tone ?? ""}`}>
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes nx-scene-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
