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

      {/* ============ SCENE 01 — EARTH FROM SPACE ============ */}
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
        <div className="pointer-events-none absolute inset-0 opacity-80 mix-blend-screen">
          <Suspense fallback={null}><EarthScene /></Suspense>
        </div>
        <ParticleField density={0.00012} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(58,142,255,0.25),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-[#04060d]" />

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
            <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-white/75 sm:text-2xl">
              {isAr
                ? "نظام التشغيل الذكي للمؤسسات — يحوّل البيانات الخام إلى قرارات تنفيذية."
                : "The operating system for intelligent enterprises — turning raw data into executive decisions."}
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
                {isAr ? "شاهد الفيلم" : "Watch the Film"}
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
      className="relative flex min-h-[100svh] items-center overflow-hidden"
    >
      <Parallax strength={120} className="absolute inset-0">
        <img
          src={cinematicCity}
          alt=""
          loading="lazy"
          width={1920}
          height={1080}
          className="h-full w-full scale-110 object-cover"
        />
      </Parallax>
      <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen">
        <Suspense fallback={null}><CityScene /></Suspense>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#04060d]/70 via-[#04060d]/30 to-[#04060d]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#04060d] via-transparent to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-32">
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
          <p className="mt-6 max-w-xl text-lg text-white/70">
            {isAr
              ? "لا لوحات ميتة. مدينة رقمية تنبض، حيث كل إشارة لها معنى تنفيذي."
              : "No dead dashboards. A digital city that breathes, where every signal carries executive meaning."}
          </p>
        </ScrollReveal>

        {/* legend strip — not cards, a horizontal HUD */}
        <ScrollReveal delay={500}>
          <div className="mt-14 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-6">
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
   SCENE 05 — COMMAND CENTER
   ═════════════════════════════════════════════════════════ */
function CommandCenterScene({ isAr }: { isAr: boolean }) {
  return (
    <section
      data-scene="5"
      className="relative flex min-h-[100svh] items-center overflow-hidden"
    >
      <div className="absolute inset-0">
        <img
          src={cinematicBoardroom}
          alt=""
          loading="lazy"
          width={1920}
          height={1080}
          className="h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#04060d] via-[#04060d]/40 to-[#04060d]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(58,142,255,0.15),transparent_55%)]" />
      </div>
      <ParticleField density={0.00005} />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-32">
        <div className="max-w-2xl">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.35em] text-blue-300/80">{isAr ? "المشهد ٠٥ · غرفة القيادة" : "Scene 05 · The Command Room"}</p>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <h2 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              {isAr ? "غرفة قيادة" : "A command room"}<br />
              <span className="bg-gradient-to-r from-blue-200 to-cyan-300 bg-clip-text text-transparent">
                {isAr ? "تليق بالقرار." : "worthy of the decision."}
              </span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={400}>
            <p className="mt-6 text-lg text-white/70">
              {isAr
                ? "شاشات حية. تحليل لحظي. توصيات ARIA. كل ما يحتاجه مجلس الإدارة في ٦٠ ثانية."
                : "Live screens. Realtime analytics. ARIA's recommendations. Everything a board needs in 60 seconds."}
            </p>
          </ScrollReveal>
        </div>

        {/* HUD — full-bleed glass strip, not cards */}
        <ScrollReveal delay={600}>
          <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl sm:grid-cols-4">
            {[
              { v: "12.8K", l: isAr ? "إشارة/ث" : "Signals/sec" },
              { v: "47", l: isAr ? "تنبيه نشط" : "Active alerts" },
              { v: "94%", l: isAr ? "ثقة النموذج" : "Model confidence" },
              { v: "<1s", l: isAr ? "زمن القرار" : "Decision latency" },
            ].map((s) => (
              <div key={s.l} className="bg-[#04060d]/50 px-6 py-8">
                <div className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{s.v}</div>
                <div className="mt-1.5 text-[11px] uppercase tracking-wider text-white/50">{s.l}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
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
          className="h-full w-full scale-110 object-cover opacity-50"
        />
      </Parallax>
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
