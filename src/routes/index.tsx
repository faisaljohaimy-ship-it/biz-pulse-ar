import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Shield,
  Bot,
  Radar,
  BarChart3,
  CheckCircle2,
  Moon,
  Menu,
} from "lucide-react";
import { MissionControlStrip } from "@/components/executive/MissionControlStrip";
import { AgentRing } from "@/components/executive/AgentRing";
import { ExecutiveCinema } from "@/components/executive/ExecutiveCinema";
import { CommandPalette } from "@/components/executive/CommandPalette";
import { AgentHierarchyGraph } from "@/components/executive/AgentHierarchyGraph";
import { AgenticFlowCanvas } from "@/components/home/AgenticFlowCanvas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { NexiosFootermark } from "@/components/cinematic/NexiosFootermark";

import { DepartmentsLauncher } from "@/components/executive/DepartmentsLauncher";
import { SecCommandLiveCard } from "@/components/executive/SecCommandLiveCard";
import { SovereignCommandDeck } from "@/components/os/SovereignCommandDeck";
import { DashboardPreviewRail } from "@/components/os/DashboardPreviewRail";
import { FinnTodayRecommendations } from "@/components/aria/FinnTodayRecommendations";
import { FinnAnomalyStrip } from "@/components/aria/FinnAnomalyStrip";
import { FinnDailySummary } from "@/components/aria/FinnDailySummary";
import { SystemModulesDashboard } from "@/components/executive/SystemModulesDashboard";
import { ExecutiveShowcaseHub } from "@/components/executive/ExecutiveShowcaseHub";
import { OsDecisionQueue } from "@/components/os/OsDecisionQueue";
import { useI18n } from "@/lib/i18n";
import { useFreezeOffscreen } from "@/hooks/use-freeze-offscreen";
import { HomeVideoBackdrop } from "@/components/home/HomeVideoBackdrop";
import { NexiosWordmark } from "@/components/executive/NexiosWordmark";
import { HomeShowcaseSections } from "@/components/home/HomeShowcaseSections";
import { FourRegionHub } from "@/components/home/FourRegionHub";
// Pre-hero intros retired — the homepage renders directly with no cinematic
// welcome overlay. Auto-greeting voice removed per directive.

// Static holographic-tree fleet mirrors the Agent Operations Platform view.
const HOME_HOLO_AGENTS = [
  { id: "commander-1", name: "قائد", state: "queued" },
  { id: "analyst", name: "محلل", state: "ready" },
  { id: "auditor", name: "مدقّق", state: "ready" },
  { id: "intel-1", name: "ذكاء", state: "ready" },
  { id: "commander-2", name: "قائد", state: "queued" },
  { id: "monshi", name: "منشئ", state: "ready" },
  { id: "intel-2", name: "ذكاء", state: "ready" },
  { id: "messenger", name: "المراسل", state: "ready" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXIOS AI  -  FINN" },
      {
        name: "description",
        content:
          "NEXIOS AI OS — منصة القيادة التنفيذية بشبكة الذكاء العصبي السريعة FINN: قرارات فورية، أرقام حية، وتحكّم موحّد لكل القطاعات.",
      },
      {
        property: "og:title",
        content: "NEXIOS AI  -  FINN",
      },
      {
        property: "og:description",
        content:
          "منصة القيادة التنفيذية NEXIOS AI مع FINN — شبكة الذكاء العصبي السريعة: رؤية حية، تحليل فوري، وقرار موثوق للقادة.",
      },
      { property: "og:url", content: "https://neexios.com/" },
      {
        name: "twitter:title",
        content: "NEXIOS AI  -  FINN",
      },
      {
        name: "twitter:description",
        content:
          "منصة القيادة التنفيذية NEXIOS AI مع FINN — شبكة الذكاء العصبي السريعة: رؤية حية، تحليل فوري، وقرار موثوق للقادة.",
      },
    ],
    links: [{ rel: "canonical", href: "https://neexios.com/" }],
  }),
  component: IntroLanding,
});

