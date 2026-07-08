// Executive HUD — Top-right corner. Phase 5.
// Shows Scenario · Timeline position · Confidence · Persona · Department · Mission.
import * as React from "react";
import { useLocation } from "@tanstack/react-router";
import { useDemoMode } from "@/lib/demo/demo-controller";
import { sceneForStep, SCENARIO_LABEL_AR, SCENARIO_LABEL_EN } from "@/lib/demo/scenes";
import { resolvePersona } from "@/lib/aria/personas";
import { useI18n } from "@/lib/i18n";

function departmentFor(pathname: string, ar: boolean): string {
  if (/incidents|operations|risks|patrol/.test(pathname))
    return ar ? "العمليات والسلامة" : "Operations & Safety";
  if (/executive-reports|reports/.test(pathname))
    return ar ? "التقارير التنفيذية" : "Executive Reports";
  if (/employees|hr|workforce/.test(pathname)) return ar ? "الموارد البشرية" : "Workforce";
  if (/hajj/.test(pathname)) return ar ? "منظومة الحج" : "Hajj Command";
  return ar ? "المنظومة التنفيذية" : "Executive OS";
}

export function ExecutiveTopHUD() {
  const demo = useDemoMode();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const location = useLocation();
  const persona = resolvePersona(location.pathname);
  if (!demo.isActive || !demo.step) return null;

  const scene = sceneForStep(demo.step);
  const confidencePct = Math.round((scene?.confidence ?? 0.9) * 100);
  const scenario = ar ? SCENARIO_LABEL_AR : SCENARIO_LABEL_EN;
  const dept = departmentFor(location.pathname, ar);
  const mission = ar ? persona.mission_ar : persona.mission_en;
  const personaLabel = ar ? persona.label_ar : persona.label_en;

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="pointer-events-none fixed end-3 top-[86px] z-[92] w-[min(360px,calc(100vw-1.5rem))] sm:end-4"
    >
      <div className="pointer-events-auto rounded-2xl border border-[#3AE8FF]/40 bg-[#061A2E]/85 p-3 shadow-[0_0_50px_rgba(0,212,255,0.25)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.28em] text-[#3AE8FF]/80">
          <span>{ar ? "سيناريو" : "Scenario"}</span>
          <span className="text-white/50">
            {demo.stepIndex + 1} / {demo.totalSteps}
          </span>
        </div>
        <div className="mt-1 truncate text-sm font-semibold text-white">{scenario}</div>

        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-[#00D4FF] to-[#3AE8FF] transition-[width] duration-700"
            style={{ width: `${Math.round(((demo.stepIndex + 1) / demo.totalSteps) * 100)}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <Cell
            label={ar ? "الثقة" : "Confidence"}
            value={`${confidencePct}%`}
            tone={confidencePct >= 90 ? "ok" : confidencePct >= 75 ? "warn" : "crit"}
          />
          <Cell label={ar ? "الشخصية" : "Persona"} value={personaLabel} />
          <Cell label={ar ? "الإدارة" : "Department"} value={dept} />
        </div>

        <div className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[#3AE8FF]/80">
          <span className="font-semibold text-[#3AE8FF]/60">{ar ? "المهمة: " : "Mission: "}</span>
          {mission}
        </div>
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "crit";
}) {
  const toneCls =
    tone === "crit" ? "text-[#FFB0C7]" : tone === "warn" ? "text-[#FBE29A]" : "text-white";
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-1.5">
      <div className="text-[9px] uppercase tracking-[0.24em] text-white/50">{label}</div>
      <div className={`mt-0.5 truncate text-[11px] font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}
