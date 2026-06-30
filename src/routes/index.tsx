import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Sparkles, Shield, Bot, Radar, BarChart3, Moon, Play, Command, LayoutGrid } from "lucide-react";
import { ExecutiveHeroStage } from "@/components/executive/ExecutiveHeroStage";
import { MissionControlStrip } from "@/components/executive/MissionControlStrip";
import { AgentRing } from "@/components/executive/AgentRing";
import { CinematicBoot } from "@/components/executive/CinematicBoot";
import { ExecutiveCinema } from "@/components/executive/ExecutiveCinema";
import { CommandPalette } from "@/components/executive/CommandPalette";
import { LiveSystemShowcase } from "@/components/executive/LiveSystemShowcase";
import { HajjExecutiveStage } from "@/components/executive/HajjExecutiveStage";
import { AriaWelcomeCurtain } from "@/components/cinematic/AriaWelcomeCurtain";
import { MiniAriaHeroBadge } from "@/components/executive/MiniAriaHeroBadge";
import { DepartmentsLauncher } from "@/components/executive/DepartmentsLauncher";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXUS AI OS — Enterprise Industrial Security Operating System" },
      { name: "description", content: "AI-native operating system for industrial security, executive command, and Hajj operations. Powered by ARIA." },
      { property: "og:title", content: "NEXUS AI OS — Enterprise Industrial Security Operating System" },
      { property: "og:description", content: "Bilingual executive AI platform unifying security operations, digital twin, and real-time intelligence." },
    ],
  }),
  component: IntroLanding,
});

const PILLARS = [
  { icon: Shield,    title_ar: "أمن صناعي",       title_en: "Industrial Security", desc_ar: "حوادث، دوريات، تصاريح، زوار ومركبات في منصة موحّدة." },
  { icon: Bot,       title_ar: "وكلاء ذكاء",       title_en: "AI Agents",           desc_ar: "14+ وكيل تنفيذي مع تنسيق أدوات وسجل شرعي للأحداث." },
  { icon: Radar,     title_ar: "توأم رقمي حي",   title_en: "Live Digital Twin",   desc_ar: "تحديث لحظي للأصول والمواقع والعمليات عبر نبض المؤسسة." },
  { icon: BarChart3, title_ar: "تقارير تنفيذية",  title_en: "Executive Reports",   desc_ar: "مؤشرات أداء، RAG وذاكرة إنتاجية مع تسليم Outlook." },
  { icon: Moon,      title_ar: "نظام الحج",        title_en: "Hajj Operations",     desc_ar: "وحدة مشاعر 1447 لإدارة العمليات الميدانية في الموسم." },
  { icon: Sparkles,  title_ar: "ARIA التنفيذية",  title_en: "ARIA Engine",         desc_ar: "محرك GPT-5 ثنائي اللغة مع صوت طبيعي وذاكرة حية." },
] as const;

function IntroLanding() {
  const navigate = useNavigate();
  const [bootDone, setBootDone] = useState(false);
  const [cinemaOpen, setCinemaOpen] = useState(false);
  const [deptsOpen, setDeptsOpen] = useState(false);
  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden bg-black text-white">
      <AriaWelcomeCurtain />
      <CinematicBoot onComplete={() => setBootDone(true)} />
      <CommandPalette onOpenCinema={() => setCinemaOpen(true)} />
      <ExecutiveCinema open={cinemaOpen} onClose={() => setCinemaOpen(false)} />
      <DepartmentsLauncher open={deptsOpen} onClose={() => setDeptsOpen(false)} />

      <ExecutiveHeroStage onEnterOps={() => navigate({ to: "/runtime-hub" })} />

      {/* Mini ARIA presence inside the hero */}
      <div className={`px-4 transition-opacity duration-700 ${bootDone ? "opacity-100" : "opacity-0"}`}>
        <MiniAriaHeroBadge />
      </div>

      {/* Executive toolbar */}
      <div className={`relative z-20 mx-auto mt-4 flex w-full max-w-6xl items-center justify-center gap-2 px-4 sm:gap-3 sm:px-6 transition-opacity duration-700 ${bootDone ? "opacity-100" : "opacity-0"}`}>
        <button
          type="button"
          onClick={() => setCinemaOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_24px_rgba(58,232,255,0.35)] transition hover:-translate-y-0.5 hover:bg-[#3AE8FF]/20 sm:text-sm"
        >
          <Play className="h-4 w-4" />
          <span>التجربة التنفيذية · Executive Experience</span>
        </button>
        <button
          type="button"
          onClick={() => setDeptsOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/40 bg-[#00D4FF]/[0.06] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(0,212,255,0.25)] transition hover:-translate-y-0.5 hover:bg-[#00D4FF]/15 sm:text-sm"
        >
          <LayoutGrid className="h-4 w-4" />
          <span>نوافذ الإدارات</span>
        <kbd className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[10px] text-white/60 sm:inline-flex">
          <Command className="h-3 w-3" /> K
        </kbd>
      </div>

      {/* Live system showcase — embed of the full platform */}
      <LiveSystemShowcase />

      {/* منصة إنجاز الأعمال التنفيذية — Hajj + integrations */}
      <HajjExecutiveStage />

      <div className="relative z-10 mx-auto mt-6 w-full max-w-6xl px-4 sm:mt-10 sm:px-6">
        <MissionControlStrip />
      </div>

      <AgentRing />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">

        {/* Pillars */}
        <section className="mt-6 sm:mt-16">
          <div className="mb-5 text-center sm:mb-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#3AE8FF]/70 sm:text-[11px] sm:tracking-[0.3em]">Capabilities</div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">مكوّنات النظام</h2>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <li
                  key={p.title_en}
                  className="group rounded-2xl border border-[#00D4FF]/25 bg-[#00D4FF]/[0.05] p-4 shadow-[0_0_24px_rgba(0,212,255,0.15)] transition hover:border-[#3AE8FF]/60 hover:bg-[#3AE8FF]/[0.08] hover:shadow-[0_0_40px_rgba(58,232,255,0.35)] sm:p-5"
                >
                  <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00D4FF]/20 text-[#3AE8FF] shadow-[0_0_18px_rgba(0,212,255,0.5)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 text-right">
                      <div className="truncate text-sm font-semibold">{p.title_ar}</div>
                      <div className="truncate text-[10px] uppercase tracking-[0.2em] text-white/40">{p.title_en}</div>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/65">{p.desc_ar}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Footer CTA */}
        <section className="mt-10 rounded-2xl border border-[#00D4FF]/30 bg-gradient-to-br from-[#00D4FF]/10 to-transparent p-6 text-center shadow-[0_0_40px_rgba(0,212,255,0.2)] sm:mt-16 sm:p-8">
          <h3 className="text-lg font-semibold sm:text-xl">جاهز للدخول إلى مركز القيادة؟</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/65">
            ادخل إلى Runtime Hub لرؤية جميع مراحل النظام مباشرة، مع وميض حي وروابط فعّالة لكل وحدة.
          </p>
          <div className="mt-5">
            <Link
              to="/runtime-hub"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#3AE8FF]/60 bg-[#3AE8FF]/10 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(58,232,255,0.4)] transition hover:bg-[#3AE8FF]/20 sm:w-auto"
            >
              <span>دخول النظام</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.25em] text-white/30 sm:mt-10 sm:text-[11px] sm:tracking-[0.3em]">
          NEXUS AI OS · v1.0 GA
        </p>
      </div>
    </div>
  );
}
