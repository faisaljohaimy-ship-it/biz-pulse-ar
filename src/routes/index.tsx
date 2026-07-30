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

function IntroLanding() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  // The single global FINN backdrop is rendered from __root.tsx; this
  // route only owns the executive hero content. No canvas, no boot
  // animation, no AudioContext.

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

      {/* Notifications + Settings are activated inline in FourRegionHub's
          header (Bell + Settings buttons). No floating utility bar here. */}

      {/* Lightweight gradient hero glow layered above her, still behind content. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(80%_55%_at_50%_0%,rgba(0,212,255,0.18),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_35%,rgba(58,232,255,0.10),transparent_65%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#04070F] to-transparent" />
      </div>

      {/* CommandPalette is mounted globally in AppShell (Ctrl/Cmd+K everywhere). */}
      <CommandPalette />
      <DepartmentsLauncher open={deptsOpen} onClose={() => setDeptsOpen(false)} />

      {/* ══ Primary navigation — moved to the TOP (items 6 + 7). Settings is
          deliberately absent: it lives in the right rail only. ══ */}
      <HomeTopNav />

      {/* ══ الجزء الأول: المؤشرات الست. Moved UP here from between the (now
          deleted) ticker and the command centres — items 9 + 10 are one move,
          not a delete plus a rebuild: SovereignCommandDeck already defines
          exactly these six instruments, so nothing was invented. ══ */}
      <section
        ref={deckRef}
        data-nx-frozen="false"
        id="home-kpis"
        aria-label={ar ? "المؤشرات التنفيذية الست" : "The six executive indicators"}
        className="relative z-10 mx-auto w-full max-w-none px-4 pt-3 sm:px-6 sm:pt-4"
      >
        <SovereignCommandDeck ar={ar} />
      </section>

      {/* ══ NEXIOS Four-Region Executive Hub — the PRIMARY dashboard: all four
          regions around a central interactive Saudi map, live per-region KPIs
          and alerts from Supabase (resilient), system status, and the FINN
          assistant persona. Live data, not a static poster. ══ */}
      <div ref={posterRef} data-nx-frozen="false" className="relative z-10 mt-2 sm:mt-4">
        <FourRegionHub />
      </div>

      {/* Dashboard preview rail — the KPI deck moved to the top of the page. */}
      <section
        data-nx-frozen="false"
        id="hero-dashboard"
        aria-label={ar ? "معاينات اللوحات" : "Dashboard previews"}
        className="relative z-10 mx-auto flex w-full max-w-none flex-col gap-6 px-4 pb-6 pt-4 sm:gap-8 sm:px-6 sm:pt-8"
      >
        <DashboardPreviewRail ar={ar} />
      </section>

      {/* item 26: «شجرة القيادة الهولوغرامية» removed from the homepage — the
          HolographicFlowShowcase rendered exactly that tree (plus the agent
          orbit) via AgentHierarchyGraph. Item 63 points the same way. */}

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
