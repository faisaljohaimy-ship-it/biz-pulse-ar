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
import { CommandPalette } from "@/components/executive/CommandPalette";
import { ExecutiveCinema } from "@/components/executive/ExecutiveCinema";
import { ExecutiveShowcaseHub } from "@/components/executive/ExecutiveShowcaseHub";
import { FinnAnomalyStrip } from "@/components/finn/FinnAnomalyStrip";
import { FinnTodayRecommendations } from "@/components/finn/FinnTodayRecommendations";
import { OsDecisionQueue } from "@/components/os/OsDecisionQueue";
import { HolographicFlowShowcase } from "@/components/home/HolographicFlowShowcase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DepartmentsLauncher } from "@/components/executive/DepartmentsLauncher";
import { SecCommandLiveCard } from "@/components/executive/SecCommandLiveCard";
import { SovereignCommandDeck } from "@/components/os/SovereignCommandDeck";
import { DashboardPreviewRail } from "@/components/os/DashboardPreviewRail";

import { useI18n } from "@/lib/i18n";
import { useFreezeOffscreen } from "@/hooks/use-freeze-offscreen";
import { HomeVideoBackdrop } from "@/components/home/HomeVideoBackdrop";
import { FourRegionHub } from "@/components/home/FourRegionHub";
import { HomeTopNav } from "@/components/nav/HomeTopNav";
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
      { title: "NEXIOS — نظام القيادة التنفيذي للأمن الصناعي" },
      {
        name: "description",
        content:
          "منصة NEXIOS: مركز قيادة تنفيذي للأمن الصناعي والامتثال مع المساعد الذكي FINN ومؤشرات حيّة للمناطق الأربع.",
      },
      { property: "og:title", content: "NEXIOS — نظام القيادة التنفيذي للأمن الصناعي" },
      {
        property: "og:description",
        content:
          "مركز قيادة تنفيذي للأمن الصناعي والامتثال مع المساعد الذكي FINN ومؤشرات حيّة للمناطق الأربع.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntroLanding,
});

function IntroLanding() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  // The single global FINN backdrop is rendered from __root.tsx; this
  // route only owns the executive hero content. No canvas, no boot
  // animation, no AudioContext.

  const [deptsOpen, setDeptsOpen] = useState(false);

  // Freeze each heavy animated section's motion while it is scrolled off-screen
  // (guards against the cumulative-animation load that crashed iOS Safari).
  const [cinemaOpen, setCinemaOpen] = useState(false);
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

      {/* Notifications + Settings are activated inline in FourRegionHub's
          header (Bell + Settings buttons). No floating utility bar here. */}

      {/* Lightweight gradient hero glow layered above her, still behind content. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(80%_55%_at_50%_0%,rgba(0,212,255,0.18),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_35%,rgba(58,232,255,0.10),transparent_65%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#04070F] to-transparent" />
      </div>

      {/* CommandPalette is mounted globally in AppShell (Ctrl/Cmd+K everywhere). */}
      <CommandPalette onOpenCinema={() => setCinemaOpen(true)} />
      <ExecutiveCinema open={cinemaOpen} onClose={() => setCinemaOpen(false)} />
      <DepartmentsLauncher open={deptsOpen} onClose={() => setDeptsOpen(false)} />

      {/* ══ Primary navigation — moved to the TOP (items 6 + 7). Settings is
          deliberately absent: it lives in the right rail only. ══ */}
      <HomeTopNav />

      {/* ══ NEXIOS Four-Region Executive Hub — the PRIMARY dashboard: all four
          regions around a central interactive Saudi map, live per-region KPIs
          and alerts from Supabase (resilient), system status, and the FINN
          assistant persona. Live data, not a static poster. ══ */}
      <div ref={posterRef} data-nx-frozen="false" className="relative z-10 mt-2 sm:mt-4">
        <FourRegionHub />
      </div>

      {/* ══ Sovereign Cinematic Command Deck — the executive dashboard, back in
          its original position below the four-region hub, with the FINN
          anomaly strip, today's recommendations and the decision queue
          restored alongside it. ══ */}
      <section
        ref={deckRef}
        data-nx-frozen="false"
        id="hero-dashboard"
        aria-label={ar ? "لوحة القيادة السيادية الحية" : "Sovereign live command deck"}
        className="relative z-10 mx-auto flex w-full max-w-none flex-col gap-6 px-4 pb-6 pt-4 sm:gap-8 sm:px-6 sm:pt-8"
      >
        <SovereignCommandDeck ar={ar} />
        <DashboardPreviewRail ar={ar} />
        <FinnAnomalyStrip />
        <FinnTodayRecommendations />
        <OsDecisionQueue ar={ar} />
      </section>

      {/* ══ ZONE 5 · العرض التنفيذي — بطاقة جسر القيادة ══ */}
      <ExecutiveShowcaseHub />

      {/* ══ ZONE 6 · التدفقات الهولوغرامية — شجرة القيادة + مدار الوكلاء ══ */}
      <HolographicFlowShowcase ar={ar} agents={HOME_HOLO_AGENTS} />

      {/*
        Overflow moved off the homepage per the Executive Command View
        directive — every destination remains reachable via its own route:
        - SystemModulesDashboard  → /modules  &  /nx-cockpit
        - HomeShowcaseSections    → /system-overview
        - MissionControlStrip     → /mission-control
        - AgentRing / AgentHierarchyGraph / AgenticFlowCanvas → /agents-reference
        - Reports-Agent live card → /reports-agent
        The oversized closing CTA + giant NEXIOS footermark are removed to
        keep the homepage inside the three-screen budget.
      */}

      <div className="sr-only" aria-hidden>
        {t.cta_title} {t.cta_body}
      </div>

      {/* Preserve ids referenced by the guided tour so anchor links still
          resolve (empty targets, no visual weight). */}
      <div id="tour-positioning" className="sr-only" aria-hidden />
      <div id="tour-agents" className="sr-only" aria-hidden />
      <div id="tour-closing" className="sr-only" aria-hidden />
      <div id="tour-compliance" className="sr-only" aria-hidden />

      {/* Refs kept for the freeze-offscreen hook contract but no longer
          attached to real DOM sections that were moved off the homepage. */}
      <div ref={modulesRef} className="hidden" aria-hidden />
      <div ref={agentsRef} className="hidden" aria-hidden />
    </div>
  );
}
