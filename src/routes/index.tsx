import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { ensureDemoUser, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo.functions";
import { toast } from "sonner";
import {
  ArrowRight,
  Brain,
  Building2,
  ChevronDown,
  Database,
  Film,
  Gauge,
  Globe2,
  Layers,
  Network,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import cinematicCity from "@/assets/cinematic-city.jpg";
import cinematicBoardroom from "@/assets/cinematic-boardroom.jpg";
import cinematicEarth from "@/assets/cinematic-earth.jpg";

const CityScene = lazy(() => import("@/components/cinematic/CityScene"));
const EarthScene = lazy(() => import("@/components/cinematic/EarthScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexus AI OS — The Operating System for Intelligent Enterprises" },
      {
        name: "description",
        content:
          "Cinematic enterprise intelligence: ARIA executive AI, digital twin city, boardroom command center. Built for investors, boards, and Fortune-grade transformation.",
      },
      { property: "og:title", content: "Nexus AI OS — The Operating System for Intelligent Enterprises" },
      { property: "og:description", content: "ARIA executive intelligence + Digital Twin city + Boardroom command. The cinematic operating system for the modern enterprise." },
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
          sameAs: [],
        }),
      },
    ],
  }),
  component: CinematicHome,
});

function CinematicHome() {
  const { user, loading } = useAuth();
  const { locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const ensureDemo = useServerFn(ensureDemoUser);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  if (loading || user) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#04060d]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  const isAr = locale === "ar";

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
    <div className="relative w-full overflow-x-clip bg-[#04060d] text-white">
      {/* ============ TOP BAR ============ */}
      <header className="fixed inset-x-0 top-0 z-50 backdrop-blur-md">
        <div className="border-b border-white/5 bg-[#04060d]/60">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_18px_-4px_rgba(245,180,84,0.7)]">
                <Sparkles className="h-4 w-4 text-black" />
              </div>
              <div className="leading-tight">
                <div className="text-[13px] font-bold tracking-wider">NEXUS AI OS</div>
                <div className="text-[9px] uppercase tracking-[0.25em] text-white/50">
                  {isAr ? "نظام التشغيل الذكي" : "Intelligent Enterprises"}
                </div>
              </div>
            </Link>
            <nav className="hidden items-center gap-6 text-xs text-white/70 md:flex">
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
              to="/login"
              className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              {isAr ? "دخول" : "Sign in"}
            </Link>
          </div>
        </div>
      </header>

      {/* ============ BLOCK 01 — CINEMATIC HERO ============ */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden">
        {/* Layer 1: hero image */}
        <img
          src={cinematicCity}
          alt=""
          width={1920}
          height={1080}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60"
        />
        {/* Layer 2: lazy R3F city overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen">
          <Suspense fallback={null}>
            <CityScene />
          </Suspense>
        </div>
        {/* Layer 3: gradient + grain */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#04060d]/30 via-transparent to-[#04060d]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(245,180,84,0.18),transparent_55%)]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pt-32 sm:pt-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-amber-300 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-80" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              {isAr ? "النظام التنفيذي الجديد" : "The New Executive OS"}
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl lg:text-[88px]">
              <span className="block bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
                NEXUS AI OS
              </span>
              <span className="mt-3 block text-2xl font-medium text-white/80 sm:text-3xl lg:text-4xl">
                {isAr ? "نظام التشغيل الذكي للمؤسسات" : "The Operating System For Intelligent Enterprises"}
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              {isAr
                ? "تحويل البيانات المؤسسية إلى قرارات تنفيذية باستخدام الذكاء الاصطناعي والتوأم الرقمي."
                : "Transform enterprise data into executive decisions through AI and a living digital twin."}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/request-demo"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3.5 text-sm font-semibold text-black shadow-[0_10px_40px_-10px_rgba(245,180,84,0.7)] transition hover:scale-[1.02]"
              >
                {isAr ? "طلب عرض تنفيذي" : "Request Executive Demo"}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/films"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
              >
                <Play className="h-4 w-4 fill-white" />
                {isAr ? "مشاهدة الفيلم الاستثماري" : "Watch Investor Film"}
              </Link>
              <button
                onClick={enterDemo}
                disabled={demoLoading}
                className="text-xs text-white/60 underline-offset-4 transition hover:text-white hover:underline disabled:opacity-50"
              >
                {demoLoading ? (isAr ? "جارٍ..." : "Loading...") : isAr ? "أو افتح بيئة تجريبية مباشرة" : "Or enter live demo →"}
              </button>
            </div>
          </div>

          <div className="mt-24 hidden items-center gap-2 text-white/40 sm:flex">
            <ChevronDown className="h-4 w-4 animate-bounce" />
            <span className="text-[10px] uppercase tracking-[0.3em]">{isAr ? "اكتشف القصة" : "Discover the story"}</span>
          </div>
        </div>
      </section>

      {/* ============ BLOCK 02 — THE PROBLEM ============ */}
      <ProblemBlock isAr={isAr} />

      {/* ============ BLOCK 03 — BIRTH OF NEXUS ============ */}
      <BirthBlock isAr={isAr} />

      {/* ============ BLOCK 04 — ARIA ============ */}
      <AriaBlock isAr={isAr} />

      {/* ============ BLOCK 05 — DIGITAL TWIN CITY ============ */}
      <DigitalTwinBlock isAr={isAr} />

      {/* ============ BLOCK 06 — EXECUTIVE BOARDROOM ============ */}
      <BoardroomBlock isAr={isAr} />

      {/* ============ BLOCK 07 — ROI ============ */}
      <RoiBlock isAr={isAr} />

      {/* ============ BLOCK 08 — COMPETITIVE ADVANTAGE ============ */}
      <CompetitiveBlock isAr={isAr} />

      {/* ============ BLOCK 09 — INVESTOR FILM CENTER ============ */}
      <FilmCenterBlock isAr={isAr} />

      {/* ============ BLOCK 10 — FINAL REVEAL ============ */}
      <FinalRevealBlock isAr={isAr} />

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-white/5 bg-[#02030a] py-12">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600">
                <Sparkles className="h-4 w-4 text-black" />
              </div>
              <div className="text-sm">
                <div className="font-semibold">NEXUS AI OS</div>
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

/* ─────────────────────────────────────────────────────────────
   BLOCK 02 — THE PROBLEM
   ─────────────────────────────────────────────────────────── */
function ProblemBlock({ isAr }: { isAr: boolean }) {
  const steps = isAr
    ? ["فوضى البيانات", "أنظمة منفصلة", "تقارير متأخرة", "اجتماعات طويلة", "قرارات بطيئة"]
    : ["Data Chaos", "Disconnected Systems", "Slow Reporting", "Long Meetings", "Slow Decisions"];
  return (
    <section className="relative overflow-hidden bg-[#04060d] py-28 sm:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,80,80,0.08),transparent_50%)]" />
      <div className="mx-auto max-w-5xl px-5">
        <p className="text-xs uppercase tracking-[0.3em] text-red-400/80">{isAr ? "المشكلة" : "The Problem"}</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
          {isAr ? "المؤسسات تملك البيانات." : "Enterprises have the data."}
          <br />
          <span className="text-white/40">{isAr ? "لكنها تفتقد الذكاء التنفيذي." : "What they lack is executive intelligence."}</span>
        </h2>

        <ol className="mt-16 grid gap-4 sm:grid-cols-5">
          {steps.map((step, i) => (
            <li key={step} className="relative">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-5 text-center">
                <div className="text-[10px] uppercase tracking-[0.2em] text-red-400/70">0{i + 1}</div>
                <div className="mt-3 text-sm font-medium leading-snug text-white/90">{step}</div>
              </div>
              {i < steps.length - 1 && (
                <ChevronDown className="absolute -bottom-3 left-1/2 z-10 h-5 w-5 -translate-x-1/2 text-red-400/60 sm:hidden" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   BLOCK 03 — BIRTH OF NEXUS
   ─────────────────────────────────────────────────────────── */
function BirthBlock({ isAr }: { isAr: boolean }) {
  const beats = isAr
    ? [
        { t: "ظهور Nexus", d: "طبقة التشغيل الذكية تتسلّل تحت كل نظام موجود." },
        { t: "ظهور ARIA", d: "العقل التنفيذي الذي يتعلّم لغة مؤسستك." },
        { t: "ربط جميع الأنظمة", d: "ERP، CRM، BI، التوثيق — كلها تتحدث الآن." },
        { t: "البيانات → معرفة", d: "أحداث خام تتحول إلى أنماط ومخاطر وفرص." },
        { t: "المعرفة → قرارات", d: "توصية واحدة، مُسنَدة، قابلة للتنفيذ، في ثوانٍ." },
      ]
    : [
        { t: "Nexus Emerges", d: "An intelligence layer slides beneath every existing system." },
        { t: "ARIA Awakens", d: "An executive mind that learns the language of your enterprise." },
        { t: "Systems Unify", d: "ERP, CRM, BI, docs — all finally speaking the same language." },
        { t: "Data → Knowledge", d: "Raw events become patterns, risks, and opportunities." },
        { t: "Knowledge → Decisions", d: "One grounded, executable recommendation, in seconds." },
      ];
  return (
    <section className="relative bg-gradient-to-b from-[#04060d] via-[#070b1a] to-[#04060d] py-28 sm:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(58,142,255,0.1),transparent_55%)]" />
      <div className="relative mx-auto max-w-5xl px-5">
        <p className="text-xs uppercase tracking-[0.3em] text-blue-400/80">{isAr ? "ميلاد" : "Genesis"}</p>
        <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
          {isAr ? "ثم وُلِد نكسس." : "Then, Nexus was born."}
        </h2>
        <div className="mt-14 space-y-5">
          {beats.map((b, i) => (
            <div key={b.t} className="group grid grid-cols-[64px_1fr] items-center gap-5 sm:grid-cols-[120px_1fr]">
              <div className="relative">
                <div className="font-mono text-3xl font-bold text-white/15 sm:text-5xl">
                  0{i + 1}
                </div>
                <div className="absolute -bottom-1 left-0 h-px w-12 bg-gradient-to-r from-amber-400 to-transparent" />
              </div>
              <div className="border-l border-white/10 pl-5 transition group-hover:border-amber-400/50">
                <div className="text-lg font-semibold text-white sm:text-xl">{b.t}</div>
                <div className="mt-1 text-sm text-white/60">{b.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   BLOCK 04 — ARIA EXECUTIVE INTELLIGENCE
   ─────────────────────────────────────────────────────────── */
function AriaBlock({ isAr }: { isAr: boolean }) {
  const roles = isAr
    ? [
        { i: Brain, t: "مستشار تنفيذي", d: "يصوغ التوصية بصوت تنفيذي." },
        { i: ShieldCheck, t: "محلل مخاطر", d: "يقرأ التنبيهات ويرتبها بالأثر." },
        { i: Layers, t: "مساعد مجلس الإدارة", d: "ينتج موجزات بمستوى مجلس الإدارة." },
        { i: Database, t: "مولّد تقارير", d: "تقرير كامل في أقل من دقيقة." },
        { i: Network, t: "مركز اتخاذ القرار", d: "كل قرار مرتبط ببياناته." },
      ]
    : [
        { i: Brain, t: "Executive Advisor", d: "Frames every recommendation in board-grade language." },
        { i: ShieldCheck, t: "Risk Analyst", d: "Reads every alert and ranks it by business impact." },
        { i: Layers, t: "Boardroom Assistant", d: "Produces board-grade briefs on demand." },
        { i: Database, t: "Reporting Engine", d: "A full executive report in under a minute." },
        { i: Network, t: "Decision Hub", d: "Every decision permanently linked to its evidence." },
      ];
  return (
    <section className="relative overflow-hidden bg-[#04060d] py-28 sm:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(168,85,247,0.1),transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-400/80">ARIA</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
            {isAr ? "أريا ليست شات بوت." : "ARIA is not a chatbot."}
          </h2>
          <p className="mt-4 text-base text-white/60 sm:text-lg">
            {isAr ? "أريا هي الذكاء التنفيذي." : "ARIA is executive intelligence."}
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <div
              key={r.t}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-6 transition hover:border-violet-400/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_0_24px_-8px_rgba(168,85,247,0.7)]">
                <r.i className="h-5 w-5 text-white" />
              </div>
              <div className="mt-5 text-lg font-semibold">{r.t}</div>
              <div className="mt-1.5 text-sm text-white/60">{r.d}</div>
              <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-violet-500/20 opacity-0 blur-3xl transition group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   BLOCK 05 — DIGITAL TWIN CITY
   ─────────────────────────────────────────────────────────── */
function DigitalTwinBlock({ isAr }: { isAr: boolean }) {
  const items = isAr
    ? [
        { c: "bg-blue-400", t: "الإدارات = أحياء ذكية" },
        { c: "bg-amber-400", t: "المشاريع = مبانٍ ذكية" },
        { c: "bg-red-500", t: "المخاطر = إشارات حمراء" },
        { c: "bg-amber-300", t: "الفرص = إشارات ذهبية" },
        { c: "bg-cyan-400", t: "البيانات = طرق ضوئية" },
      ]
    : [
        { c: "bg-blue-400", t: "Departments = Smart Districts" },
        { c: "bg-amber-400", t: "Projects = Intelligent Buildings" },
        { c: "bg-red-500", t: "Risks = Red Signals" },
        { c: "bg-amber-300", t: "Opportunities = Golden Signals" },
        { c: "bg-cyan-400", t: "Data = Intelligence Streams" },
      ];
  return (
    <section className="relative overflow-hidden bg-[#04060d] py-28 sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:items-center">
        <div className="order-2 lg:order-1">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-400/80">{isAr ? "التوأم الرقمي" : "Digital Twin"}</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
            {isAr ? "مؤسستك. كمدينة حيّة." : "Your enterprise. As a living city."}
          </h2>
          <p className="mt-5 text-base text-white/65 sm:text-lg">
            {isAr
              ? "لا لوحات ميتة. مدينة رقمية تنبض، حيث كل إشارة لها معنى تنفيذي."
              : "No dead dashboards. A digital city that breathes, where every signal carries executive meaning."}
          </p>
          <ul className="mt-8 space-y-3.5">
            {items.map((it) => (
              <li key={it.t} className="flex items-center gap-3 text-sm">
                <span className={`relative flex h-2.5 w-2.5 ${it.c} rounded-full`}>
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${it.c} opacity-60`} />
                </span>
                <span className="text-white/85">{it.t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="order-1 lg:order-2">
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/20 shadow-[0_0_80px_-20px_rgba(245,180,84,0.4)]">
            <img
              src={cinematicCity}
              alt={isAr ? "مدينة رقمية للمؤسسة" : "Enterprise digital city"}
              loading="lazy"
              width={1920}
              height={1080}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#04060d] via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-[11px] backdrop-blur-md">
              <span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />{isAr ? "حيّ" : "Live"}</span>
              <span className="text-white/60">12,840 {isAr ? "إشارة/ث" : "signals/sec"}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   BLOCK 06 — EXECUTIVE BOARDROOM
   ─────────────────────────────────────────────────────────── */
function BoardroomBlock({ isAr }: { isAr: boolean }) {
  const items = isAr
    ? ["تقارير مجلس الإدارة", "تحليل الأداء", "تحليل المخاطر", "التوصيات الذكية", "السيناريوهات المستقبلية"]
    : ["Board Reports", "Performance Intelligence", "Risk Analysis", "AI Recommendations", "Future Scenarios"];
  return (
    <section className="relative overflow-hidden bg-[#04060d] py-28 sm:py-36">
      <div className="absolute inset-0">
        <img
          src={cinematicBoardroom}
          alt=""
          loading="lazy"
          width={1920}
          height={1080}
          className="h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-[#04060d]/70 to-[#04060d]" />
      </div>
      <div className="relative mx-auto max-w-5xl px-5 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-blue-400/80">{isAr ? "غرفة القيادة" : "The Command Room"}</p>
        <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
          {isAr ? "غرفة قيادة تنفيذية فاخرة." : "A boardroom worthy of the decisions made in it."}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base text-white/60 sm:text-lg">
          {isAr
            ? "كل ما يحتاجه مجلس الإدارة ليرى الصورة الكاملة في ٦٠ ثانية."
            : "Everything a board needs to see the full picture, in 60 seconds."}
        </p>
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((t, i) => (
            <div
              key={t}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-5 backdrop-blur-sm transition hover:border-blue-400/40"
            >
              <div className="text-[10px] uppercase tracking-[0.2em] text-blue-400/70">0{i + 1}</div>
              <div className="mt-2 text-sm font-medium text-white/90">{t}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   BLOCK 07 — ROI
   ─────────────────────────────────────────────────────────── */
function RoiBlock({ isAr }: { isAr: boolean }) {
  const stats = isAr
    ? [
        { v: "35%", l: "خفض التكاليف", i: TrendingDown, c: "text-emerald-400" },
        { v: "90%", l: "تسريع التقارير", i: Zap, c: "text-amber-400" },
        { v: "24/7", l: "ذكاء تشغيلي", i: Gauge, c: "text-blue-400" },
        { v: "10×", l: "تسريع القرار", i: Rocket, c: "text-violet-400" },
      ]
    : [
        { v: "35%", l: "Cost Reduction", i: TrendingDown, c: "text-emerald-400" },
        { v: "90%", l: "Faster Reporting", i: Zap, c: "text-amber-400" },
        { v: "24/7", l: "Operational Intelligence", i: Gauge, c: "text-blue-400" },
        { v: "10×", l: "Faster Decisions", i: Rocket, c: "text-violet-400" },
      ];
  return (
    <section className="relative bg-gradient-to-b from-[#04060d] via-[#0a0f24] to-[#04060d] py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400/80">{isAr ? "العائد" : "The Return"}</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
            {isAr ? "الأرقام تتحدث." : "The numbers speak."}
          </h2>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.l}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-7"
            >
              <s.i className={`h-6 w-6 ${s.c}`} />
              <div className="mt-6 text-5xl font-bold tracking-tight text-white">{s.v}</div>
              <div className="mt-2 text-sm text-white/65">{s.l}</div>
              <div className={`pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full opacity-20 blur-2xl ${s.c.replace("text-", "bg-")}`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   BLOCK 08 — COMPETITIVE ADVANTAGE
   ─────────────────────────────────────────────────────────── */
function CompetitiveBlock({ isAr }: { isAr: boolean }) {
  const rows = isAr
    ? [
        { t: "لوحات معلومات تقليدية", s: "صور ثابتة من الماضي.", muted: true },
        { t: "ذكاء اصطناعي عام", s: "نموذج لغوي لا يفهم مؤسستك.", muted: true },
        { t: "NEXUS AI OS", s: "نظام تشغيل مؤسسي متكامل.", muted: false },
        { t: "نتيجة: عقل تنفيذي حيّ", s: "يقرّر، يتعلم، يتحسن كل يوم.", muted: false, gold: true },
      ]
    : [
        { t: "Traditional Dashboards", s: "Static snapshots of yesterday.", muted: true },
        { t: "Generic AI", s: "A model that doesn't know your enterprise.", muted: true },
        { t: "NEXUS AI OS", s: "An enterprise operating system.", muted: false },
        { t: "Result: a living executive mind.", s: "Decides, learns, improves daily.", muted: false, gold: true },
      ];
  return (
    <section className="relative overflow-hidden bg-[#04060d] py-28 sm:py-36">
      <div className="mx-auto max-w-4xl px-5">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-400/80">{isAr ? "التميّز" : "Why Nexus"}</p>
        <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
          {isAr ? "ليست أداة أخرى." : "Not another tool."}
        </h2>
        <div className="mt-14 space-y-3">
          {rows.map((r) => (
            <div
              key={r.t}
              className={`flex items-center gap-5 rounded-2xl border p-5 transition sm:p-6 ${
                r.gold
                  ? "border-amber-400/50 bg-gradient-to-r from-amber-400/10 to-transparent"
                  : r.muted
                    ? "border-white/5 bg-white/[0.02] opacity-50"
                    : "border-white/15 bg-white/[0.04]"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  r.gold ? "bg-amber-400 text-black" : r.muted ? "bg-white/10 text-white/40" : "bg-white text-black"
                }`}
              >
                {r.muted ? "—" : "✓"}
              </div>
              <div className="min-w-0">
                <div className={`text-base font-semibold sm:text-lg ${r.muted ? "text-white/60" : "text-white"}`}>{r.t}</div>
                <div className="text-sm text-white/55">{r.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   BLOCK 09 — INVESTOR FILM CENTER (teaser)
   ─────────────────────────────────────────────────────────── */
function FilmCenterBlock({ isAr }: { isAr: boolean }) {
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
    <section className="relative overflow-hidden bg-[#04060d] py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-400/80">{isAr ? "مركز الأفلام" : "Film Center"}</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
              {isAr ? "ثمانية أفلام. قصة واحدة." : "Eight films. One story."}
            </h2>
          </div>
          <Link
            to="/films"
            className="group inline-flex items-center gap-2 text-sm font-medium text-amber-400 transition hover:text-amber-300"
          >
            <Film className="h-4 w-4" />
            {isAr ? "افتح مركز الأفلام" : "Open film center"}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {films.map((f) => (
            <Link
              key={f.t}
              to="/films"
              className="group relative overflow-hidden rounded-2xl border border-white/10 transition hover:-translate-y-1 hover:border-amber-400/40"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={f.img}
                  alt=""
                  loading="lazy"
                  width={1920}
                  height={1080}
                  className="h-full w-full scale-105 object-cover opacity-80 transition duration-700 group-hover:scale-110 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-black/40 backdrop-blur-md transition group-hover:scale-110">
                    <Play className="h-6 w-6 fill-white text-white" />
                  </span>
                </div>
              </div>
              <div className="bg-[#070a16] p-4">
                <div className="font-semibold text-white">{f.t}</div>
                <div className="mt-1 text-xs text-white/55">{f.d}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   BLOCK 10 — FINAL REVEAL — EARTH FROM SPACE
   ─────────────────────────────────────────────────────────── */
function FinalRevealBlock({ isAr }: { isAr: boolean }) {
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-black">
      <img
        src={cinematicEarth}
        alt=""
        loading="lazy"
        width={1920}
        height={1080}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50"
      />
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <Suspense fallback={null}>
          <EarthScene />
        </Suspense>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black" />

      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-amber-400/80">{isAr ? "النهاية" : "The Reveal"}</p>
        <h2 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          {isAr ? (
            <>
              المستقبل ذكي.<br />
              <span className="bg-gradient-to-br from-amber-300 to-amber-500 bg-clip-text text-transparent">
                المستقبل هو نكسس.
              </span>
            </>
          ) : (
            <>
              The future is intelligent.<br />
              <span className="bg-gradient-to-br from-amber-300 to-amber-500 bg-clip-text text-transparent">
                The future is Nexus.
              </span>
            </>
          )}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base text-white/65 sm:text-lg">
          {isAr ? "شبكة ذكاء عالمية. نظام تشغيل واحد." : "A global intelligence network. One operating system."}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/request-demo"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-7 py-3.5 text-sm font-semibold text-black shadow-[0_10px_50px_-10px_rgba(245,180,84,0.8)] transition hover:scale-[1.02]"
          >
            {isAr ? "ابدأ مع نكسس" : "Begin with Nexus"}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
          >
            <Building2 className="h-4 w-4" />
            {isAr ? "للمؤسسات" : "Talk to enterprise"}
          </Link>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
          <span className="flex items-center gap-1.5"><Globe2 className="h-3 w-3" />{isAr ? "للمؤسسات" : "Enterprise"}</span>
          <span>·</span>
          <span>{isAr ? "للحكومات" : "Government"}</span>
          <span>·</span>
          <span>{isAr ? "للمستثمرين" : "Investors"}</span>
        </div>
      </div>
    </section>
  );
}
