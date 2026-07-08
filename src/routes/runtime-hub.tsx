import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Building2,
  Radar,
  Activity,
  BarChart3,
  Bot,
  Radio,
  Sparkles,
  Moon,
} from "lucide-react";

export const Route = createFileRoute("/runtime-hub")({
  head: () => ({
    meta: [
      { title: "Runtime Hub — NEXUS AI OS" },
      {
        name: "description",
        content: "Enterprise runtime stages and live modules of NEXUS AI OS.",
      },
    ],
  }),
  component: RuntimeHub,
});

// 9-cell grid; Hajj sits in the middle (index 4) — horizontally centered, not stacked above.
const STAGES = [
  {
    key: "auth",
    label_ar: "المصادقة",
    label_en: "Authentication",
    icon: ShieldCheck,
    to: "/command-center",
  },
  {
    key: "org",
    label_ar: "بيانات المؤسسة",
    label_en: "Organization",
    icon: Building2,
    to: "/command-center",
  },
  {
    key: "twin",
    label_ar: "التوأم الرقمي",
    label_en: "Digital Twin",
    icon: Radar,
    to: "/operations",
  },
  { key: "ops", label_ar: "العمليات", label_en: "Operations", icon: Activity, to: "/operations" },
  {
    key: "hajj",
    label_ar: "نظام الحج",
    label_en: "Hajj 1447",
    icon: Moon,
    to: "/hajj",
    featured: true,
  },
  {
    key: "kpi",
    label_ar: "مؤشرات الأداء",
    label_en: "Executive KPIs",
    icon: BarChart3,
    to: "/executive-reports",
  },
  { key: "agents", label_ar: "الوكلاء", label_en: "Agents", icon: Bot, to: "/exec" },
  {
    key: "realtime",
    label_ar: "البث اللحظي",
    label_en: "Realtime",
    icon: Radio,
    to: "/operations",
  },
  {
    key: "aria",
    label_ar: "ARIA",
    label_en: "ARIA Runtime",
    icon: Sparkles,
    to: "/command-center",
  },
] as const;

function RuntimeHub() {
  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#061A2E] text-white"
    >
      {/* Ambient grid + pulsing glow halos */}
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(0,212,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#00D4FF]/10 blur-[120px] animate-pulse" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#3AE8FF]/10 blur-[120px] animate-pulse" />

      <div className="relative z-10 w-full max-w-4xl px-6 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00D4FF]/40 bg-[#00D4FF]/10 shadow-[0_0_40px_rgba(0,212,255,0.45)] animate-pulse">
            <Sparkles className="h-7 w-7 text-[#3AE8FF]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">نظام التشغيل المؤسسي</h1>
          <p className="mt-1 text-sm text-white/60">
            NEXUS AI OS — Industrial Security, Western Region
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const delay = `${i * 100}ms`;
            const featured = "featured" in stage && stage.featured;
            return (
              <li key={stage.key}>
                <Link
                  to={stage.to}
                  style={{ animationDelay: delay }}
                  className={
                    featured
                      ? "group relative flex h-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-[#3AE8FF]/60 bg-gradient-to-br from-[#00D4FF]/20 to-[#3AE8FF]/10 px-4 py-6 text-center shadow-[0_0_50px_rgba(58,232,255,0.55)] transition hover:scale-[1.02] hover:shadow-[0_0_80px_rgba(58,232,255,0.8)]"
                      : "flex h-full items-center justify-between rounded-xl border border-[#00D4FF]/30 bg-[#00D4FF]/[0.06] px-4 py-3 shadow-[0_0_24px_rgba(0,212,255,0.18)] transition hover:border-[#3AE8FF]/70 hover:bg-[#3AE8FF]/10 hover:shadow-[0_0_36px_rgba(58,232,255,0.4)]"
                  }
                >
                  {featured ? (
                    <>
                      <span className="pointer-events-none absolute inset-0 rounded-2xl border border-[#3AE8FF]/40 animate-ping" />
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#3AE8FF]/15 shadow-[0_0_30px_rgba(58,232,255,0.7)]">
                        <Icon className="h-7 w-7 text-[#3AE8FF] drop-shadow-[0_0_12px_rgba(58,232,255,0.9)]" />
                      </span>
                      <div className="relative">
                        <div className="text-sm font-semibold">{stage.label_ar}</div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-[#3AE8FF]/80">
                          {stage.label_en}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span
                          style={{ animationDelay: delay }}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00D4FF]/20 text-[#3AE8FF] shadow-[0_0_18px_rgba(0,212,255,0.5)] animate-pulse"
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
                      <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[#3AE8FF]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3AE8FF] shadow-[0_0_10px_#3AE8FF] animate-pulse" />
                        Ready
                      </span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-center text-[11px] uppercase tracking-[0.3em] text-white/30">
          Enterprise Runtime · v1.0
        </p>
      </div>
    </div>
  );
}
