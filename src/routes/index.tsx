import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import {
  ArrowRight,
  Play,
  Sparkles,
} from "lucide-react";
import cinematicCity from "@/assets/cinematic-city.jpg";
import cinematicBoardroom from "@/assets/cinematic-boardroom.jpg";
import cinematicEarth from "@/assets/cinematic-earth.jpg";
import { ScrollReveal, Parallax } from "@/components/cinematic/ScrollReveal";
import { CinematicProgress } from "@/components/cinematic/CinematicProgress";
import { ParticleField } from "@/components/cinematic/ParticleField";
import { ChaosCanvas } from "@/components/cinematic/ChaosCanvas";
import { CountUp } from "@/components/cinematic/CountUp";

const CityScene = lazy(() => import("@/components/cinematic/CityScene"));
const EarthScene = lazy(() => import("@/components/cinematic/EarthScene"));
const AriaCore = lazy(() => import("@/components/cinematic/AriaCore"));
const CityToBoardroomTransition = lazy(() => import("@/components/cinematic/CityToBoardroomTransition"));
import { HeroSkyline } from "@/components/cinematic/HeroSkyline";
import { AriaExecutiveCore, ExecutiveOfficeBackdrop, HoloWidgetRing } from "@/components/cinematic/AriaHeroStage";
import { HoloAriaStage } from "@/components/cinematic/HoloAriaStage";
import { AriaInteractiveHero } from "@/components/cinematic/AriaInteractiveHero";
import { NexusRevealHero } from "@/components/cinematic/NexusRevealHero";
import { MobileExecutiveStrip } from "@/components/cinematic/MobileExecutiveStrip";
import { TrustBar } from "@/components/cinematic/TrustBar";
import { CinematicAudio } from "@/components/cinematic/CinematicAudio";
import { AgentLineup } from "@/components/cinematic/AgentLineup";
const WarRoomScene = lazy(() => import("@/components/cinematic/WarRoomScene"));
const AutonomousEnterpriseScene = lazy(() => import("@/components/cinematic/AutonomousEnterpriseScene"));
import {
  ChaosScene,
  AriaAwakensScene,
  TwinCityScene,
  CommandCenterScene,
  PredictiveScene,
  RoiScene,
  GlobalScene,
  FilmsScene,
  FinalRevealScene,
} from "@/components/landing/scenes";

export const Route = createFileRoute("/")({
  // Open access mode — skip the public landing and drop the executive straight
  // into the command center. No login, no marketing intercept.
  beforeLoad: () => {
    throw redirect({ to: "/command-center" });
  },
  component: CinematicHome,
});


/* ─────────────────────────────────────────────────────────────
   ROOT
   ─────────────────────────────────────────────────────────── */
