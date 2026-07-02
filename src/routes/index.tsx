import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Shield, Bot, Radar, BarChart3, Moon, Play, Command, LayoutGrid } from "lucide-react";
import { ExecutiveHeroStage } from "@/components/executive/ExecutiveHeroStage";
import { MissionControlStrip } from "@/components/executive/MissionControlStrip";
import { AgentRing } from "@/components/executive/AgentRing";
import { CinematicBoot } from "@/components/executive/CinematicBoot";
import { ExecutiveCinema } from "@/components/executive/ExecutiveCinema";
import { CommandPalette } from "@/components/executive/CommandPalette";
import { LiveSystemShowcase } from "@/components/executive/LiveSystemShowcase";
import { HajjExecutiveStage } from "@/components/executive/HajjExecutiveStage";
import { AriaWelcomeCurtain } from "@/components/cinematic/AriaWelcomeCurtain";
import { AriaCinematicIntro } from "@/components/cinematic/AriaCinematicIntro";
import { MiniAriaHeroBadge } from "@/components/executive/MiniAriaHeroBadge";
import { DepartmentsLauncher } from "@/components/executive/DepartmentsLauncher";
import { useI18n } from "@/lib/i18n";
import { DemoModeLauncher } from "@/components/executive/DemoModeLauncher";
import { BUILD_ID } from "@/lib/build-id";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXIOS AI OS — Enterprise Industrial Security Operating System" },
      { name: "description", content: "AI-native operating system for industrial security, executive command, and Hajj operations. Powered by ARIA." },
      { property: "og:title", content: "NEXIOS AI OS — Enterprise Industrial Security Operating System" },
      { property: "og:description", content: "Bilingual executive AI platform unifying security operations, digital twin, and real-time intelligence." },
    ],
  }),
  component: IntroLanding,
});

const PILLARS = [
  { icon: Shield,    title_ar: "أمن صناعي",         title_en: "Industrial Security", desc_ar: "حوادث، دوريات، تصاريح، زوار ومركبات في منصة موحّدة.", desc_en: "Incidents, patrols, permits, visitors, and vehicles on a unified surface." },
  { icon: Bot,       title_ar: "وكلاء ذكاء",        title_en: "AI Agents",           desc_ar: "14+ وكيل تنفيذي مع تنسيق أدوات وسجل شرعي للأحداث.",     desc_en: "14+ executive agents with tool orchestration and an immutable event ledger." },
  { icon: Radar,     title_ar: "توأم رقمي حي",     title_en: "Live Digital Twin",   desc_ar: "تحديث لحظي للأصول والمواقع والعمليات عبر نبض المؤسسة.", desc_en: "Real-time pulse of assets, sites, and operations across the enterprise." },
  { icon: BarChart3, title_ar: "تقارير تنفيذية",    title_en: "Executive Reports",   desc_ar: "مؤشرات أداء، RAG وذاكرة إنتاجية مع تسليم Outlook.",    desc_en: "Production-grade KPIs, RAG memory, and Outlook delivery." },
  { icon: Moon,      title_ar: "نظام الحج",          title_en: "Hajj Operations",     desc_ar: "وحدة مشاعر 1447 لإدارة العمليات الميدانية في الموسم.",  desc_en: "Mashaer 1447 module for field operations during the Hajj season." },
  { icon: Sparkles,  title_ar: "ARIA التنفيذية",    title_en: "ARIA Engine",         desc_ar: "محرك GPT-5 ثنائي اللغة مع صوت طبيعي وذاكرة حية.",     desc_en: "Bilingual GPT-5 engine with natural voice and live executive memory." },
] as const;