const PILLARS = [
  {
    anchor: "tour-pillar-security",
    to: "/sec",
    icon: Shield,
    title_ar: "أمن صناعي",
    title_en: "Industrial Security",
    desc_ar: "حوادث، دوريات، تصاريح، زوار ومركبات في منصة موحّدة.",
    desc_en: "Incidents, patrols, permits, visitors, and vehicles on a unified surface.",
  },
  {
    anchor: "tour-pillar-agents",
    to: "/agents",
    icon: Bot,
    title_ar: "وكلاء ذكاء",
    title_en: "AI Agents",
    desc_ar: "11 وكيلاً تنفيذياً مع تنسيق أدوات وسجل شرعي للأحداث.",
    desc_en: "11 executive agents with tool orchestration and an immutable event ledger.",
  },
  {
    anchor: "tour-pillar-twin",
    to: "/digital-twin",
    icon: Radar,
    title_ar: "توأم رقمي حي",
    title_en: "Live Digital Twin",
    desc_ar: "تحديث لحظي للأصول والمواقع والعمليات عبر نبض المؤسسة.",
    desc_en: "Real-time pulse of assets, sites, and operations across the enterprise.",
  },
  {
    anchor: "tour-pillar-reports",
    to: "/executive-reports",
    icon: BarChart3,
    title_ar: "تقارير تنفيذية",
    title_en: "Executive Reports",
    desc_ar: "مؤشرات أداء، RAG وذاكرة إنتاجية مع تسليم Outlook.",
    desc_en: "Production-grade KPIs, RAG memory, and Outlook delivery.",
  },

  {
    anchor: "tour-pillar-aria",
    to: "/finn",
    icon: Sparkles,
    title_ar: "FINN التنفيذية",
    title_en: "FINN Engine",
    desc_ar: "محرك تنفيذي ثنائي اللغة مع صوت طبيعي وذاكرة حية.",
    desc_en: "Bilingual executive engine with natural voice and live executive memory.",
  },
] as const;