function CinematicHome() {
  const { user, loading } = useAuth();
  const { locale, setLocale } = useI18n();
  const [forcePublicHome, setForcePublicHome] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setForcePublicHome(true), 3000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  if (loading && !forcePublicHome) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#04060d]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  const isAr = locale === "ar";

  const sceneLabels = isAr
    ? ["الأرض", "الفوضى", "أريا", "التوأم", "القيادة", "التنبؤ", "العائد", "العالم", "السينما", "الكشف"]
    : ["Earth", "Chaos", "ARIA", "Twin", "Command", "Predict", "Return", "Global", "Films", "Reveal"];

  return (
    <div className="relative w-full overflow-x-clip bg-[#04060d] text-white antialiased">
      {/* ============ TOP BAR ============ */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="border-b border-white/5 bg-gradient-to-b from-[#04060d]/90 to-[#04060d]/30 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_24px_-4px_rgba(245,180,84,0.9)]">
                <Sparkles className="h-4 w-4 text-black" />
              </div>
              <div className="leading-tight">
                <div className="text-[13px] font-bold tracking-[0.18em]">NEXUS AI OS</div>
                <div className="text-[9px] uppercase tracking-[0.28em] text-white/50">
                  {isAr ? "نظام التشغيل الذكي" : "Intelligent Enterprises"}
                </div>
              </div>
            </Link>
            <nav className="hidden items-center gap-7 text-xs text-white/70 md:flex">
              <Link to="/films" className="transition hover:text-white">{isAr ? "الأفلام" : "Films"}</Link>
              <Link to="/pricing" className="transition hover:text-white">{isAr ? "الأسعار" : "Pricing"}</Link>
              <Link to="/contact" className="transition hover:text-white">{isAr ? "تواصل" : "Contact"}</Link>
              <button
                onClick={() => setLocale(isAr ? "en" : "ar")}
                className="rounded-full border border-white/20 px-2.5 py-1 text-[10px] uppercase tracking-wider transition hover:bg-white/10"
              >
                {isAr ? "EN" : "AR"}
              </button>
            </nav>
            <div className="flex items-center gap-2">
              <CinematicAudio isAr={isAr} />
              <Link
                to={user ? "/dashboard" : "/login"}
                className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
              >
                {user ? (isAr ? "غرفة القيادة" : "Command Center") : (isAr ? "دخول" : "Sign in")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Side film-strip indicator (desktop) */}
      <CinematicProgress labels={sceneLabels} total={10} />

      {/* ============ SCENE 01 — NEXUS REVEAL (HOLOGRAPHIC) ============ */}
      <NexusRevealHero />


      {/* ============ MOBILE EXECUTIVE STRIP (mobile only) ============ */}
      <MobileExecutiveStrip isAr={isAr} />

      {/* ============ TRUST & SOVEREIGNTY BAR ============ */}
      <TrustBar isAr={isAr} />

      {/* ============ SCENE 02 — ENTERPRISE DATA CHAOS ============ */}
      <ChaosScene isAr={isAr} />

      {/* ============ SCENE 03 — ARIA AWAKENS ============ */}
      <AriaAwakensScene isAr={isAr} />

      {/* ============ SCENE 04 — DIGITAL TWIN CITY ============ */}
      <TwinCityScene isAr={isAr} />

      {/* ============ TRANSITION — CITY → BOARDROOM ============ */}
      <Suspense fallback={null}>
        <CityToBoardroomTransition isAr={isAr} />
      </Suspense>

      {/* ============ SCENE 05 — COMMAND CENTER ============ */}
      <CommandCenterScene isAr={isAr} />

      {/* ============ SCENE 06 — PREDICTIVE INTELLIGENCE ============ */}
      <PredictiveScene isAr={isAr} />

      {/* ============ SCENE 07 — ROI TRANSFORMATION ============ */}
      <RoiScene isAr={isAr} />

      {/* ============ EXECUTIVE WAR ROOM ============ */}
      <Suspense fallback={null}>
        <WarRoomScene isAr={isAr} />
      </Suspense>

      {/* ============ AUTONOMOUS ENTERPRISE ============ */}
      <Suspense fallback={null}>
        <AutonomousEnterpriseScene isAr={isAr} />
      </Suspense>

      {/* ============ SCENE 08 — GLOBAL EXPANSION ============ */}
      <GlobalScene isAr={isAr} />

      {/* ============ SCENE 09 — INVESTOR FILM CENTER ============ */}
      <FilmsScene isAr={isAr} />

      {/* ============ SCENE 10 — FINAL REVEAL ============ */}
      <FinalRevealScene isAr={isAr} />

      {/* ============ FOOTER ============ */}
      <footer className="relative border-t border-white/5 bg-[#02030a] py-14">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600">
                <Sparkles className="h-4 w-4 text-black" />
              </div>
              <div className="text-sm">
                <div className="font-semibold tracking-wider">NEXUS AI OS</div>
                <div className="text-[11px] text-white/40">
                  © {new Date().getFullYear()} · {isAr ? "كل الحقوق محفوظة" : "All rights reserved"}
                </div>
              </div>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/60">
              <Link to="/films" className="hover:text-white">{isAr ? "الأفلام" : "Films"}</Link>
              <Link to="/pricing" className="hover:text-white">{isAr ? "الأسعار" : "Pricing"}</Link>
              <Link to="/contact" className="hover:text-white">{isAr ? "تواصل" : "Contact"}</Link>
              <Link to="/book" className="hover:text-white">{isAr ? "احجز" : "Book"}</Link>
              <Link to="/privacy" className="hover:text-white">{isAr ? "الخصوصية" : "Privacy"}</Link>
              <Link to="/terms" className="hover:text-white">{isAr ? "الشروط" : "Terms"}</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