function IntroLanding() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [bootDone, setBootDone] = useState(false);
  const [cinemaOpen, setCinemaOpen] = useState(false);
  const [deptsOpen, setDeptsOpen] = useState(false);

  // Lock dark mode on the executive landing hero — required for delivery.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }, []);

  // Curtain -> Executive Demo bridge (dispatched by AriaWelcomeCurtain).
  useEffect(() => {
    const onPlay = () => setCinemaOpen(true);
    window.addEventListener("nexios:play-demo", onPlay);
    return () => window.removeEventListener("nexios:play-demo", onPlay);
  }, []);

  // Boot beacon — logs the deployed build stamp once.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.info("NEXIOS build", BUILD_ID);
  }, []);


  const t = {
    cta_experience: ar ? "التجربة التنفيذية" : "Executive Experience",
    cta_depts:      ar ? "نوافذ الإدارات" : "Department Windows",
    capabilities:   ar ? "مكوّنات النظام" : "Platform Capabilities",
    cta_title:      ar ? "جاهز للدخول إلى مركز القيادة؟" : "Ready to enter the Command Center?",
    cta_body:       ar
      ? "ادخل إلى Runtime Hub لرؤية جميع مراحل النظام مباشرة، مع وميض حي وروابط فعّالة لكل وحدة."
      : "Open the Runtime Hub to see every stage of the platform live — pulsing modules with active links to each unit.",
    cta_enter:      ar ? "دخول النظام" : "Enter the Platform",
  };

  const Arrow = ar ? ArrowLeft : ArrowRight;

  return (
    <div dir={ar ? "rtl" : "ltr"} className="relative min-h-screen overflow-hidden bg-black text-white">
      <AriaWelcomeCurtain />
      <AriaCinematicIntro />
      <CinematicBoot onComplete={() => setBootDone(true)} />
      <CommandPalette onOpenCinema={() => setCinemaOpen(true)} />
      <ExecutiveCinema open={cinemaOpen} onClose={() => setCinemaOpen(false)} />
      <DepartmentsLauncher open={deptsOpen} onClose={() => setDeptsOpen(false)} />

      <ExecutiveHeroStage onEnterOps={() => navigate({ to: "/os" })} />

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
          <span>{t.cta_experience}</span>
        </button>
        <button
          type="button"
          onClick={() => setDeptsOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/40 bg-[#00D4FF]/[0.06] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(0,212,255,0.25)] transition hover:-translate-y-0.5 hover:bg-[#00D4FF]/15 sm:text-sm"
        >
          <LayoutGrid className="h-4 w-4" />
          <span>{t.cta_depts}</span>
        </button>
        <DemoModeLauncher />
        <kbd className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[10px] text-white/60 sm:inline-flex">
          <Command className="h-3 w-3" /> K
        </kbd>
      </div>

      <LiveSystemShowcase />

      <HajjExecutiveStage />

      <div className="relative z-10 mx-auto mt-6 w-full max-w-6xl px-4 sm:mt-10 sm:px-6">
        <MissionControlStrip />
      </div>

      <AgentRing />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="mt-6 sm:mt-16">
          <div className="mb-5 text-center sm:mb-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#3AE8FF]/70 sm:text-[11px] sm:tracking-[0.3em]">Capabilities</div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{t.capabilities}</h2>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              const title = ar ? p.title_ar : p.title_en;
              const sub = ar ? p.title_en : p.title_ar;
              const desc = ar ? p.desc_ar : p.desc_en;
              return (
                <li
                  key={p.title_en}
                  className="group rounded-2xl border border-[#00D4FF]/25 bg-[#00D4FF]/[0.05] p-4 shadow-[0_0_24px_rgba(0,212,255,0.15)] transition hover:border-[#3AE8FF]/60 hover:bg-[#3AE8FF]/[0.08] hover:shadow-[0_0_40px_rgba(58,232,255,0.35)] sm:p-5"
                >
                  <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00D4FF]/20 text-[#3AE8FF] shadow-[0_0_18px_rgba(0,212,255,0.5)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className={`min-w-0 ${ar ? "text-right" : "text-left"}`}>
                      <div className="truncate text-sm font-semibold">{title}</div>
                      <div className="truncate text-[10px] uppercase tracking-[0.2em] text-white/40">{sub}</div>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/65">{desc}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-10 rounded-2xl border border-[#00D4FF]/30 bg-gradient-to-br from-[#00D4FF]/10 to-transparent p-6 text-center shadow-[0_0_40px_rgba(0,212,255,0.2)] sm:mt-16 sm:p-8">
          <h3 className="text-lg font-semibold sm:text-xl">{t.cta_title}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/65">{t.cta_body}</p>
          <div className="mt-5">
            <Link
              to="/os"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#3AE8FF]/60 bg-[#3AE8FF]/10 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(58,232,255,0.4)] transition hover:bg-[#3AE8FF]/20 sm:w-auto"
            >
              <span>{t.cta_enter}</span>
              <Arrow className="h-4 w-4" />
            </Link>
          </div>
          <p className="mx-auto mt-4 max-w-xl text-[10px] uppercase tracking-[0.24em] text-[#3AE8FF]/70 sm:text-[11px]">
            {ar
              ? "متوائم مع رؤية المملكة 2030 · التحول الرقمي والريادة الصناعية"
              : "Aligned with Saudi Vision 2030 · Digital transformation & industrial leadership"}
          </p>
        </section>

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.25em] text-white/30 sm:mt-10 sm:text-[11px] sm:tracking-[0.3em]">
        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.25em] text-white/30 sm:mt-10 sm:text-[11px] sm:tracking-[0.3em]">
          NEXIOS AI OS · v1.0 GA
          <span className="ms-2 rounded-full border border-white/15 px-2 py-0.5 text-[9px] normal-case tracking-normal text-white/40">
            build {BUILD_ID}
          </span>
        </p>
      </div>
    </div>
  );
}
      </div>
    </div>
  );
}
