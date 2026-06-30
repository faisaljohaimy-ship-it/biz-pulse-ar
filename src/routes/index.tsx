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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexus AI OS — The Operating System for Intelligent Enterprises" },
      {
        name: "description",
        content:
          "A cinematic enterprise experience: ARIA executive intelligence, a living digital twin city, and a Fortune-grade command room. Built for boards, investors, and governments.",
      },
      { property: "og:title", content: "Nexus AI OS — The Operating System for Intelligent Enterprises" },
      { property: "og:description", content: "ARIA · Digital Twin · Boardroom · The cinematic enterprise OS." },
      { property: "og:url", content: DOMAIN_URL },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: DOMAIN_URL },
      { rel: "preload", as: "image", href: cinematicCity, fetchPriority: "high" as const },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Nexus AI OS",
          url: DOMAIN_URL,
          logo: `${DOMAIN_URL}/nexus-icon.png`,
          description: "The operating system for intelligent enterprises.",
        }),
      },
    ],
  }),
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

/* ═══════════════════════════════════════════════════════════
   SCENE 02 — DATA CHAOS
   ═════════════════════════════════════════════════════════ */
function ChaosScene({ isAr }: { isAr: boolean }) {
  const systems = ["ERP", "SAP", "CRM", "Excel", "Emails", "BI", "Docs", "Slack", "SharePoint", "Oracle", "HRMS", "Finance"];

  const painsLeft = isAr
    ? [
        { k: "صوامع البيانات",   v: 73, hint: "١٢ نظاماً غير متصل" },
        { k: "تأخّر التقارير",   v: 86, hint: "متوسط ٩ أيام/تقرير" },
        { k: "اختناقات تشغيلية", v: 64, hint: "٤١ موافقة عالقة" },
      ]
    : [
        { k: "Data Silos",              v: 73, hint: "12 disconnected systems" },
        { k: "Slow Reporting",          v: 86, hint: "9 days avg per report" },
        { k: "Operational Bottlenecks", v: 64, hint: "41 approvals stuck" },
      ];
  const painsRight = isAr
    ? [
        { k: "تصاعد المخاطر", v: 78, hint: "٣ إشارات حرجة بدون مالك" },
        { k: "قرارات بطيئة",  v: 81, hint: "متوسط ٤.٢ يوم/قرار" },
        { k: "ضياع المعرفة",  v: 69, hint: "٣٧٪ من المستندات يتيمة" },
      ]
    : [
        { k: "Risk Escalation", v: 78, hint: "3 critical signals unowned" },
        { k: "Slow Decisions",  v: 81, hint: "4.2 days avg per decision" },
        { k: "Lost Knowledge",  v: 69, hint: "37% of docs orphaned" },
      ];

  const PainCard = ({ k, v, hint }: { k: string; v: number; hint: string }) => (
    <div className="rounded-lg border border-red-500/15 bg-gradient-to-br from-red-500/[0.06] to-transparent p-4 backdrop-blur-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.28em] text-red-300/85">{k}</span>
        <span className="text-xs font-semibold tabular-nums text-red-200">{v}%</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-400 via-red-500 to-red-600"
          style={{ width: `${v}%`, animation: "chaos-pulse 2.8s ease-in-out infinite" }}
        />
      </div>
      <div className="mt-2 text-[10px] text-white/45">{hint}</div>
    </div>
  );

  return (
    <section
      data-scene="2"
      className="relative flex min-h-[110svh] items-center overflow-hidden bg-[#04060d] py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,80,80,0.14),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,120,80,0.08),transparent_55%)]" />
      <ChaosCanvas />
      <ParticleField density={0.00006} />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[520px] w-[520px] max-w-[88vw]">
          {systems.map((s, i) => {
            const angle = (i / systems.length) * Math.PI * 2;
            const radius = 220;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return (
              <div
                key={s}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-mono tracking-wider text-white/55 backdrop-blur-md animate-float-slow"
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  animationDelay: `${i * 0.25}s`,
                }}
              >
                {s}
              </div>
            );
          })}
          <svg className="absolute inset-0 h-full w-full" viewBox="-260 -260 520 520" aria-hidden>
            {systems.map((_, i) => {
              const angle = (i / systems.length) * Math.PI * 2;
              const r = 220;
              return (
                <line
                  key={i}
                  x1={0}
                  y1={0}
                  x2={Math.cos(angle) * r}
                  y2={Math.sin(angle) * r}
                  stroke="rgba(255,80,80,0.18)"
                  strokeDasharray="2 4"
                />
              );
            })}
          </svg>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-400 to-red-700 shadow-[0_0_60px_rgba(255,80,80,0.6)] animate-pulse" />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_minmax(0,2fr)_1fr]">
          <div className="order-2 space-y-3 lg:order-1">
            <p className="text-[10px] uppercase tracking-[0.32em] text-red-300/70">
              {isAr ? "نقاط الألم" : "Pain Signals"}
            </p>
            {painsLeft.map((p) => <PainCard key={p.k} {...p} />)}
          </div>

          <div className="order-1 text-center lg:order-2">
            <ScrollReveal>
              <p className="text-xs uppercase tracking-[0.4em] text-red-400/80">
                {isAr ? "المشهد ٠٢ · الفوضى" : "Scene 02 · The Chaos"}
              </p>
              <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                {isAr ? "اثنا عشر نظامًا." : "Twelve systems."}{" "}
                <span className="text-white/40">{isAr ? "صفر معنى." : "Zero meaning."}</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={250}>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
                {isAr
                  ? "كل ERP وCRM وExcel وبريد يحمل قطعة من الحقيقة. بدون نواة، تبقى مجرد ضوضاء."
                  : "Every ERP, CRM, spreadsheet and inbox holds a fragment of the truth. Without a core, it's just noise."}
              </p>
            </ScrollReveal>
          </div>

          <div className="order-3 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.32em] text-red-300/70 ltr:text-right">
              {isAr ? "نقاط الألم" : "Pain Signals"}
            </p>
            {painsRight.map((p) => <PainCard key={p.k} {...p} />)}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes chaos-pulse { 0%,100% { opacity: 0.75; } 50% { opacity: 1; } }
      `}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE 03 — ARIA AWAKENS
   ═════════════════════════════════════════════════════════ */
function AriaAwakensScene({ isAr }: { isAr: boolean }) {
  const thoughts = isAr
    ? [
        "تحليل ٢٤ قسماً مؤسسياً…",
        "كشف ٣ إشارات مخاطر مبكرة…",
        "محاكاة ٤ سيناريوهات للإيرادات…",
        "اقتراح إعادة تخصيص ٢.٤M ريال…",
        "تنسيق ٤٨ وكيلاً ذكياً…",
      ]
    : [
        "Parsing 24 enterprise domains…",
        "Detecting 3 early-risk signals…",
        "Simulating 4 revenue scenarios…",
        "Proposing SAR 2.4M reallocation…",
        "Orchestrating 48 AI agents…",
      ];
  const [thoughtIdx, setThoughtIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setThoughtIdx((i) => (i + 1) % thoughts.length), 2400);
    return () => clearInterval(t);
  }, [thoughts.length]);

  // 64-bar voice waveform driven by sine sums
  const bars = Array.from({ length: 64 });
  const decisions = isAr
    ? [
        { k: "DECISION", t: "موافقة على دفعة تسويق Q3", c: "+SAR 4.2M" },
        { k: "RISK", t: "تأخر مورد لوجستي · الرياض", c: "−3 أيام" },
        { k: "OPPORTUNITY", t: "توسّع قطاع الصحة", c: "+18% TAM" },
      ]
    : [
        { k: "DECISION", t: "Approve Q3 marketing tranche", c: "+SAR 4.2M" },
        { k: "RISK", t: "Logistics supplier delay · Riyadh", c: "−3 days" },
        { k: "OPPORTUNITY", t: "Healthcare vertical expansion", c: "+18% TAM" },
      ];

  return (
    <section
      data-scene="3"
      className="relative flex min-h-[120svh] items-center justify-center overflow-hidden bg-black py-24"
    >
      {/* atmospheric layers */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(167,139,250,0.22),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgba(92,189,255,0.10),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <Suspense fallback={null}><AriaCore /></Suspense>
      </div>
      <ParticleField density={0.00012} />

      {/* concentric neural rings */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2">
        {[260, 360, 480, 620, 780].map((d, i) => (
          <div
            key={d}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/15"
            style={{
              width: d,
              height: d,
              animation: `aria-ring ${10 + i * 3}s linear infinite`,
              borderStyle: i % 2 ? "dashed" : "solid",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5">
        <div className="text-center">
          <ScrollReveal direction="scale">
            <p className="text-[10px] uppercase tracking-[0.5em] text-violet-300/80 sm:text-xs">
              {isAr ? "المشهد ٠٣ · الاستيقاظ" : "Scene 03 · The Awakening"}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <h2 className="mt-6 text-6xl font-bold leading-[0.92] tracking-tight sm:text-8xl lg:text-9xl">
              <span className="bg-gradient-to-br from-violet-200 via-white to-amber-200 bg-clip-text text-transparent">
                ARIA
              </span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={350}>
            <p className="mt-4 text-base font-light text-white/75 sm:text-2xl">
              {isAr ? "ذكاء تنفيذي. حيّ. يفكّر." : "Executive Intelligence. Alive. Thinking."}
            </p>
          </ScrollReveal>
        </div>

        {/* Voice waveform — live */}
        <div className="mx-auto mt-12 flex h-28 max-w-3xl items-end justify-center gap-[3px] sm:h-36">
          {bars.map((_, i) => (
            <span
              key={i}
              className="block w-[3px] rounded-full bg-gradient-to-t from-violet-500/40 via-violet-300 to-white"
              style={{
                height: "10%",
                animation: `aria-bar ${1.6 + (i % 7) * 0.18}s ease-in-out ${i * 0.025}s infinite alternate`,
                opacity: 0.55 + (i % 5) * 0.08,
              }}
            />
          ))}
        </div>

        {/* HUD grid */}
        <div className="mt-12 grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Thinking state */}
          <HoloFrame label={isAr ? "حالة التفكير" : "Thinking State"} accent="violet">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/70" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-violet-300" />
              </span>
              <span className="text-[11px] uppercase tracking-[0.3em] text-violet-200/80">
                {isAr ? "نشطة" : "Active"}
              </span>
            </div>
            <p className="mt-4 min-h-[3.5em] text-sm leading-relaxed text-white/85 sm:text-base" key={thoughtIdx}>
              <span className="animate-[aria-think_0.6s_ease-out]">{thoughts[thoughtIdx]}</span>
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.25em] text-white/45">
              <div>{isAr ? "نماذج ١٢" : "Models 12"}</div>
              <div>{isAr ? "وكلاء ٤٨" : "Agents 48"}</div>
              <div>{isAr ? "زمن ٤٢مث" : "Latency 42ms"}</div>
            </div>
          </HoloFrame>

          {/* Decision engine */}
          <HoloFrame label={isAr ? "محرك القرار" : "Decision Engine"} accent="amber">
            <ul className="space-y-3">
              {decisions.map((d, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="min-w-0">
                    <div className="text-[9px] uppercase tracking-[0.32em] text-amber-300/80">{d.k}</div>
                    <div className="mt-1 truncate text-sm text-white/90">{d.t}</div>
                  </div>
                  <div className="shrink-0 text-xs font-semibold text-emerald-300/90">{d.c}</div>
                </li>
              ))}
            </ul>
          </HoloFrame>

          {/* Neural intelligence */}
          <HoloFrame label={isAr ? "الذكاء العصبي" : "Neural Intelligence"} accent="cyan">
            <div className="space-y-3">
              {[
                { l: isAr ? "ثقة النموذج" : "Model Confidence", v: 94 },
                { l: isAr ? "تماسك الإشارات" : "Signal Coherence", v: 87 },
                { l: isAr ? "إجماع الوكلاء" : "Agent Consensus", v: 91 },
              ].map((m) => (
                <div key={m.l}>
                  <div className="flex items-center justify-between text-[11px] text-white/65">
                    <span>{m.l}</span>
                    <span className="tabular-nums text-cyan-200">{m.v}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-300"
                      style={{ width: `${m.v}%`, animation: "aria-pulse 3s ease-in-out infinite" }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-2 text-[11px] leading-relaxed text-white/55">
                {isAr
                  ? "تتعلم ARIA من كل قرار. كل دورة تجعلها أذكى."
                  : "ARIA learns from every decision. Each cycle makes her sharper."}
              </p>
            </div>
          </HoloFrame>
        </div>
      </div>

      <style>{`
        @keyframes aria-bar { 0% { height: 8%; } 100% { height: 100%; } }
        @keyframes aria-ring { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
        @keyframes aria-pulse { 0%,100% { opacity: 0.85; } 50% { opacity: 1; } }
        @keyframes aria-think { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE 04 — DIGITAL TWIN CITY
   ═════════════════════════════════════════════════════════ */
function TwinCityScene({ isAr }: { isAr: boolean }) {
  const signals = isAr
    ? [
        { c: "bg-blue-400", t: "الإدارات", d: "أحياء ذكية" },
        { c: "bg-amber-400", t: "المشاريع", d: "مبانٍ نابضة" },
        { c: "bg-red-500", t: "المخاطر", d: "إشارات حمراء" },
        { c: "bg-amber-300", t: "الفرص", d: "إشارات ذهبية" },
        { c: "bg-cyan-400", t: "البيانات", d: "طرق ضوئية" },
      ]
    : [
        { c: "bg-blue-400", t: "Departments", d: "Smart districts" },
        { c: "bg-amber-400", t: "Projects", d: "Living buildings" },
        { c: "bg-red-500", t: "Risks", d: "Red beacons" },
        { c: "bg-amber-300", t: "Opportunities", d: "Golden signals" },
        { c: "bg-cyan-400", t: "Data", d: "Light highways" },
      ];
  return (
    <section
      data-scene="4"
      className="relative flex min-h-[120svh] items-stretch overflow-hidden"
    >
      <Parallax strength={140} className="absolute inset-0">
        <img
          src={cinematicCity}
          alt=""
          loading="lazy"
          width={1920}
          height={1080}
          className="h-full w-full scale-110 object-cover"
        />
      </Parallax>
      {/* Live 3D city — taller, more dominant */}
      <div className="pointer-events-none absolute inset-0 opacity-85 mix-blend-screen">
        <Suspense fallback={null}><CityScene /></Suspense>
      </div>
      <ParticleField density={0.00008} />
      {/* fog layers */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#04060d] via-[#04060d]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#04060d] via-[#04060d]/40 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,transparent_30%,rgba(4,6,13,0.65)_85%)]" />

      {/* Floating district hologram chips */}
      <TwinHoloLabels isAr={isAr} />

      {/* Live activity feed (right rail, desktop) */}
      <TwinActivityFeed isAr={isAr} />

      {/* District roster (left rail, desktop) */}
      <TwinDistrictRoster isAr={isAr} />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-between px-5 py-32">
        <div>
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">{isAr ? "المشهد ٠٤ · التوأم الرقمي" : "Scene 04 · The Digital Twin"}</p>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <h2 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              {isAr ? (
                <>مؤسستك. <span className="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">كمدينة حيّة.</span></>
              ) : (
                <>Your enterprise. <span className="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">As a living city.</span></>
              )}
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={350}>
            <p className="mt-6 max-w-xl text-lg text-white/75">
              {isAr
                ? "أحياء = إدارات. مبانٍ = مشاريع. طائرات ذاتية = وكلاء ذكاء. تيارات ضوئية = بيانات تتدفق بين الجميع."
                : "Districts are departments. Buildings are projects. Drones are AI agents. Light streams are data flowing between them all."}
            </p>
          </ScrollReveal>
        </div>

        {/* bottom executive HUD strip */}
        <ScrollReveal delay={500}>
          <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl sm:grid-cols-5">
            {[
              { v: "24", l: isAr ? "حياً" : "Districts" },
              { v: "1,847", l: isAr ? "مبنى" : "Buildings" },
              { v: "48", l: isAr ? "وكيل ذكاء" : "AI Agents" },
              { v: "12.8K", l: isAr ? "إشارة/ث" : "Signals/sec" },
              { v: "342", l: isAr ? "أتمتة" : "Automations" },
            ].map((s) => (
              <div key={s.l} className="bg-[#04060d]/55 px-5 py-6">
                <div className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{s.v}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/55">{s.l}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* legend */}
        <ScrollReveal delay={650}>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-6">
            {signals.map((s) => (
              <div key={s.t} className="flex items-center gap-2.5">
                <span className={`relative flex h-2.5 w-2.5 ${s.c} rounded-full`}>
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${s.c} opacity-70`} />
                </span>
                <span className="text-sm font-semibold text-white">{s.t}</span>
                <span className="text-sm text-white/50">· {s.d}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE 05 — EXECUTIVE COMMAND CENTER (Boardroom)
   ═════════════════════════════════════════════════════════ */
function CommandCenterScene({ isAr }: { isAr: boolean }) {
  const recs = isAr
    ? [
        { tag: "TActical", t: "إعادة تخصيص ٢.٤M ريال إلى قطاع الخدمات", c: "+11.2% ROI" },
        { tag: "Risk", t: "تأمين سلسلة الإمداد — مورد بديل في الرياض", c: "−68% تعرض" },
        { tag: "Growth", t: "إطلاق ARIA في قطاع التجزئة Q3", c: "+SAR 18M" },
        { tag: "People", t: "إعادة هيكلة فريق المنتج — ٣ قادة جدد", c: "+22% إنتاجية" },
      ]
    : [
        { tag: "Tactical", t: "Reallocate SAR 2.4M into Services vertical", c: "+11.2% ROI" },
        { tag: "Risk", t: "Hedge supply chain — alternate Riyadh vendor", c: "−68% exposure" },
        { tag: "Growth", t: "Launch ARIA in Retail vertical Q3", c: "+SAR 18M" },
        { tag: "People", t: "Restructure product org — 3 new leads", c: "+22% velocity" },
      ];

  // Future scenarios + Board Meeting Mode
  type ScenarioKey = "conservative" | "base" | "aggressive";
  const [scenario, setScenario] = useState<ScenarioKey>("base");
  const [boardMode, setBoardMode] = useState(false);

  const scenarios: Record<ScenarioKey, {
    label: string; revenue: string; risk: string; roi: string; horizon: string; note: string;
    tone: string; pts: number[];
  }> = {
    conservative: {
      label: isAr ? "محافظ" : "Conservative",
      revenue: "+SAR 96M", risk: "−42%", roi: "+8.4%",
      horizon: isAr ? "أفق ١٨ شهر" : "18-month horizon",
      note: isAr ? "تنفيذ تدريجي · مخاطرة منخفضة" : "Gradual rollout · low risk exposure",
      tone: "cyan",
      pts: [40, 42, 46, 49, 53, 56, 58, 62, 65, 68, 72, 76],
    },
    base: {
      label: isAr ? "أساسي" : "Base",
      revenue: "+SAR 184M", risk: "−61%", roi: "+11.2%",
      horizon: isAr ? "أفق ١٢ شهر" : "12-month horizon",
      note: isAr ? "خطة موصى بها من ARIA" : "ARIA-recommended trajectory",
      tone: "emerald",
      pts: [40, 46, 54, 60, 68, 76, 84, 90, 96, 104, 112, 120],
    },
    aggressive: {
      label: isAr ? "هجومي" : "Aggressive",
      revenue: "+SAR 312M", risk: "−39%", roi: "+18.7%",
      horizon: isAr ? "أفق ٩ أشهر" : "9-month horizon",
      note: isAr ? "توسّع متوازٍ · رأس مال أعلى" : "Parallel expansion · higher capital",
      tone: "amber",
      pts: [40, 52, 64, 78, 92, 108, 124, 138, 152, 166, 178, 188],
    },
  };
  const cur = scenarios[scenario];
  const toneClasses: Record<string, { text: string; bg: string; ring: string; from: string; to: string }> = {
    cyan:    { text: "text-cyan-300",    bg: "bg-cyan-400",    ring: "ring-cyan-300/40",    from: "from-cyan-400",    to: "to-cyan-200" },
    emerald: { text: "text-emerald-300", bg: "bg-emerald-400", ring: "ring-emerald-300/40", from: "from-emerald-400", to: "to-emerald-200" },
    amber:   { text: "text-amber-300",   bg: "bg-amber-400",   ring: "ring-amber-300/40",   from: "from-amber-400",   to: "to-amber-200" },
  };
  const tc = toneClasses[cur.tone];

  const kpis = [
    { v: "12.8K", l: isAr ? "إشارة/ث" : "Signals/sec", c: "text-cyan-300" },
    { v: "47", l: isAr ? "تنبيه نشط" : "Active alerts", c: "text-amber-300" },
    { v: "94%", l: isAr ? "ثقة النموذج" : "Model confidence", c: "text-emerald-300" },
    { v: "<1s", l: isAr ? "زمن القرار" : "Decision latency", c: "text-violet-300" },
  ];

  return (
    <section
      data-scene="5"
      className="relative flex min-h-[130svh] items-center overflow-hidden bg-[#02030a]"
    >
      {/* Panoramic holographic backdrop */}
      <div className="absolute inset-0">
        <img
          src={cinematicBoardroom}
          alt=""
          loading="lazy"
          width={1920}
          height={1080}
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#02030a] via-[#02030a]/55 to-[#02030a]" />
        {/* Curved holo wall grid */}
        <div
          className="absolute inset-x-0 top-0 h-[85%] opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(96,165,250,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.45) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            transform: "perspective(900px) rotateX(38deg) translateY(-10%) scale(1.4)",
            transformOrigin: "50% 0%",
            maskImage: "radial-gradient(ellipse 70% 55% at 50% 30%, #000 40%, transparent 80%)",
          }}
        />
        {/* Floor reflection grid */}
        <div
          className="absolute inset-x-0 bottom-0 h-[40%] opacity-[0.22]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(125,211,252,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.5) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            transform: "perspective(700px) rotateX(60deg)",
            transformOrigin: "50% 100%",
            maskImage: "linear-gradient(to top, #000 5%, transparent 90%)",
          }}
        />
        {/* Volumetric light beams */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(96,165,250,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_30%,rgba(167,139,250,0.12),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_30%,rgba(245,180,84,0.10),transparent_45%)]" />
        {/* Top vignette */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#02030a] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-[#02030a] to-transparent" />
      </div>
      <ParticleField density={0.00009} />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-28 sm:py-36">
        {/* Title */}
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <p className="text-[11px] uppercase tracking-[0.45em] text-blue-300/80">
              {isAr ? "المشهد ٠٥ · غرفة القيادة التنفيذية" : "Scene 05 · Executive Command Center"}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <h2 className="mt-5 text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              {isAr ? "حيث تتخذ القرارات" : "Where the decisions"}
              <br />
              <span className="bg-gradient-to-r from-blue-200 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
                {isAr ? "بمليار دولار." : "of a trillion are made."}
              </span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/65 sm:text-lg">
              {isAr
                ? "جدار هولوجرافي بانورامي. ARIA في المركز. كل مؤشر، كل خطر، كل فرصة — على شاشة واحدة."
                : "A panoramic holographic wall. ARIA at its core. Every metric, risk and opportunity — one surface of truth."}
            </p>
          </ScrollReveal>
        </div>

        {/* Executive KPI strip */}
        <ScrollReveal delay={400}>
          <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] backdrop-blur-2xl sm:grid-cols-4">
            {kpis.map((s) => (
              <div key={s.l} className="relative bg-[#04060d]/60 px-5 py-6">
                <div className={`text-3xl font-bold tracking-tight sm:text-4xl ${s.c}`}>{s.v}</div>
                <div className="mt-1.5 text-[10px] uppercase tracking-[0.25em] text-white/45">{s.l}</div>
                <span className={`absolute right-3 top-3 h-1.5 w-1.5 rounded-full ${s.c.replace("text-", "bg-")} animate-pulse`} />
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Holographic wall — 3 columns on desktop */}
        <div className="mt-14 grid gap-5 lg:grid-cols-[1fr_1.25fr_1fr]">
          {/* LEFT — Risk Heat Map + Revenue Projection */}
          <div className="space-y-5">
            <HoloFrame label={isAr ? "خريطة المخاطر" : "Risk Heat Map"} accent="amber">
              <RiskHeatmap />
              <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/50">
                <span>{isAr ? "٧ مناطق حرجة" : "7 critical zones"}</span>
                <span className="text-amber-300">●  LIVE</span>
              </div>
            </HoloFrame>
            <HoloFrame label={isAr ? "توقّع الإيرادات" : "Revenue Projection"} accent="cyan">
              <RevenueProjection />
              <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider">
                <span className="text-white/50">{isAr ? "أفق ١٢ شهر" : "12-month horizon"}</span>
                <span className="text-emerald-300">+ SAR 184M</span>
              </div>
            </HoloFrame>
          </div>

          {/* CENTER — ARIA */}
          <ScrollReveal delay={200} direction="scale">
            <div className="relative h-[440px] overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.05] to-white/[0.01] backdrop-blur-2xl sm:h-[520px]">
              {/* Aria core */}
              <div className="absolute inset-0">
                <Suspense fallback={null}>
                  <AriaCore />
                </Suspense>
              </div>
              {/* Glow pedestal */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(ellipse_at_50%_100%,rgba(96,165,250,0.45),transparent_70%)]" />
              {/* Label */}
              <div className="absolute inset-x-0 top-5 text-center">
                <p className="text-[10px] uppercase tracking-[0.5em] text-cyan-200/80">
                  {isAr ? "الذكاء التنفيذي" : "Executive Intelligence"}
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-wide text-white">ARIA</p>
              </div>
              {/* Speaking waveform */}
              <div className="absolute inset-x-0 bottom-6 flex items-end justify-center gap-1">
                {Array.from({ length: 28 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-cyan-300/70"
                    style={{
                      height: `${8 + Math.abs(Math.sin(i * 0.6)) * 28}px`,
                      animation: `pulse 1.${(i % 9) + 1}s ease-in-out ${i * 0.05}s infinite`,
                    }}
                  />
                ))}
              </div>
              {/* Quote */}
              <div className="absolute inset-x-6 bottom-20 text-center">
                <p className="text-[13px] leading-relaxed text-white/85 sm:text-sm">
                  {isAr
                    ? "« أوصي بإعادة تخصيص ٢.٤M ريال — تأثير +١١.٢٪ على العائد. »"
                    : "“I recommend reallocating SAR 2.4M — projected +11.2% ROI impact.”"}
                </p>
              </div>
              {/* Corner brackets */}
              <Corners />
            </div>
          </ScrollReveal>

          {/* RIGHT — Opportunity Radar + AI Recommendations */}
          <div className="space-y-5">
            <HoloFrame label={isAr ? "رادار الفرص" : "Opportunity Radar"} accent="emerald">
              <OpportunityRadar />
              <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/50">
                <span>{isAr ? "١٢ فرصة مكتشفة" : "12 opportunities detected"}</span>
                <span className="text-emerald-300">SAR 42M</span>
              </div>
            </HoloFrame>
            <HoloFrame label={isAr ? "توصيات ARIA" : "ARIA Recommendations"} accent="violet">
              <ul className="space-y-2.5">
                {recs.map((r) => (
                  <li
                    key={r.t}
                    className="group flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 transition hover:border-violet-300/30 hover:bg-violet-500/[0.06]"
                  >
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-[0.2em] text-violet-300/80">{r.tag}</div>
                      <div className="mt-0.5 truncate text-[12px] text-white/85">{r.t}</div>
                    </div>
                    <div className="shrink-0 text-[11px] font-semibold text-emerald-300">{r.c}</div>
                  </li>
                ))}
              </ul>
            </HoloFrame>
          </div>
        </div>

        {/* Sequential agent lineup — every Digital Human boots in order */}
        <ScrollReveal delay={150}>
          <AgentLineup isAr={isAr} />
        </ScrollReveal>

        {/* Future Scenarios + Board Meeting Mode */}

        <ScrollReveal delay={200}>
          <div className={`mx-auto mt-10 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-2xl transition-all duration-500 ${boardMode ? "ring-1 ring-cyan-300/40 shadow-[0_0_120px_-30px_rgba(96,165,250,0.55)]" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.35em] text-cyan-200/85">
                  {isAr ? "سيناريوهات مستقبلية" : "Future Scenarios"}
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                  · ARIA Simulation
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(Object.keys(scenarios) as ScenarioKey[]).map((k) => {
                  const active = scenario === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setScenario(k)}
                      className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.25em] transition ${
                        active
                          ? `border-white/40 bg-white/10 text-white ${tc.ring} ring-1`
                          : "border-white/10 text-white/55 hover:border-white/25 hover:text-white/85"
                      }`}
                    >
                      {scenarios[k].label}
                    </button>
                  );
                })}
                <button
                  onClick={() => setBoardMode((v) => !v)}
                  aria-pressed={boardMode}
                  className={`ml-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.25em] transition ${
                    boardMode
                      ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-100"
                      : "border-white/15 text-white/60 hover:border-white/30 hover:text-white/90"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${boardMode ? "bg-cyan-300" : "bg-white/40"}`} />
                  {isAr ? "وضع اجتماع المجلس" : "Board Meeting Mode"}
                </button>
              </div>
            </div>

            <div className={`grid gap-px bg-white/5 transition-all duration-500 sm:grid-cols-4 ${boardMode ? "p-1" : ""}`}>
              <div className="bg-[#04060d]/70 px-5 py-5">
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                  {isAr ? "الإيراد الإضافي" : "Incremental Revenue"}
                </div>
                <div className={`mt-2 bg-gradient-to-br ${tc.from} ${tc.to} bg-clip-text font-bold tracking-tight text-transparent tabular-nums ${boardMode ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}>
                  {cur.revenue}
                </div>
                <div className="mt-1 text-[10px] text-white/45">{cur.horizon}</div>
              </div>
              <div className="bg-[#04060d]/70 px-5 py-5">
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                  {isAr ? "خفض المخاطر" : "Risk Reduction"}
                </div>
                <div className={`mt-2 bg-gradient-to-br from-rose-300 to-rose-500 bg-clip-text font-bold tracking-tight text-transparent tabular-nums ${boardMode ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}>
                  {cur.risk}
                </div>
                <div className="mt-1 text-[10px] text-white/45">{isAr ? "تعرض مرجّح" : "Weighted exposure"}</div>
              </div>
              <div className="bg-[#04060d]/70 px-5 py-5">
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                  {isAr ? "أثر العائد" : "ROI Impact"}
                </div>
                <div className={`mt-2 bg-gradient-to-br from-amber-200 to-amber-500 bg-clip-text font-bold tracking-tight text-transparent tabular-nums ${boardMode ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}>
                  {cur.roi}
                </div>
                <div className="mt-1 text-[10px] text-white/45">{isAr ? "سنوياً مرجح" : "Annualised weighted"}</div>
              </div>
              <div className="relative bg-[#04060d]/70 px-5 py-5">
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                  {isAr ? "مسار المحاكاة" : "Simulation Trajectory"}
                </div>
                <svg viewBox="0 0 120 50" className="mt-3 h-14 w-full">
                  <defs>
                    <linearGradient id={`sg-${scenario}`} x1="0" x2="1">
                      <stop offset="0%" stopColor={cur.tone === "amber" ? "#fbbf24" : cur.tone === "emerald" ? "#34d399" : "#67e8f9"} stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="none"
                    stroke={`url(#sg-${scenario})`}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={cur.pts
                      .map((p, i) => {
                        const x = (i / (cur.pts.length - 1)) * 120;
                        const y = 50 - (p / 200) * 50;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    style={{ filter: "drop-shadow(0 0 6px rgba(125,211,252,0.5))" }}
                  />
                </svg>
                <div className="mt-1 text-[10px] text-white/55">{cur.note}</div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="mx-auto mt-10 flex max-w-5xl flex-col items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-blue-500/[0.08] via-cyan-400/[0.06] to-violet-500/[0.08] px-6 py-5 backdrop-blur-2xl sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
              </span>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/65">
                {isAr ? "محرّك القرار التنفيذي" : "Executive Decision Engine"}
              </p>
            </div>
            <div className="flex items-center gap-6 text-center">
              <Stat n={3} l={isAr ? "قرار جاهز" : "Decisions ready"} />
              <span className="h-6 w-px bg-white/15" />
              <Stat n={11.2} suffix="%" l={isAr ? "أثر متوقع" : "Projected impact"} />
              <span className="h-6 w-px bg-white/15" />
              <Stat n={94} suffix="%" l={isAr ? "ثقة" : "Confidence"} />
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function Stat({ n, suffix, l }: { n: number; suffix?: string; l: string }) {
  return (
    <div>
      <div className="text-xl font-bold tracking-tight text-white">
        <CountUp value={`${n}${suffix ?? ""}`} duration={1200} />
      </div>
      <div className="text-[9px] uppercase tracking-[0.2em] text-white/45">{l}</div>
    </div>
  );
}

function Corners() {
  const c = "absolute h-5 w-5 border-cyan-300/60";
  return (
    <>
      <span className={`${c} left-3 top-3 border-l border-t`} />
      <span className={`${c} right-3 top-3 border-r border-t`} />
      <span className={`${c} bottom-3 left-3 border-b border-l`} />
      <span className={`${c} bottom-3 right-3 border-b border-r`} />
    </>
  );
}

function HoloFrame({
  label,
  accent,
  children,
}: {
  label: string;
  accent: "amber" | "cyan" | "emerald" | "violet";
  children: React.ReactNode;
}) {
  const accentMap = {
    amber: "text-amber-300 bg-amber-300",
    cyan: "text-cyan-300 bg-cyan-300",
    emerald: "text-emerald-300 bg-emerald-300",
    violet: "text-violet-300 bg-violet-300",
  } as const;
  const [text, dot] = accentMap[accent].split(" ");
  return (
    <ScrollReveal>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#05080f]/70 p-4 backdrop-blur-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${dot} animate-pulse`} />
            <p className={`text-[10px] uppercase tracking-[0.3em] ${text}`}>{label}</p>
          </div>
          <span className="font-mono text-[9px] text-white/35">LIVE · 24/7</span>
        </div>
        {children}
        <Corners />
      </div>
    </ScrollReveal>
  );
}

function RiskHeatmap() {
  const cells = Array.from({ length: 48 });
  return (
    <div className="grid grid-cols-8 gap-[3px]">
      {cells.map((_, i) => {
        const r = (Math.sin(i * 1.7) + Math.cos(i * 0.9) + 2) / 4; // 0..1
        const color =
          r > 0.75
            ? "bg-red-500/80"
            : r > 0.55
            ? "bg-amber-400/70"
            : r > 0.35
            ? "bg-yellow-300/40"
            : "bg-emerald-400/25";
        return (
          <span
            key={i}
            className={`aspect-square rounded-sm ${color}`}
            style={{ animation: `pulse 2.${i % 9}s ease-in-out ${(i % 12) * 0.08}s infinite` }}
          />
        );
      })}
    </div>
  );
}

function RevenueProjection() {
  const pts = [12, 18, 16, 24, 28, 26, 34, 40, 46, 52, 60, 72];
  const max = Math.max(...pts);
  const path = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * 100;
      const y = 100 - (v / max) * 90;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const area = `${path} L 100 100 L 0 100 Z`;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rev-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(34,211,238)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="rgb(34,211,238)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[20, 40, 60, 80].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
      ))}
      <path d={area} fill="url(#rev-fill)" />
      <path d={path} fill="none" stroke="rgb(125,211,252)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((v, i) => {
        const x = (i / (pts.length - 1)) * 100;
        const y = 100 - (v / max) * 90;
        return <circle key={i} cx={x} cy={y} r="0.9" fill="rgb(186,230,253)" />;
      })}
    </svg>
  );
}

function OpportunityRadar() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[180px]">
      {[0.3, 0.55, 0.8, 1].map((s, i) => (
        <span
          key={i}
          className="absolute inset-0 m-auto rounded-full border border-emerald-300/25"
          style={{ width: `${s * 100}%`, height: `${s * 100}%` }}
        />
      ))}
      <span className="absolute inset-0 h-px w-full top-1/2 bg-emerald-300/15" />
      <span className="absolute inset-0 w-px h-full left-1/2 bg-emerald-300/15" />
      {/* Sweep */}
      <div
        className="absolute inset-0 origin-center rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(52,211,153,0.45) 0deg, rgba(52,211,153,0) 90deg, transparent 360deg)",
          animation: "spin 4s linear infinite",
          maskImage: "radial-gradient(circle, #000 65%, transparent 70%)",
        }}
      />
      {/* Blips */}
      {[
        { x: 30, y: 35, d: 0 },
        { x: 70, y: 28, d: 0.6 },
        { x: 58, y: 62, d: 1.2 },
        { x: 38, y: 70, d: 1.8 },
        { x: 75, y: 55, d: 2.4 },
      ].map((b, i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
          style={{ left: `${b.x}%`, top: `${b.y}%`, animation: `pulse 2s ease-in-out ${b.d}s infinite` }}
        />
      ))}
      <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-emerald-200 shadow-[0_0_12px_rgba(167,243,208,0.9)]" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE 06 — PREDICTIVE INTELLIGENCE
   ═════════════════════════════════════════════════════════ */
function PredictiveScene({ isAr }: { isAr: boolean }) {
  const scenarios = isAr
    ? [
        { t: "إذا ارتفعت المخاطر", d: "تعيد المدينة الرسم خلال ثوانٍ." },
        { t: "إذا تأخر مشروع", d: "ينبه ARIA وينصح بإعادة التخصيص." },
        { t: "إذا زادت الميزانية", d: "محاكاة لحظية للأثر على KPIs." },
      ]
    : [
        { t: "If risk rises", d: "The city redraws itself in seconds." },
        { t: "If a project slips", d: "ARIA flags it and proposes reallocation." },
        { t: "If budget shifts", d: "Live simulation across every KPI." },
      ];
  return (
    <section
      data-scene="6"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-gradient-to-b from-[#04060d] via-[#070b1d] to-[#04060d] py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_70%,rgba(167,139,250,0.12),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(245,180,84,0.1),transparent_55%)]" />
      <ParticleField density={0.00007} />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-5">
        <ScrollReveal>
          <p className="text-xs uppercase tracking-[0.35em] text-violet-300/80">{isAr ? "المشهد ٠٦ · الذكاء التنبؤي" : "Scene 06 · Predictive Intelligence"}</p>
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <h2 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            {isAr ? "نرى الغد." : "We see tomorrow."}<br />
            <span className="text-white/40">{isAr ? "قبل أن يأتي." : "Before it arrives."}</span>
          </h2>
        </ScrollReveal>

        <div className="mt-20 space-y-10">
          {scenarios.map((s, i) => (
            <ScrollReveal key={s.t} delay={i * 150} direction={i % 2 ? "right" : "left"}>
              <div className="group grid grid-cols-[80px_1fr] items-baseline gap-6 border-b border-white/10 pb-8 sm:grid-cols-[140px_1fr]">
                <div className="font-mono text-3xl font-light text-amber-300/60 sm:text-5xl">
                  0{i + 1}
                </div>
                <div>
                  <div className="text-2xl font-semibold text-white sm:text-3xl">{s.t}</div>
                  <div className="mt-2 text-base text-white/60 sm:text-lg">{s.d}</div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE 07 — ROI TRANSFORMATION
   ═════════════════════════════════════════════════════════ */
function RoiScene({ isAr }: { isAr: boolean }) {
  // Live investor-grade business simulation.
  const [employees, setEmployees] = useState(1200);
  const [projects, setProjects] = useState(48);
  const [revenue, setRevenue] = useState(180); // SAR millions / year
  const [departments, setDepartments] = useState(12);
  const [opCosts, setOpCosts] = useState(120); // SAR millions / year — operational baseline

  // Derived impact model — designed to feel responsive and grounded.
  const sim = useMemo(() => {
    const empF = Math.log10(employees + 10) / 3.2;          // 0..~1.3
    const projF = Math.min(projects / 80, 1.4);
    const deptF = Math.min(departments / 20, 1.3);
    const revF = Math.min(revenue / 500, 1.6);
    const costF = Math.min(opCosts / Math.max(revenue, 1), 1.4); // cost intensity
    const scale = (empF + projF + deptF) / 3;

    // The heavier the op-cost base, the larger the absolute savings opportunity.
    const costReduction = Math.min(0.46, 0.18 + scale * 0.22 + costF * 0.05);
    const efficiency    = Math.min(0.82, 0.32 + scale * 0.42 + costF * 0.05);
    const riskReduction = Math.min(0.74, 0.28 + scale * 0.36);
    const revenueGrowth = Math.min(0.46, 0.12 + scale * 0.22 + revF * 0.06);

    const annualSavings  = opCosts * costReduction;            // SAR M — applied to op-costs base
    const newRevenue     = revenue * revenueGrowth;            // SAR M
    const hoursSaved     = Math.round(employees * 6.4 * efficiency);
    const decisionsAuto  = Math.round(projects * departments * 2.6);

    const investment = 2.4 + departments * 0.18 + employees * 0.0009; // SAR M / yr
    const totalImpact = annualSavings + newRevenue;
    const roi = ((totalImpact - investment) / investment) * 100;
    const payback = Math.max(1, Math.round((investment / Math.max(totalImpact, 0.1)) * 12));

    return {
      costReduction, efficiency, riskReduction, revenueGrowth,
      annualSavings, newRevenue, hoursSaved, decisionsAuto,
      investment, totalImpact, roi, payback,
    };
  }, [employees, projects, revenue, departments, opCosts]);

  const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const fmtM   = (n: number) => `SAR ${n.toFixed(1)}M`;
  const fmtN   = (n: number) => n.toLocaleString(isAr ? "ar-SA" : "en-US");

  const sliders: {
    id: string; label: string; value: number; set: (v: number) => void;
    min: number; max: number; step: number; suffix?: string;
  }[] = [
    { id: "emp", label: isAr ? "الموظفون"        : "Employees",         value: employees,   set: setEmployees,   min: 50,  max: 25000, step: 50 },
    { id: "prj", label: isAr ? "المشاريع"         : "Projects",          value: projects,    set: setProjects,    min: 5,   max: 400,   step: 1  },
    { id: "dep", label: isAr ? "الأقسام"          : "Departments",       value: departments, set: setDepartments, min: 2,   max: 40,    step: 1  },
    { id: "rev", label: isAr ? "الإيراد السنوي"    : "Annual Revenue",    value: revenue,     set: setRevenue,     min: 10,  max: 2000,  step: 5,  suffix: "M SAR" },
    { id: "cst", label: isAr ? "التكاليف التشغيلية" : "Operational Costs", value: opCosts,     set: setOpCosts,     min: 5,   max: 1500,  step: 5,  suffix: "M SAR" },
  ];

  const impacts = [
    { l: isAr ? "خفض التكاليف"      : "Cost Reduction",  v: fmtPct(sim.costReduction), tone: "amber"   },
    { l: isAr ? "كفاءة تشغيلية"    : "Operational Efficiency", v: fmtPct(sim.efficiency), tone: "cyan" },
    { l: isAr ? "خفض المخاطر"      : "Risk Reduction",   v: fmtPct(sim.riskReduction), tone: "rose"   },
    { l: isAr ? "نمو الإيرادات"    : "Revenue Growth",   v: fmtPct(sim.revenueGrowth), tone: "emerald" },
  ];

  const toneClass: Record<string, string> = {
    amber:   "from-amber-200 via-amber-300 to-amber-500",
    cyan:    "from-cyan-200  via-cyan-300  to-cyan-500",
    rose:    "from-rose-200  via-rose-300  to-rose-500",
    emerald: "from-emerald-200 via-emerald-300 to-emerald-500",
  };

  return (
    <section
      data-scene="7"
      className="relative flex min-h-[120svh] items-center overflow-hidden bg-[#04060d] py-24 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(245,180,84,0.10),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_90%,rgba(92,189,255,0.08),transparent_55%)]" />
      <ParticleField density={0.0001} />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5">
        <ScrollReveal>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.5em] text-amber-300/80 sm:text-xs">
              {isAr ? "المشهد ٠٧ · محرّك العائد" : "Scene 07 · ROI Engine"}
            </p>
            <h2 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              {isAr ? "حرّك الأرقام. شاهد المؤسسة تتحوّل." : "Move the numbers. Watch the enterprise transform."}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-white/55 sm:text-base">
              {isAr
                ? "محاكاة استثمارية حيّة — كل مدخل يعيد حساب الأثر فوراً عبر التكاليف، المخاطر، الكفاءة، والنمو."
                : "A live investor-grade simulation — every input instantly recalculates impact across cost, risk, efficiency and growth."}
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-5">
          {/* Controls */}
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-6 backdrop-blur-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.32em] text-white/55">
                {isAr ? "متغيّرات الأعمال" : "Business Variables"}
              </span>
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-emerald-300/85">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {isAr ? "حيّة" : "Live"}
              </span>
            </div>
            <div className="space-y-5">
              {sliders.map((s) => (
                <div key={s.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <label htmlFor={s.id} className="text-white/75">{s.label}</label>
                    <span className="font-semibold tabular-nums text-amber-200">
                      {fmtN(s.value)}{s.suffix ? ` ${s.suffix}` : ""}
                    </span>
                  </div>
                  <input
                    id={s.id}
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={s.value}
                    onChange={(e) => s.set(Number(e.target.value))}
                    className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-amber-300
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-300
                               [&::-webkit-slider-thumb]:shadow-[0_0_18px_rgba(245,180,84,0.65)]
                               [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full
                               [&::-moz-range-thumb]:bg-amber-300 [&::-moz-range-thumb]:border-0"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 text-[11px]">
              <div>
                <div className="uppercase tracking-[0.28em] text-white/45">{isAr ? "ساعات موفّرة/شهرياً" : "Hours saved / mo"}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-white">{fmtN(sim.hoursSaved)}</div>
              </div>
              <div>
                <div className="uppercase tracking-[0.28em] text-white/45">{isAr ? "قرارات مؤتمتة" : "Decisions automated"}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-white">{fmtN(sim.decisionsAuto)}</div>
              </div>
            </div>
          </div>

          {/* Impact dashboard */}
          <div className="lg:col-span-3">
            <div className="grid gap-4 sm:grid-cols-2">
              {impacts.map((m) => {
                const pct = parseFloat(m.v);
                return (
                  <div
                    key={m.l}
                    className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-white/55">{m.l}</span>
                    </div>
                    <div className={`mt-2 bg-gradient-to-br ${toneClass[m.tone]} bg-clip-text text-4xl font-bold tabular-nums tracking-tight text-transparent sm:text-5xl`}>
                      {m.v}
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${toneClass[m.tone]} transition-[width] duration-500 ease-out`}
                        style={{ width: `${Math.min(100, pct * 1.6)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Headline ROI */}
            <div className="mt-5 overflow-hidden rounded-xl border border-amber-300/30 bg-gradient-to-br from-amber-500/10 via-transparent to-cyan-500/10 p-6">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.35em] text-amber-200/85">
                    {isAr ? "العائد على الاستثمار · سنوياً" : "Annualised ROI"}
                  </div>
                  <div className="mt-2 bg-gradient-to-br from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-6xl font-bold tabular-nums tracking-tight text-transparent sm:text-7xl">
                    {sim.roi.toFixed(0)}%
                  </div>
                  <div className="mt-1 text-xs text-white/55">
                    {isAr ? `استرداد خلال ${sim.payback} شهر` : `Payback in ${sim.payback} months`}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-5 text-right rtl:text-left">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">{isAr ? "وفورات" : "Savings"}</div>
                    <div className="mt-1 text-base font-semibold tabular-nums text-white">{fmtM(sim.annualSavings)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">{isAr ? "إيراد جديد" : "New Revenue"}</div>
                    <div className="mt-1 text-base font-semibold tabular-nums text-white">{fmtM(sim.newRevenue)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">{isAr ? "استثمار" : "Investment"}</div>
                    <div className="mt-1 text-base font-semibold tabular-nums text-white">{fmtM(sim.investment)}</div>
                  </div>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-cyan-300 transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.min(100, sim.roi / 8)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE 08 — GLOBAL EXPANSION
   ═════════════════════════════════════════════════════════ */
function GlobalScene({ isAr }: { isAr: boolean }) {
  return (
    <section
      data-scene="8"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-black"
    >
      <Parallax strength={140} className="absolute inset-0">
        <img
          src={cinematicEarth}
          alt=""
          loading="lazy"
          width={1920}
          height={1080}
          className="h-full w-full scale-110 object-cover opacity-40"
        />
      </Parallax>
      <div className="pointer-events-none absolute inset-0 opacity-90 mix-blend-screen">
        <Suspense fallback={null}><EarthScene intensity="network" /></Suspense>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#04060d] via-[#04060d]/40 to-transparent" />
      <ParticleField density={0.00008} />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-32">
        <div className="max-w-2xl">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">{isAr ? "المشهد ٠٨ · التوسّع" : "Scene 08 · Global Expansion"}</p>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <h2 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              {isAr ? "سوق عالمي." : "A global market."}<br />
              <span className="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
                {isAr ? "تحوّل رقمي." : "A digital transformation."}
              </span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={400}>
            <p className="mt-6 max-w-xl text-lg text-white/70">
              {isAr
                ? "الحكومات تتبنّى. المؤسسات تستثمر. المنطقة تتحوّل. نكسس في المركز."
                : "Governments adopt. Enterprises invest. A region transforms. Nexus sits at the center."}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={550}>
            <div className="mt-14 flex flex-wrap gap-x-10 gap-y-5">
              {[
                { v: "$120B+", l: isAr ? "سوق التحوّل الرقمي" : "Digital transformation TAM" },
                { v: "GCC + MENA", l: isAr ? "النشر الأولي" : "Launch region" },
                { v: "Gov · Enterprise", l: isAr ? "القطاعات المستهدفة" : "Target verticals" },
              ].map((x) => (
                <div key={x.l}>
                  <div className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{x.v}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">{x.l}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE 09 — INVESTOR FILMS
   ═════════════════════════════════════════════════════════ */
function FilmsScene({ isAr }: { isAr: boolean }) {
  const films = isAr
    ? [
        { t: "الفيلم الاستثماري", d: "العربي + الإنجليزي · 4:32", img: cinematicCity },
        { t: "ARIA & التوأم الرقمي", d: "العقل التنفيذي · 2:44", img: cinematicEarth },
        { t: "تجربة قاعة المجلس", d: "موجزات تنفيذية · 3:50", img: cinematicBoardroom },
      ]
    : [
        { t: "Investor Film", d: "Arabic + English · 4:32", img: cinematicCity },
        { t: "ARIA & Digital Twin", d: "The executive mind · 2:44", img: cinematicEarth },
        { t: "Boardroom Experience", d: "Executive briefings · 3:50", img: cinematicBoardroom },
      ];
  return (
    <section
      data-scene="9"
      className="relative overflow-hidden bg-[#04060d] py-32"
    >
      <ParticleField density={0.00005} />
      <div className="mx-auto max-w-7xl px-5">
        <ScrollReveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">{isAr ? "المشهد ٠٩ · مركز الأفلام" : "Scene 09 · Film Center"}</p>
              <h2 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
                {isAr ? "أفلام بمستوى Keynote." : "Films at Keynote standard."}
              </h2>
            </div>
            <Link
              to="/films"
              className="group inline-flex items-center gap-2 text-sm font-medium text-amber-300 transition hover:text-amber-200"
            >
              {isAr ? "افتح المركز" : "Open the center"}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/5 sm:grid-cols-3">
          {films.map((f, i) => (
            <ScrollReveal key={f.t} delay={i * 120}>
              <Link
                to="/films"
                className="group relative block aspect-[4/5] overflow-hidden bg-[#04060d]"
              >
                <img
                  src={f.img}
                  alt=""
                  loading="lazy"
                  width={1920}
                  height={2400}
                  className="absolute inset-0 h-full w-full scale-105 object-cover opacity-70 transition duration-700 group-hover:scale-110 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-[#04060d]/30 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/40 backdrop-blur-md transition group-hover:scale-110">
                    <Play className="h-7 w-7 fill-white text-white" />
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="text-lg font-semibold text-white">{f.t}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/55">{f.d}</div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE 10 — FINAL REVEAL
   ═════════════════════════════════════════════════════════ */
function FinalRevealScene({ isAr }: { isAr: boolean }) {
  // 18 light streams converging to the logo origin from every direction.
  const streams = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    return {
      a,
      x: Math.cos(a) * 60, // vw offset
      y: Math.sin(a) * 60,
      delay: (i % 6) * 0.18,
    };
  });

  return (
    <section
      data-scene="10"
      className="relative flex min-h-[120svh] items-center justify-center overflow-hidden bg-black"
    >
      {/* SUNRISE EARTH HORIZON — unique to this scene (no reused Earth image) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* deep space gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(245,180,84,0.55)_0%,rgba(184,84,32,0.25)_18%,rgba(20,30,80,0.45)_38%,#02030a_70%)]" />
        {/* atmospheric haze band */}
        <div className="absolute inset-x-[-20%] bottom-[18%] h-[26%] bg-gradient-to-t from-amber-400/35 via-rose-300/20 to-transparent blur-2xl" />
        {/* sun corona */}
        <div
          className="absolute left-1/2 bottom-[6%] h-[420px] w-[420px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,243,196,0.95) 0%, rgba(245,180,84,0.55) 30%, rgba(245,140,60,0.18) 55%, transparent 75%)",
            animation: "nx-core 5s ease-in-out infinite",
            filter: "blur(6px)",
          }}
        />
        {/* earth curvature horizon */}
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-full w-full">
          <defs>
            <radialGradient id="earthRim" cx="50%" cy="100%" r="80%">
              <stop offset="0%" stopColor="rgba(245,180,84,0.9)" />
              <stop offset="22%" stopColor="rgba(180,90,40,0.5)" />
              <stop offset="55%" stopColor="rgba(8,12,30,0.95)" />
              <stop offset="100%" stopColor="#02030a" />
            </radialGradient>
            <radialGradient id="atmoGlow" cx="50%" cy="100%" r="70%">
              <stop offset="0%" stopColor="rgba(120,180,255,0.35)" />
              <stop offset="40%" stopColor="rgba(60,90,200,0.12)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          {/* atmosphere glow */}
          <ellipse cx="800" cy="1080" rx="1400" ry="380" fill="url(#atmoGlow)" />
          {/* earth body */}
          <ellipse cx="800" cy="1180" rx="1300" ry="340" fill="url(#earthRim)" />
          {/* horizon thin glow line */}
          <ellipse cx="800" cy="840" rx="1300" ry="3" fill="rgba(255,220,160,0.85)" />
          <ellipse cx="800" cy="840" rx="1300" ry="10" fill="rgba(245,180,84,0.35)" filter="blur(6px)" />
        </svg>

        {/* GLOBAL DATA NETWORK — meridian arcs */}
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full opacity-70">
          {[0, 1, 2, 3, 4].map((i) => {
            const ry = 380 + i * 60;
            const op = 0.5 - i * 0.07;
            return (
              <ellipse
                key={`arc-${i}`}
                cx="800"
                cy="1180"
                rx={1300 - i * 40}
                ry={ry}
                fill="none"
                stroke="rgba(180,210,255,0.5)"
                strokeWidth="0.8"
                strokeDasharray="2 6"
                opacity={op}
              >
                <animate attributeName="stroke-dashoffset" values="0;-32" dur={`${10 + i * 2}s`} repeatCount="indefinite" />
              </ellipse>
            );
          })}
          {/* travelling data pings */}
          {[120, 380, 720, 1080, 1380].map((cx, i) => (
            <circle key={`p-${i}`} cx={cx} cy="820" r="2.5" fill="#9ec8ff">
              <animate attributeName="opacity" values="0;1;0" dur={`${2.4 + i * 0.4}s`} repeatCount="indefinite" />
              <animate attributeName="cy" values="820;780;820" dur={`${2.4 + i * 0.4}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </svg>

        {/* sun rays */}
        {[-30, -15, 0, 15, 30].map((rot, i) => (
          <div
            key={`ray-${i}`}
            className="absolute left-1/2 bottom-[10%] h-[80vh] w-[140px] origin-bottom -translate-x-1/2 opacity-60"
            style={{
              transform: `translateX(-50%) rotate(${rot}deg)`,
              background: "linear-gradient(to top, rgba(255,220,160,0.35), rgba(245,180,84,0.08) 40%, transparent 75%)",
              filter: "blur(18px)",
              animation: `hero-beam ${6 + i}s ease-in-out ${i * 0.5}s infinite alternate`,
            }}
          />
        ))}
      </div>

      <ParticleField density={0.00010} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      {/* ARIA CORE ACTIVATION — converging light forms the lockup origin */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {streams.map((s, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-[2px] w-[60vmax] origin-left rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgba(245,180,84,0) 0%, rgba(245,180,84,0.9) 70%, rgba(255,255,255,1) 100%)",
              transform: `translate(-100%, -50%) rotate(${(s.a * 180) / Math.PI}deg)`,
              animation: `nx-stream 4.6s cubic-bezier(.22,.61,.36,1) ${s.delay}s infinite`,
              opacity: 0,
            }}
          />
        ))}
        {/* concentric rings exhaling outward */}
        {[0, 1, 2, 3].map((i) => (
          <span
            key={`r${i}`}
            className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/40"
            style={{ animation: `nx-ring 5.6s ease-out ${i * 0.9}s infinite` }}
          />
        ))}
        {/* core flare */}
        <span
          className="absolute left-1/2 top-1/2 h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,243,196,0.95) 0%, rgba(245,180,84,0.55) 35%, rgba(245,180,84,0) 70%)",
            animation: "nx-core 3.4s ease-in-out infinite",
            filter: "blur(2px)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-5 text-center">
        <ScrollReveal>
          <p className="text-[10px] uppercase tracking-[0.5em] text-amber-300/80 sm:text-xs">
            {isAr ? "المشهد ١٠ · الكشف" : "Scene 10 · The Reveal"}
          </p>
        </ScrollReveal>

        {/* Logo lockup, formed from light */}
        <ScrollReveal delay={150}>
          <div className="mt-10">
            <div
              className="bg-gradient-to-br from-white via-amber-100 to-amber-400 bg-clip-text text-7xl font-bold leading-[0.92] tracking-[-0.04em] text-transparent sm:text-9xl"
              style={{
                animation: "nx-lockup 3.2s cubic-bezier(.22,.61,.36,1) both",
                textShadow: "0 0 60px rgba(245,180,84,0.35)",
              }}
            >
              NEXUS
            </div>
            <div
              className="mt-2 text-xs uppercase tracking-[0.7em] text-white/65 sm:text-sm"
              style={{ animation: "nx-fade 2s ease-out 1.4s both" }}
            >
              AI&nbsp;·&nbsp;OS
            </div>
            <div
              className="mx-auto mt-6 h-px w-40 bg-gradient-to-r from-transparent via-amber-300/80 to-transparent"
              style={{ animation: "nx-line 1.8s ease-out 1.2s both" }}
            />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={500}>
          <h2 className="mt-10 text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            {isAr ? (
              <>
                <span className="block text-white/90">المستقبل ذكي.</span>
                <span className="mt-1 block bg-gradient-to-br from-amber-200 to-amber-500 bg-clip-text text-transparent">
                  المستقبل نكسس.
                </span>
              </>
            ) : (
              <>
                <span className="block text-white/90">The future is intelligent.</span>
                <span className="mt-1 block bg-gradient-to-br from-amber-200 to-amber-500 bg-clip-text text-transparent">
                  The future is Nexus.
                </span>
              </>
            )}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-white/60 sm:text-lg">
            {isAr ? "شبكة ذكاء عالمية. نظام تشغيل واحد." : "A global intelligence network. One operating system."}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/request-demo"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-7 py-3.5 text-sm font-semibold text-black shadow-[0_10px_60px_-10px_rgba(245,180,84,0.9)] transition hover:scale-[1.03]"
            >
              {isAr ? "ابدأ مع نكسس" : "Begin with Nexus"}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
            >
              {isAr ? "للمؤسسات" : "Talk to enterprise"}
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.35em] text-white/35">
            <span>{isAr ? "للمؤسسات" : "Enterprise"}</span>
            <span>·</span>
            <span>{isAr ? "للحكومات" : "Government"}</span>
            <span>·</span>
            <span>{isAr ? "للمستثمرين" : "Investors"}</span>
            <span>·</span>
            <span>Fortune 500</span>
          </div>
        </ScrollReveal>
      </div>

      <style>{`
        @keyframes nx-stream {
          0%   { opacity: 0; transform: translate(-100%,-50%) rotate(var(--r,0deg)) scaleX(0.2); }
          40%  { opacity: 1; }
          75%  { opacity: 0.9; transform: translate(-100%,-50%) rotate(var(--r,0deg)) scaleX(1); }
          100% { opacity: 0; transform: translate(-100%,-50%) rotate(var(--r,0deg)) scaleX(1); }
        }
        @keyframes nx-ring {
          0%   { opacity: 0.85; transform: translate(-50%,-50%) scale(0.2); }
          80%  { opacity: 0;    transform: translate(-50%,-50%) scale(3.6); }
          100% { opacity: 0;    transform: translate(-50%,-50%) scale(3.6); }
        }
        @keyframes nx-core {
          0%,100% { opacity: 0.55; transform: translate(-50%,-50%) scale(0.85); }
          50%     { opacity: 1;    transform: translate(-50%,-50%) scale(1.15); }
        }
        @keyframes nx-lockup {
          0%   { opacity: 0; letter-spacing: 0.6em; filter: blur(18px); transform: translateY(10px); }
          60%  { opacity: 1; letter-spacing: -0.02em; filter: blur(0);  }
          100% { opacity: 1; letter-spacing: -0.04em; filter: blur(0); transform: translateY(0); }
        }
        @keyframes nx-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes nx-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      `}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   HERO HOLO PANELS — Reference B side dashboards as holograms
   ═════════════════════════════════════════════════════════ */
function HeroHoloPanels({ isAr }: { isAr: boolean }) {
  const left = isAr
    ? [
        { label: "الإيرادات الكلية", value: "SAR 45.2M", delta: "+12.5%", tone: "amber" as const },
        { label: "كفاءة العمليات", value: "88%", delta: "+3.4%", tone: "cyan" as const },
      ]
    : [
        { label: "Total Revenue", value: "SAR 45.2M", delta: "+12.5%", tone: "amber" as const },
        { label: "Operational Efficiency", value: "88%", delta: "+3.4%", tone: "cyan" as const },
      ];
  const right = isAr
    ? [
        { label: "صافي الربح", value: "SAR 11.7M", delta: "+8.3%", tone: "amber" as const },
        { label: "تنبيهات المخاطر", value: "23", delta: isAr ? "نشطة" : "Active", tone: "red" as const },
      ]
    : [
        { label: "Net Profit", value: "SAR 11.7M", delta: "+8.3%", tone: "amber" as const },
        { label: "Risk Alerts", value: "23", delta: "Active", tone: "red" as const },
      ];
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] hidden lg:block">
      <div className="absolute left-6 top-1/2 flex -translate-y-1/2 flex-col gap-5 xl:left-12">
        {left.map((p, i) => <HoloPanel key={i} {...p} side="left" delay={i * 150} />)}
      </div>
      <div className="absolute right-6 top-1/2 flex -translate-y-1/2 flex-col gap-5 xl:right-12">
        {right.map((p, i) => <HoloPanel key={i} {...p} side="right" delay={i * 150 + 80} />)}
      </div>
    </div>
  );
}

function HoloPanel({
  label, value, delta, tone, side, delay,
}: {
  label: string; value: string; delta: string; tone: "amber" | "cyan" | "red"; side: "left" | "right"; delay: number;
}) {
  const toneRing = { amber: "border-amber-300/40 shadow-[0_0_60px_-15px_rgba(245,180,84,0.6)]", cyan: "border-cyan-300/40 shadow-[0_0_60px_-15px_rgba(58,142,255,0.6)]", red: "border-red-400/40 shadow-[0_0_60px_-15px_rgba(255,80,80,0.55)]" }[tone];
  const toneText = { amber: "text-amber-300", cyan: "text-cyan-300", red: "text-red-400" }[tone];
  return (
    <div
      className={`w-[220px] animate-fade-in rounded-2xl border ${toneRing} bg-white/[0.04] px-4 py-3 backdrop-blur-xl ${side === "left" ? "" : "text-right"}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="text-[9px] uppercase tracking-[0.28em] text-white/55">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-white">{value}</div>
      <div className={`mt-1 text-[11px] font-semibold ${toneText}`}>{delta}</div>
      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full w-2/3 rounded-full ${tone === "amber" ? "bg-gradient-to-r from-amber-300 to-amber-500" : tone === "cyan" ? "bg-gradient-to-r from-cyan-300 to-blue-500" : "bg-gradient-to-r from-red-400 to-red-600"}`} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TWIN HOLO LABELS — Reference A floating district chips
   ═════════════════════════════════════════════════════════ */
export function TwinHoloLabels({ isAr }: { isAr: boolean }) {
  const labels = isAr
    ? [
        { t: "بحيرة البيانات", v: "1.4 تيرابايت", dot: "bg-emerald-400", pos: "top-[14%] left-[8%]" },
        { t: "الأقسام", v: "24 نشط", dot: "bg-cyan-400", pos: "top-[22%] right-[10%]" },
        { t: "وكلاء الذكاء", v: "48 نشط", dot: "bg-violet-400", pos: "top-[52%] left-[6%]" },
        { t: "الأتمتة", v: "342 تشغيل", dot: "bg-amber-400", pos: "bottom-[22%] right-[8%]" },
        { t: "إشارة فرصة", v: "صفقة 2.4M ريال", dot: "bg-amber-300", pos: "bottom-[14%] left-[12%]" },
      ]
    : [
        { t: "Data Lake", v: "1.4 TB", dot: "bg-emerald-400", pos: "top-[14%] left-[8%]" },
        { t: "Districts", v: "24 active", dot: "bg-cyan-400", pos: "top-[22%] right-[10%]" },
        { t: "AI Agents", v: "48 live", dot: "bg-violet-400", pos: "top-[52%] left-[6%]" },
        { t: "Automations", v: "342 running", dot: "bg-amber-400", pos: "bottom-[22%] right-[8%]" },
        { t: "Opportunity", v: "Deal · 2.4M SAR", dot: "bg-amber-300", pos: "bottom-[14%] left-[12%]" },
      ];
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] hidden md:block">
      {labels.map((l, i) => (
        <div
          key={i}
          className={`absolute ${l.pos} animate-fade-in rounded-full border border-white/15 bg-[#04060d]/70 px-4 py-2 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(58,142,255,0.5)]`}
          style={{ animationDelay: `${i * 150}ms`, animationFillMode: "both" }}
        >
          <div className="flex items-center gap-2.5">
            <span className={`relative flex h-2 w-2 ${l.dot} rounded-full`}>
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${l.dot} opacity-70`} />
            </span>
            <div className="leading-tight">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/55">{l.t}</div>
              <div className="text-xs font-semibold text-white">{l.v}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TWIN ACTIVITY FEED — live signals streaming on the right
   ═════════════════════════════════════════════════════════ */
function TwinActivityFeed({ isAr }: { isAr: boolean }) {
  const items = isAr
    ? [
        { t: "↑", txt: "وكيل المبيعات أغلق صفقة 2.4M ريال", tone: "text-amber-300", dot: "bg-amber-400" },
        { t: "⚠", txt: "ارتفاع مخاطر سلسلة الإمداد · حي اللوجستيات", tone: "text-red-400", dot: "bg-red-500" },
        { t: "✓", txt: "أتمتة الفواتير اكتملت · 1,284 معاملة", tone: "text-emerald-300", dot: "bg-emerald-400" },
        { t: "◎", txt: "ARIA: توصية بإعادة التخصيص — حي المنتجات", tone: "text-violet-300", dot: "bg-violet-400" },
        { t: "↗", txt: "كفاءة العمليات +3.4% خلال آخر ساعة", tone: "text-cyan-300", dot: "bg-cyan-400" },
        { t: "⬡", txt: "مشروع جديد قيد الإنشاء · حي البحث والتطوير", tone: "text-amber-200", dot: "bg-amber-300" },
      ]
    : [
        { t: "↑", txt: "Sales agent closed deal · 2.4M SAR", tone: "text-amber-300", dot: "bg-amber-400" },
        { t: "⚠", txt: "Supply-chain risk rising · Logistics district", tone: "text-red-400", dot: "bg-red-500" },
        { t: "✓", txt: "Invoice automation complete · 1,284 txns", tone: "text-emerald-300", dot: "bg-emerald-400" },
        { t: "◎", txt: "ARIA: reallocation recommended · Products district", tone: "text-violet-300", dot: "bg-violet-400" },
        { t: "↗", txt: "Ops efficiency +3.4% in the last hour", tone: "text-cyan-300", dot: "bg-cyan-400" },
        { t: "⬡", txt: "New project under construction · R&D district", tone: "text-amber-200", dot: "bg-amber-300" },
      ];
  return (
    <aside className="pointer-events-none absolute right-6 top-32 z-[5] hidden w-[280px] xl:block">
      <div className="rounded-2xl border border-white/10 bg-[#04060d]/70 p-4 backdrop-blur-xl shadow-[0_0_60px_-20px_rgba(58,142,255,0.55)]">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/55">{isAr ? "تيار الإشارات · مباشر" : "Signal Feed · Live"}</div>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 animate-fade-in"
              style={{ animationDelay: `${i * 220}ms`, animationFillMode: "both" }}
            >
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${it.dot}`} />
              <div className="min-w-0">
                <span className={`text-[10px] font-bold ${it.tone}`}>{it.t}</span>
                <span className="ml-1.5 text-[11px] leading-snug text-white/80">{it.txt}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════
   TWIN DISTRICT ROSTER — left rail
   ═════════════════════════════════════════════════════════ */
function TwinDistrictRoster({ isAr }: { isAr: boolean }) {
  const districts = isAr
    ? [
        { n: "المقر التنفيذي",     health: 99, tone: "bg-white",         note: "HQ · ARIA" },
        { n: "حي المالية",           health: 96, tone: "bg-emerald-400",  note: "SAR 1.8B AUM" },
        { n: "حي العمليات",          health: 88, tone: "bg-cyan-400",     note: "98.4% uptime" },
        { n: "الخدمات اللوجستية",     health: 64, tone: "bg-red-400",      note: "3 risks · open" },
        { n: "حي الابتكار",          health: 81, tone: "bg-violet-400",   note: "12 R&D builds" },
        { n: "حي الجهات الحكومية",   health: 92, tone: "bg-amber-400",    note: "Vision 2030" },
        { n: "أبراج بحيرات البيانات", health: 94, tone: "bg-sky-300",      note: "8 lakes · live" },
        { n: "مناطق وكلاء الذكاء",   health: 90, tone: "bg-fuchsia-400",  note: "48 agents" },
      ]
    : [
        { n: "Executive HQ",       health: 99, tone: "bg-white",        note: "HQ · ARIA core" },
        { n: "Finance District",   health: 96, tone: "bg-emerald-400", note: "SAR 1.8B AUM" },
        { n: "Operations District", health: 88, tone: "bg-cyan-400",   note: "98.4% uptime" },
        { n: "Logistics District", health: 64, tone: "bg-red-400",     note: "3 risks open" },
        { n: "Innovation District", health: 81, tone: "bg-violet-400", note: "12 R&D builds" },
        { n: "Government District", health: 92, tone: "bg-amber-400",  note: "Vision 2030" },
        { n: "Data Lake Towers",   health: 94, tone: "bg-sky-300",     note: "8 lakes live" },
        { n: "AI Agent Zones",     health: 90, tone: "bg-fuchsia-400", note: "48 agents" },
      ];
  return (
    <aside className="pointer-events-none absolute left-6 top-32 z-[5] hidden w-[260px] xl:block">
      <div className="rounded-2xl border border-white/10 bg-[#04060d]/70 p-4 backdrop-blur-xl shadow-[0_0_60px_-20px_rgba(245,180,84,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-[10px] uppercase tracking-[0.28em] text-white/55">
            {isAr ? "أحياء المؤسسة" : "Enterprise Districts"}
          </span>
          <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.25em] text-emerald-300/85">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            LIVE
          </span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {districts.map((d, i) => (
            <li
              key={d.n}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 110}ms`, animationFillMode: "both" }}
            >
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-white">
                  <span className={`h-1.5 w-1.5 rounded-full ${d.tone}`} />
                  {d.n}
                </span>
                <span className="text-[10px] font-mono tabular-nums text-white/55">{d.health}%</span>
              </div>
              <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                <div className={`h-full ${d.tone} rounded-full`} style={{ width: `${d.health}%` }} />
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-white/40">{d.note}</div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
