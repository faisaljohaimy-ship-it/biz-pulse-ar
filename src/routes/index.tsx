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
  Moon,
  Play,
  Menu,
} from "lucide-react";
import { MissionControlStrip } from "@/components/executive/MissionControlStrip";
import { AgentRing } from "@/components/executive/AgentRing";
import { ExecutiveCinema } from "@/components/executive/ExecutiveCinema";
import { CommandPalette } from "@/components/executive/CommandPalette";
import { LiveSystemShowcase } from "@/components/executive/LiveSystemShowcase";
import { HajjExecutiveStage } from "@/components/executive/HajjExecutiveStage";

import { NexiosFootermark } from "@/components/cinematic/NexiosFootermark";

import { DepartmentsLauncher } from "@/components/executive/DepartmentsLauncher";
import { SecCommandLiveCard } from "@/components/executive/SecCommandLiveCard";
import { SovereignCommandDeck } from "@/components/os/SovereignCommandDeck";
import { OsDecisionQueue } from "@/components/os/OsDecisionQueue";
import { useI18n } from "@/lib/i18n";
import { DemoModeLauncher } from "@/components/executive/DemoModeLauncher";
import { HomeVideoBackdrop } from "@/components/home/HomeVideoBackdrop";
// AriaListenChip removed — homepage voice intro disabled system-wide.
import { NexiosWordmark } from "@/components/executive/NexiosWordmark";
// Pre-hero intros retired — the single ARIA welcome video mounts globally
// from __root.tsx via <WelcomeThenGenesis />. Auto-greeting voice removed per directive.

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXIOS AI OS — منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform" },
      {
        name: "description",
        content: "منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform",
      },
      {
        property: "og:title",
        content: "NEXIOS AI OS — منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform",
      },
      {
        property: "og:description",
        content: "منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform",
      },
      { property: "og:url", content: "https://neexios.com/" },
      {
        name: "twitter:title",
        content: "NEXIOS AI OS — منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform",
      },
      {
        name: "twitter:description",
        content: "منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform",
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
    anchor: "tour-pillar-hajj",
    to: "https://hajj-nexus-prime.lovable.app/",
    external: true,
    icon: Moon,
    title_ar: "منصة نُسك الحج",
    title_en: "Hajj Nusuk Platform",
    desc_ar: "منصة مستقلة لعمليات الحج · مشاعر 1447 (تفتح في نافذة جديدة).",
    desc_en: "Standalone Hajj operations platform · Mashaer 1447 (opens in new tab).",
  },
  {
    anchor: "tour-pillar-aria",
    to: "/aria",
    icon: Sparkles,
    title_ar: "ARIA التنفيذية",
    title_en: "ARIA Engine",
    desc_ar: "محرك تنفيذي ثنائي اللغة مع صوت طبيعي وذاكرة حية.",
    desc_en: "Bilingual executive engine with natural voice and live executive memory.",
  },
] as const;

