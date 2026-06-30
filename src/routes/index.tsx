import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck, Building2, Radar, Activity, BarChart3, Bot, Radio,
  Sparkles, Moon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: RuntimeHub,
});

const STAGES = [
  { key: "auth",     label_ar: "المصادقة",         label_en: "Authentication", icon: ShieldCheck, to: "/command-center" },
  { key: "org",      label_ar: "بيانات المؤسسة",  label_en: "Organization",   icon: Building2,   to: "/command-center" },
  { key: "twin",     label_ar: "التوأم الرقمي",   label_en: "Digital Twin",   icon: Radar,       to: "/operations" },
  { key: "ops",      label_ar: "العمليات",         label_en: "Operations",     icon: Activity,    to: "/operations" },
  { key: "kpi",      label_ar: "مؤشرات الأداء",   label_en: "Executive KPIs", icon: BarChart3,   to: "/executive-reports" },
  { key: "agents",   label_ar: "الوكلاء",          label_en: "Agents",         icon: Bot,         to: "/exec" },
  { key: "realtime", label_ar: "البث اللحظي",     label_en: "Realtime",       icon: Radio,       to: "/operations" },
  { key: "aria",     label_ar: "ARIA",              label_en: "ARIA Runtime",   icon: Sparkles,    to: "/command-center" },
] as const;

function RuntimeHub() {
  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#061A2E] text-white"
    >
      {/* Ambient grid */}
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(0,212,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#00D4FF]/10 blur-[120px] animate-pulse" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#3AE8FF]/10 blur-[120px] animate-pulse" />

      <div className="relative z-10 w-full max-w-xl px-6 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00D4FF]/40 bg-[#00D4FF]/10 shadow-[0_0_40px_rgba(0,212,255,0.45)] animate-pulse">
            <Sparkles className="h-7 w-7 text-[#3AE8FF]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            نظام التشغيل المؤسسي
          </h1>
          <p className="mt-1 text-sm text-white/60">
            NEXUS AI OS — Industrial Security, Western Region
          </p>
        </div>

        {/* Central Hajj icon */}
        <div className="mb-6 flex justify-center">
          <Link
            to="/hajj"
            className="group relative flex flex-col items-center gap-2"
            aria-label="نظام الحج — مشاعر 1447"
          >
            <span className="absolute inset-0 -m-6 rounded-full bg-[#3AE8FF]/20 blur-2xl transition group-hover:bg-[#3AE8FF]/40" />
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#3AE8FF]/60 bg-gradient-to-br from-[#00D4FF]/25 to-[#3AE8FF]/10 shadow-[0_0_60px_rgba(58,232,255,0.55)] transition group-hover:scale-105 group-hover:shadow-[0_0_80px_rgba(58,232,255,0.8)]">
              <span className="absolute inset-0 rounded-full border border-[#3AE8FF]/40 animate-ping" />
              <Moon className="h-9 w-9 text-[#3AE8FF] drop-shadow-[0_0_12px_rgba(58,232,255,0.9)]" />
            </span>
            <div className="relative text-center">
              <div className="text-sm font-semibold text-white">نظام الحج — مشاعر 1447</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#3AE8FF]/80">Hajj Command Center</div>
            </div>
          </Link>
        </div>

        <ol className="space-y-2">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const delay = `${i * 120}ms`;
            return (
              <li key={stage.key}>
                <Link
                  to={stage.to}
                  style={{ animationDelay: delay }}
                  className="flex items-center justify-between rounded-xl border border-[#00D4FF]/30 bg-[#00D4FF]/[0.06] px-4 py-3 shadow-[0_0_24px_rgba(0,212,255,0.18)] transition hover:border-[#3AE8FF]/70 hover:bg-[#3AE8FF]/10 hover:shadow-[0_0_36px_rgba(58,232,255,0.4)]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      style={{ animationDelay: delay }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00D4FF]/20 text-[#3AE8FF] shadow-[0_0_18px_rgba(0,212,255,0.5)] animate-pulse"
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-medium">{stage.label_ar}</div>
                      <div className="text-[11px] uppercase tracking-wider text-white/40">{stage.label_en}</div>
                    </div>
                  </div>
                  <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[#3AE8FF]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3AE8FF] shadow-[0_0_10px_#3AE8FF] animate-pulse" />
                    Ready
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 text-center text-[11px] uppercase tracking-[0.3em] text-white/30">
          Enterprise Runtime · v1.0
        </p>
      </div>
    </div>
  );
}
