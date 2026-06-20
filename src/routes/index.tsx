import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { ensureDemoUser, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo.functions";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronDown,
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
      { rel: "preload", as: "image", href: cinematicCity, fetchpriority: "high" } as { rel: string; as: string; href: string; fetchpriority: string },
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
  const navigate = useNavigate();
  const ensureDemo = useServerFn(ensureDemoUser);
  const [demoLoading, setDemoLoading] = useState(false);

  if (loading) {
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

  async function enterDemo() {
    setDemoLoading(true);
    try {
      await ensureDemo({});
      const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(isAr ? "تعذّر فتح العرض" : "Could not start demo");
      console.error(e);
    } finally {
      setDemoLoading(false);
    }
  }

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
            <Link
              to={user ? "/dashboard" : "/login"}
              className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              {user ? (isAr ? "غرفة القيادة" : "Command Center") : (isAr ? "دخول" : "Sign in")}
            </Link>
          </div>
        </div>
      </header>

      {/* Side film-strip indicator (desktop) */}
      <CinematicProgress labels={sceneLabels} total={10} />

      {/* ============ SCENE 01 — EARTH · GLOBAL INTELLIGENCE ============ */}
      <section
        data-scene="1"
        className="relative flex min-h-[100svh] items-center justify-center overflow-hidden"
      >
        <img
          src={cinematicEarth}
          alt=""
          width={1920}
          height={1080}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55"
          fetchPriority="high"
        />
        <div className="pointer-events-none absolute inset-0 opacity-90 mix-blend-screen">
          <Suspense fallback={null}><EarthScene intensity="network" /></Suspense>
        </div>
        <ParticleField density={0.00012} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(58,142,255,0.28),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-[#04060d]" />

        {/* corner telemetry HUD */}
        <div className="pointer-events-none absolute inset-x-5 top-24 z-[5] hidden justify-between text-[10px] uppercase tracking-[0.28em] text-white/45 md:flex">
          <div>{isAr ? "إحداثيات · 24.7°N 46.6°E" : "Coord · 24.7°N 46.6°E"}</div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {isAr ? "الشبكة · مباشرة" : "Network · Live"}
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-32 text-center sm:pt-40">
          <ScrollReveal direction="scale">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-amber-300 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-80" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              {isAr ? "شبكة ذكاء عالمية" : "A Global Intelligence Network"}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <h1 className="mt-8 text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl lg:text-[112px]">
              <span className="block bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
                NEXUS AI OS
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={400}>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-white/80 sm:text-2xl">
              {isAr
                ? "نظام التشغيل الذكي للمؤسسات — ملايين الإشارات. قرار واحد."
                : "The Operating System for Intelligent Enterprises — millions of signals. One decision."}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={600}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/request-demo"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-7 py-3.5 text-sm font-semibold text-black shadow-[0_10px_60px_-10px_rgba(245,180,84,0.9)] transition hover:scale-[1.03]"
              >
                {isAr ? "طلب عرض تنفيذي" : "Request Executive Demo"}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/films"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
              >
                <Play className="h-4 w-4 fill-white" />
                {isAr ? "شاهد الفيلم الاستثماري" : "Watch Investor Film"}
              </Link>
            </div>
            <button
              onClick={enterDemo}
              disabled={demoLoading}
              className="mt-5 text-xs text-white/55 underline-offset-4 transition hover:text-white hover:underline disabled:opacity-50"
            >
              {demoLoading ? (isAr ? "جارٍ..." : "Loading...") : isAr ? "أو افتح بيئة تجريبية مباشرة ←" : "Or enter live demo →"}
            </button>
          </ScrollReveal>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-1 text-white/40">
          <ChevronDown className="h-4 w-4 animate-bounce" />
          <span className="text-[10px] uppercase tracking-[0.35em]">{isAr ? "اكتشف القصة" : "Discover the story"}</span>
        </div>
      </section>

      {/* ============ SCENE 02 — ENTERPRISE DATA CHAOS ============ */}
      <ChaosScene isAr={isAr} />

      {/* ============ SCENE 03 — ARIA AWAKENS ============ */}
      <AriaAwakensScene isAr={isAr} />

      {/* ============ SCENE 04 — DIGITAL TWIN CITY ============ */}
      <TwinCityScene isAr={isAr} />

      {/* ============ SCENE 05 — COMMAND CENTER ============ */}
      <CommandCenterScene isAr={isAr} />

      {/* ============ SCENE 06 — PREDICTIVE INTELLIGENCE ============ */}
      <PredictiveScene isAr={isAr} />

      {/* ============ SCENE 07 — ROI TRANSFORMATION ============ */}
      <RoiScene isAr={isAr} />

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
  return (
    <section
      data-scene="2"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-[#04060d] py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,80,80,0.12),transparent_55%)]" />
      <ChaosCanvas />
      <ParticleField density={0.00006} />

      {/* floating systems orbiting a center */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[520px] w-[520px] max-w-[90vw]">
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
          {/* lines from center */}
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
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="2 4"
                />
              );
            })}
          </svg>
          {/* glowing core */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_60px_rgba(245,180,84,0.7)] animate-pulse" />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-5">
        <ScrollReveal>
          <p className="text-xs uppercase tracking-[0.35em] text-red-400/80">{isAr ? "المشهد ٠٢ · الفوضى" : "Scene 02 · The Chaos"}</p>
          <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            {isAr ? "اثنا عشر نظامًا." : "Twelve systems."}{" "}
            <span className="text-white/40">{isAr ? "صفر معنى." : "Zero meaning."}</span>
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={250}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">
            {isAr
              ? "كل ERP وCRM وExcel وبريد يحمل قطعة من الحقيقة. بدون نواة، تبقى مجرد ضوضاء."
              : "Every ERP, CRM, spreadsheet and inbox holds a fragment of the truth. Without a core, it's just noise."}
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE 03 — ARIA AWAKENS
   ═════════════════════════════════════════════════════════ */
function AriaAwakensScene({ isAr }: { isAr: boolean }) {
  return (
    <section
      data-scene="3"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-black"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(167,139,250,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <Suspense fallback={null}><AriaCore /></Suspense>
      </div>
      <ParticleField density={0.00008} />

      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center">
        <ScrollReveal direction="scale">
          <p className="text-xs uppercase tracking-[0.4em] text-violet-300/80">{isAr ? "المشهد ٠٣ · الاستيقاظ" : "Scene 03 · The Awakening"}</p>
        </ScrollReveal>
        <ScrollReveal delay={250}>
          <h2 className="mt-6 text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            <span className="bg-gradient-to-br from-violet-200 via-white to-amber-200 bg-clip-text text-transparent">
              ARIA
            </span>
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={450}>
          <p className="mt-4 text-lg font-light text-white/75 sm:text-2xl">
            {isAr ? "ذكاء تنفيذي. يستيقظ." : "Executive Intelligence. Awakens."}
          </p>
          <p className="mx-auto mt-6 max-w-xl text-base text-white/55">
            {isAr
              ? "نواة مركزية تسحب كل نظام نحوها — وتتحدث بلغة مجلس الإدارة."
              : "A central nucleus that pulls every system into itself — and speaks the language of the board."}
          </p>
        </ScrollReveal>
      </div>
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

        {/* Executive Decision Engine bar */}
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
        <CountUp end={n} duration={1200} />
        {suffix}
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
  const stats = isAr
    ? [
        { v: "35%", l: "خفض التكاليف" },
        { v: "90%", l: "تسريع التقارير" },
        { v: "10×", l: "تسريع القرار" },
        { v: "24/7", l: "ذكاء تشغيلي" },
      ]
    : [
        { v: "35%", l: "Cost Reduction" },
        { v: "90%", l: "Faster Reporting" },
        { v: "10×", l: "Faster Decisions" },
        { v: "24/7", l: "Operational Intelligence" },
      ];
  return (
    <section
      data-scene="7"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-[#04060d] py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,180,84,0.08),transparent_50%)]" />
      <ParticleField density={0.0001} />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5">
        <ScrollReveal>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">{isAr ? "المشهد ٠٧ · العائد" : "Scene 07 · The Return"}</p>
            <h2 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
              {isAr ? "الأرقام تتحدث." : "The numbers speak."}
            </h2>
          </div>
        </ScrollReveal>

        {/* full-bleed numeric strip, not cards */}
        <div className="mt-20 grid divide-y divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {stats.map((s, i) => (
            <ScrollReveal key={s.l} delay={i * 120} direction="scale">
              <div className="px-6 py-10 text-center">
                <div className="bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 bg-clip-text text-7xl font-bold tracking-tight text-transparent sm:text-8xl">
                  <CountUp value={s.v} />
                </div>
                <div className="mt-4 text-sm uppercase tracking-[0.2em] text-white/60">{s.l}</div>
              </div>
            </ScrollReveal>
          ))}
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
  return (
    <section
      data-scene="10"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-black"
    >
      <img
        src={cinematicEarth}
        alt=""
        loading="lazy"
        width={1920}
        height={1080}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50"
      />
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <Suspense fallback={null}><EarthScene /></Suspense>
      </div>
      <ParticleField density={0.00015} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black" />

      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center">
        <ScrollReveal>
          <p className="text-xs uppercase tracking-[0.4em] text-amber-300/80">{isAr ? "المشهد ١٠ · الكشف" : "Scene 10 · The Reveal"}</p>
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <h2 className="mt-6 text-4xl font-bold leading-[0.98] tracking-tight sm:text-6xl lg:text-8xl">
            {isAr ? (
              <>
                المستقبل ذكي.<br />
                <span className="bg-gradient-to-br from-amber-200 to-amber-500 bg-clip-text text-transparent">
                  المستقبل نكسس.
                </span>
              </>
            ) : (
              <>
                The future is intelligent.<br />
                <span className="bg-gradient-to-br from-amber-200 to-amber-500 bg-clip-text text-transparent">
                  The future is Nexus.
                </span>
              </>
            )}
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={500}>
          <p className="mx-auto mt-6 max-w-xl text-base text-white/65 sm:text-lg">
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
        { n: "المالية", health: 96, tone: "bg-emerald-400" },
        { n: "العمليات", health: 88, tone: "bg-cyan-400" },
        { n: "المبيعات", health: 92, tone: "bg-amber-400" },
        { n: "اللوجستيات", health: 64, tone: "bg-red-400" },
        { n: "البحث والتطوير", health: 81, tone: "bg-violet-400" },
        { n: "الموارد البشرية", health: 90, tone: "bg-emerald-300" },
      ]
    : [
        { n: "Finance", health: 96, tone: "bg-emerald-400" },
        { n: "Operations", health: 88, tone: "bg-cyan-400" },
        { n: "Sales", health: 92, tone: "bg-amber-400" },
        { n: "Logistics", health: 64, tone: "bg-red-400" },
        { n: "R&D", health: 81, tone: "bg-violet-400" },
        { n: "People", health: 90, tone: "bg-emerald-300" },
      ];
  return (
    <aside className="pointer-events-none absolute left-6 top-32 z-[5] hidden w-[240px] xl:block">
      <div className="rounded-2xl border border-white/10 bg-[#04060d]/70 p-4 backdrop-blur-xl shadow-[0_0_60px_-20px_rgba(245,180,84,0.45)]">
        <div className="border-b border-white/10 pb-2 text-[10px] uppercase tracking-[0.28em] text-white/55">
          {isAr ? "أحياء المدينة · صحة لحظية" : "City Districts · Live health"}
        </div>
        <ul className="mt-3 space-y-3">
          {districts.map((d, i) => (
            <li
              key={d.n}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-white">{d.n}</span>
                <span className="text-[10px] font-mono text-white/55">{d.health}%</span>
              </div>
              <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                <div className={`h-full ${d.tone} rounded-full`} style={{ width: `${d.health}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