function IntroLanding() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  // The single global ARIA backdrop is rendered from __root.tsx; this
  // route only owns the executive hero content. No canvas, no boot
  // animation, no AudioContext.
  const [cinemaOpen, setCinemaOpen] = useState(false);
  // The pre-hero intro is owned globally by <WelcomeThenGenesis /> in
  // __root.tsx (single ARIA welcome video, once per session).

  const [deptsOpen, setDeptsOpen] = useState(false);


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
      ? "ادخل إلى Runtime Hub لرؤية جميع مراحل النظام مباشرة، مع وميض حي وروابط فعّالة لكل وحدة."
      : "Open the Runtime Hub to see every stage of the platform live — pulsing modules with active links to each unit.",
    cta_enter: ar ? "دخول النظام" : "Enter the Platform",
  };

  const Arrow = ar ? ArrowLeft : ArrowRight;

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="relative min-h-screen overflow-x-hidden bg-transparent text-white"
    >
      {/* Beta marquee is mounted globally in __root.tsx (hidden while intro plays). */}

      {/* Pre-hero intros retired. The single ARIA welcome video is mounted
          globally in __root.tsx via <WelcomeThenGenesis />. */}

      {/* Homepage video backdrop — plays with sound once per system session,
          silent on every subsequent mount (including returns from inner
          windows). Replaces the retired AriaGlobalBackdrop. */}
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

      {/* ══ Executive Hero — Tactical HUD ══ */}
      <section
        id="tour-hero"
        aria-label={ar ? "الواجهة التنفيذية" : "Executive hero"}
        className="relative z-10 flex w-full flex-col px-5 pb-6"
        style={{ paddingTop: "clamp(14dvh, 16dvh, 20dvh)" }}
      >
        {/* Face-safe scrim — starts BELOW the top 34dvh so ARIA's face stays
            unobstructed while buttons below remain readable. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0"
          style={{
            top: "34dvh",
            background:
              "linear-gradient(to bottom, rgba(4,7,15,0) 0%, rgba(4,7,15,0.55) 40%, rgba(4,7,15,0.85) 100%)",
          }}
        />
        <div
          className="relative z-10 mx-auto flex w-full max-w-[420px] flex-col items-center sm:max-w-2xl"
          style={{
            animation: "hero-stack-settle 1100ms cubic-bezier(0.22,1,0.36,1) both",
            willChange: "transform, opacity",
          }}
        >
          {/* Chrome NEXIOS wordmark — sits just below the face-safe zone.
              Glow contained so text-shadow cannot bleed upward into her face. */}
          <div
            className="relative mb-8 w-full"
            style={{ isolation: "isolate", filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.35))" }}
          >
            <NexiosWordmark />
            <p
              dir="ltr"
              className="whitespace-nowrap text-center"
              style={{
                marginTop: "clamp(6px, 1dvh, 12px)",
                fontFamily: '"Space Grotesk", ui-sans-serif, system-ui',
                fontWeight: 700,
                fontSize: "clamp(0.65rem, 2vw, 0.9rem)",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "rgba(227,232,238,0.85)",
                textShadow: "0 0 12px rgba(190,205,225,0.35)",
              }}
            >
              Digital Transformation
            </p>
          </div>

          {/* Primary + secondary CTAs */}
          <div className="flex w-full flex-col gap-3">
            <Link
              to="/os"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#3AE8FF] px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#061A2E] shadow-[0_6px_28px_rgba(58,232,255,0.35)] transition hover:bg-[#5CEEFF] active:scale-[0.98]"
            >
              {ar ? "بدء العملية" : "Start Operation"}
              <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Link>
            <Link
              to="/executive-bridge"
              className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-[#3AE8FF]/35 bg-[#3AE8FF]/[0.04] px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#3AE8FF] transition hover:border-[#3AE8FF]/70 hover:bg-[#3AE8FF]/[0.09]"
            >
              <Play className="h-4 w-4" />
              {ar ? "جسر القيادة التنفيذي" : "Executive Bridge"}
            </Link>
          </div>

          {/* Secondary utility row */}
          <div className="mt-4 flex w-full items-center justify-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setDeptsOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/35 bg-[#00D4FF]/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85 transition hover:border-[#3AE8FF]/60 hover:bg-[#3AE8FF]/10"
            >
              <Menu className="h-3.5 w-3.5" />
              <span>{t.cta_depts}</span>
            </button>
            <DemoModeLauncher />
            <AriaListenChip ar={ar} />
          </div>

          {/* Telemetry footer — tabular numerals, executive signal */}
          <dl
            aria-label={ar ? "قراءات النظام" : "System readouts"}
            className="mt-8 grid w-full grid-cols-1 gap-4 border-t border-[#3AE8FF]/12 pt-4 text-center"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            <div className="flex flex-col items-center gap-1">
              <dt className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/45">
                {ar ? "مستوى العرض" : "View Mode"}
              </dt>
              <dd className="font-mono text-xs font-semibold text-[#3AE8FF]">
                {ar ? "تنفيذي · Executive" : "Executive"}
              </dd>
            </div>
          </dl>

          {/* Glowing headline + Digital Transformation subtitle — moved to the
              BOTTOM, below the EXC readout. Styling unchanged. */}
          <div
            dir="ltr"
            className="relative mt-10 flex w-full flex-col items-center text-center sm:mt-14"
          >
            {/* Soft dark halo scrim so the crest lifts off the ARIA backdrop */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[220%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(3,10,18,0.55) 0%, rgba(3,10,18,0.28) 45%, rgba(3,10,18,0) 75%)",
                filter: "blur(6px)",
              }}
            />
            <h1
              dir={ar ? "rtl" : "ltr"}
              className="whitespace-nowrap font-black leading-none"
              style={{
                fontFamily: '"Space Grotesk", "Tajawal", ui-sans-serif, system-ui',
                fontWeight: 900,
                letterSpacing: "0.04em",
                fontSize: "clamp(1.9rem, 7vw, 4.4rem)",
                color: "#F5FBFF",
                textShadow: [
                  "0 0 4px rgba(220,240,255,0.9)",
                  "0 0 22px rgba(0,180,120,0.7)",
                  "0 0 50px rgba(0,140,90,0.55)",
                  "0 0 110px rgba(0,120,80,0.35)",
                ].join(","),
              }}
            >
              {ar ? (
                <>
                  الذكاء، تحت <span style={{ color: "#4ADE80" }}>القيادة</span>.
                </>
              ) : (
                <>
                  Intelligence, Under <span style={{ color: "#4ADE80" }}>Command</span>.
                </>
              )}
            </h1>
            <span
              aria-hidden
              className="mt-3 block h-px w-24 sm:w-32"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(74,222,128,0.85) 50%, transparent 100%)",
                boxShadow: "0 0 18px rgba(74,222,128,0.55)",
              }}
            />
          </div>
        </div>

        <style>{`
          @keyframes hero-stack-settle {
            from { opacity: 0.9; transform: translateY(-18vh); }
            to   { opacity: 1;   transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            section [style*="hero-stack-settle"] { animation: none !important; }
          }
        `}</style>
      </section>

      {/* ══ Sovereign Cinematic Command Deck — world-class executive dashboard ══
          Floats over the ARIA hologram as translucent glass instruments so
          she remains visible as the living backdrop of the whole system. */}
      <section
        id="hero-dashboard"
        aria-label={ar ? "لوحة القيادة السيادية الحية" : "Sovereign live command deck"}
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-6 pt-4 sm:gap-8 sm:px-6 sm:pt-8"
      >
        <SovereignCommandDeck ar={ar} />
        <OsDecisionQueue ar={ar} />
      </section>

      <LiveSystemShowcase />


      <div id="tour-hajj">
        <HajjExecutiveStage />
      </div>

      <div
        id="tour-positioning"
        className="relative z-10 mx-auto mt-6 w-full max-w-6xl px-4 sm:mt-10 sm:px-6"
      >
        <MissionControlStrip />
      </div>

      <div id="tour-agents">
        <AgentRing />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <section id="tour-capabilities" className="mt-6 sm:mt-16">
          <div className="mb-5 text-center sm:mb-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#3AE8FF]/70 sm:text-[11px] sm:tracking-[0.3em]">
              Capabilities
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              {t.capabilities}
            </h2>
          </div>

          {/* Featured: Industrial Security live command preview */}
          <div className="mb-4 sm:mb-6">
            <SecCommandLiveCard />
          </div>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              const title = ar ? p.title_ar : p.title_en;
              const sub = ar ? p.title_en : p.title_ar;
              const desc = ar ? p.desc_ar : p.desc_en;
              const isExternal = "external" in p && p.external === true;
              const cardClass =
                "block h-full rounded-2xl border border-[#00D4FF]/25 bg-[#00D4FF]/[0.05] p-4 shadow-[0_0_24px_rgba(0,212,255,0.15)] transition hover:border-[#3AE8FF]/60 hover:bg-[#3AE8FF]/[0.08] hover:shadow-[0_0_40px_rgba(58,232,255,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 sm:p-5";
              const inner = (
                <>
                  <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00D4FF]/20 text-[#3AE8FF] shadow-[0_0_18px_rgba(0,212,255,0.5)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className={`min-w-0 ${ar ? "text-right" : "text-left"}`}>
                      <div className="truncate text-sm font-semibold">{title}</div>
                      <div className="truncate text-[10px] uppercase tracking-[0.2em] text-white/40">
                        {sub}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/65">{desc}</p>
                </>
              );
              return (
                <li id={p.anchor} key={p.title_en} className="group">
                  {isExternal ? (
                    <a
                      href={p.to}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={title}
                      className={cardClass}
                    >
                      {inner}
                    </a>
                  ) : (
                    <Link to={p.to as "/"} aria-label={title} className={cardClass}>
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section
          id="tour-closing"
          className="mt-10 rounded-2xl border border-[#00D4FF]/30 bg-gradient-to-br from-[#00D4FF]/10 to-transparent p-6 text-center shadow-[0_0_40px_rgba(0,212,255,0.2)] sm:mt-16 sm:p-8"
        >
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