function IntroLanding() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  // The single global FINN backdrop is rendered from __root.tsx; this
  // route only owns the executive hero content. No canvas, no boot
  // animation, no AudioContext.
  const [cinemaOpen, setCinemaOpen] = useState(false);

  const [deptsOpen, setDeptsOpen] = useState(false);

  // Freeze each heavy animated section's motion while it is scrolled off-screen
  // (guards against the cumulative-animation load that crashed iOS Safari).
  const posterRef = useFreezeOffscreen<HTMLDivElement>();
  const deckRef = useFreezeOffscreen<HTMLElement>();
  const modulesRef = useFreezeOffscreen<HTMLDivElement>();
  const hologramRef = useFreezeOffscreen<HTMLElement>();
  const agentsRef = useFreezeOffscreen<HTMLDivElement>();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }, []);

  const t = {
    cta_experience: ar ? "التجربة التنفيذية" : "Executive Experience",
    cta_depts: ar ? "القائمة · الإدارات" : "Menu · Departments",
    capabilities: ar ? "مكوّنات النظام" : "Platform Capabilities",
    cta_title: ar ? "جاهز للدخول إلى مركز القيادة؟" : "Ready to enter the Command Center?",
    cta_body: ar
      ? "الدخول مفتوح دائماً — كل الصفحات متاحة بلا بريد ولا رمز سري."
      : "Access is always open — every page is available without email or password.",
    cta_enter: ar ? "مشاهدة العرض التنفيذي" : "View the executive presentation",
    cta_accept: ar ? "الدخول إلى النظام" : "Enter the system",
  };

  const Arrow = ar ? ArrowLeft : ArrowRight;

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="relative min-h-screen overflow-x-hidden bg-transparent text-white"
    >
      {/* Beta marquee is mounted globally in __root.tsx. */}

      {/* Pre-hero intros retired — no cinematic welcome overlay. */}

      {/* Homepage video backdrop — plays with sound once per system session,
          silent on every subsequent mount (including returns from inner
          windows). Replaces the retired FinnGlobalBackdrop. */}
      <HomeVideoBackdrop />

      {/* Lightweight gradient hero glow layered above her, still behind content. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(80%_55%_at_50%_0%,rgba(0,212,255,0.18),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_35%,rgba(58,232,255,0.10),transparent_65%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#04070F] to-transparent" />
      </div>

      <CommandPalette onOpenCinema={() => setCinemaOpen(true)} />
      <ExecutiveCinema open={cinemaOpen} onClose={() => setCinemaOpen(false)} />
      <DepartmentsLauncher open={deptsOpen} onClose={() => setDeptsOpen(false)} />

      {/* ══ Executive Hero — HIDDEN per owner directive (see
          src/config/hidden-ui.ts → "home-hero"). Kept intentionally empty
          so the dashboard renders immediately at the top of the route. ══ */}

      {/* ══ NEXIOS Four-Region Executive Hub — the PRIMARY dashboard: all four
          regions around a central interactive Saudi map, live per-region KPIs
          and alerts from Supabase (resilient), system status, and the FINN
          assistant persona. Live data, not a static poster. ══ */}
      <div ref={posterRef} data-nx-frozen="false" className="relative z-10 mt-2 sm:mt-4">
        <FourRegionHub />
      </div>

      {/* ══ Sovereign Cinematic Command Deck — world-class executive dashboard ══
          Floats over the FINN hologram as translucent glass instruments so
          she remains visible as the living backdrop of the whole system. */}
      <section
        ref={deckRef}
        data-nx-frozen="false"
        id="hero-dashboard"
        aria-label={ar ? "لوحة القيادة السيادية الحية" : "Sovereign live command deck"}
        className="relative z-10 mx-auto flex w-full max-w-none flex-col gap-6 px-4 pb-6 pt-4 sm:gap-8 sm:px-6 sm:pt-8"
      >
        {/* FinnDailySummary moved into FourRegionHub left column. */}
        <SovereignCommandDeck ar={ar} />
        <DashboardPreviewRail ar={ar} />
        <FinnAnomalyStrip />
        <FinnTodayRecommendations />
        <OsDecisionQueue ar={ar} />
      </section>

      {/* ══ Executive Showcase hub — premium entry to the Command Bridge and
          the Executive Presentation. ══ */}
      <ExecutiveShowcaseHub />

      {/* Horizontal system-modules dashboard — every icon links to a real
          module route (activated), responsive across all devices. */}
      <div ref={modulesRef} data-nx-frozen="false" className="mt-4 sm:mt-6">
        <SystemModulesDashboard />
      </div>

      {/* Executive pitch band — capabilities, value-props, tech stack and the
          vision, every pulsing icon breathing in the active region's colour. */}
      <HomeShowcaseSections />

      {/* Holographic command tree — HIDDEN per owner directive (2026-07-26). */}


      <div
        id="tour-positioning"
        className="relative z-10 mx-auto mt-6 w-full max-w-none px-4 sm:mt-10 sm:px-6"
      >
        <MissionControlStrip />
      </div>

      <div ref={agentsRef} data-nx-frozen="false" id="tour-agents">
        <AgentRing />
      </div>

      {/* ══ نهاية الصفحة — البطاقتان الهولوغراميتان مكدّستان تحت بعضهما ══
          الأولى: شجرة القيادة الهولوغرامية (FINN فوق فريق الوكلاء فوق بوابة
          الاعتماد البشري). الثانية: NEXIOS · Agentic Flow Canvas (شبكة
          التنسيق الحية بنمط n8n). كلاهما بعرض كامل مسؤول. */}
      <div className="relative z-10 mx-auto mt-6 flex w-full max-w-none flex-col gap-6 px-4 sm:mt-10 sm:gap-8 sm:px-6">
        <AgentHierarchyGraph
          agents={HOME_HOLO_AGENTS.map((a) => ({
            id: a.id,
            name: a.name,
            state: a.state,
          }))}
          runs={[]}
          ar={ar}
        />

        <AgenticFlowCanvas ar={ar} variant="full" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-none px-4 py-10 sm:px-6 sm:py-16">

        {/* Capabilities section — HIDDEN per owner directive (2026-07-26). */}


        <section
          id="tour-closing"
          className="mt-10 rounded-2xl border border-[#00D4FF]/30 bg-gradient-to-br from-[#00D4FF]/10 to-transparent p-6 text-center shadow-[0_0_40px_rgba(0,212,255,0.2)] sm:mt-16 sm:p-8"
        >
          <h3 className="text-lg font-semibold sm:text-xl">{t.cta_title}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/65">{t.cta_body}</p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              to="/executive-showcase"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#3AE8FF]/60 bg-[#3AE8FF]/10 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(58,232,255,0.4)] transition hover:bg-[#3AE8FF]/20 sm:w-auto"
            >
              <span>{t.cta_enter}</span>
              <Arrow className="h-4 w-4" />
            </Link>
            <Link
              to="/finn"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-300 px-6 py-3 text-sm font-black text-[#03131f] shadow-[0_12px_36px_-18px_rgba(52,211,153,.9)] transition hover:brightness-110 sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{t.cta_accept}</span>
            </Link>
          </div>
          <p
            id="tour-compliance"
            className="mx-auto mt-4 max-w-xl text-[10px] uppercase tracking-[0.24em] text-[#3AE8FF]/70 sm:text-[11px]"
          >
            {ar
              ? "متوائم مع NEXIOS AI · التحول الرقمي والريادة الصناعية · نظام حماية البيانات الشخصية"
              : "Aligned with NEXIOS AI · Digital transformation · KSA Personal Data Protection Law"}
          </p>
        </section>

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.25em] text-white/30 sm:mt-10 sm:text-[11px] sm:tracking-[0.3em]">
          {ar ? "NEXIOS AI OS · نسخة تنفيذية" : "NEXIOS AI OS · Executive Preview"}
        </p>
      </div>

      {/* Grand closing wordmark */}
      <NexiosFootermark caption={ar ? "منصة الذكاء التنفيذي" : "Enterprise AI Operating System"} />
    </div>
  );
}
