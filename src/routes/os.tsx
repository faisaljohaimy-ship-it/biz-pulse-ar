/**
 * /os — Enterprise Operating System hub · Executive Dashboard v2.
 * Dark-locked, mobile-first, bilingual (EN/AR), RTL-safe, Vision 2030 aligned.
 * Additive-only: preserves tile navigation, adds real KPI evidence surface.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  Radar,
  Activity,
  BarChart3,
  Bot,
  Radio,
  Sparkles,
  Moon,
  Command,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

import { RuntimeTile } from "@/components/os/RuntimeTile";
import { LiveDateTime } from "@/components/os/LiveDateTime";
import { OsExecutiveStrip } from "@/components/os/OsExecutiveStrip";
import { OsLivePulse } from "@/components/os/OsLivePulse";
import { OsCommandDeck } from "@/components/os/OsCommandDeck";
import { OsDecisionQueue } from "@/components/os/OsDecisionQueue";
import { AriaCinematicIntro } from "@/components/intro/AriaCinematicIntro";

export const Route = createFileRoute("/os")({
  head: () => ({
    meta: [
      { title: "Enterprise Operating System — NEXIOS AI OS" },
      {
        name: "description",
        content:
          "NEXIOS AI OS — the world-class enterprise operating system for industrial security, Hajj operations, and executive intelligence. Live KPIs, ARIA runtime, Digital Twin. Aligned with Saudi Vision 2030.",
      },
      { property: "og:title", content: "Enterprise Operating System — NEXIOS AI OS" },
      {
        property: "og:description",
        content:
          "Unified runtime: Digital Twin, Operations, Executive KPIs, Hajj 1447, ARIA Runtime, Realtime, Agents.",
      },
      { property: "og:url", content: "https://neexios.com/os" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://neexios.com/os" }],
  }),
  component: OsHub,
});

type Stage = {
  key: string;
  ar: string;
  en: string;
  icon: typeof ShieldCheck;
  to: string;
  featured?: boolean;
};

const STAGES: readonly Stage[] = [
  {
    key: "twin",
    ar: "التَّوْأَمُ الرَّقْمِيّ",
    en: "Digital Twin",
    icon: Radar,
    to: "/operations",
  },
  {
    key: "org",
    ar: "بَيَانَاتُ المُؤَسَّسَة",
    en: "Organization",
    icon: Building2,
    to: "/command-center",
  },
  {
    key: "auth",
    ar: "المُصَادَقَة",
    en: "Authentication",
    icon: ShieldCheck,
    to: "/command-center",
  },
  {
    key: "kpi",
    ar: "مُؤَشِّرَاتُ الأَدَاءِ التَّنْفِيذِيَّة",
    en: "Executive KPIs",
    icon: BarChart3,
    to: "/executive-reports",
  },
  {
    key: "hajj",
    ar: "مَنْظُومَةُ الحَجِّ ١٤٤٧",
    en: "Hajj 1447",
    icon: Moon,
    to: "/hajj",
    featured: true,
  },
  { key: "ops", ar: "العَمَلِيَّات", en: "Operations", icon: Activity, to: "/operations" },
  {
    key: "aria",
    ar: "آرِيَا — المُحَرِّكُ التَّنْفِيذِيّ",
    en: "ARIA Runtime",
    icon: Sparkles,
    to: "/command-center",
  },
  { key: "realtime", ar: "البَثُّ اللَّحْظِيّ", en: "Realtime", icon: Radio, to: "/operations" },
  { key: "agents", ar: "الوُكَلَاءُ الأَذْكِيَاء", en: "AI Agents", icon: Bot, to: "/exec" },
] as const;

function OsHub() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const hadLight = root.classList.contains("light");
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    return () => {
      if (hadLight) {
        root.classList.add("light");
        root.classList.remove("dark");
      }
    };
  }, []);

  const t = {
    title: ar ? "نِظَامُ التَّشْغِيلِ المُؤَسَّسِيّ" : "Enterprise Operating System",
    subtitle: ar
      ? "نِكْسِيُوس — الأَمْنُ الصِّنَاعِيّ، المِنْطَقَةُ الغَرْبِيَّة"
      : "NEXIOS AI OS — Industrial Security, Western Region",
    vision: ar
      ? "مِنَصَّةٌ اسْتِرَاتِيجِيَّةٌ تَدْعَمُ رُؤْيَةَ المَمْلَكَةِ ٢٠٣٠ · التَّحَوُّلُ الرَّقْمِيُّ وَالرِّيَادَةُ الصِّنَاعِيَّة"
      : "Strategic platform empowering Saudi Vision 2030 · Digital transformation & industrial leadership",
    executive: ar ? "مؤشرات تنفيذية" : "Executive KPIs",
    modules: ar ? "وحدات المنظومة" : "Runtime Modules",
    ready: ar ? "جَاهِز" : "Ready",
    footer: ar ? "مِنَصَّةُ تَشْغِيلِ المُؤَسَّسَة · النُّسْخَةُ ٢٫٠" : "Enterprise Runtime · v2.0",
  };

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      data-surface="os"
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#0a0e1a] text-white"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(0,212,255,0.10), transparent 60%), linear-gradient(180deg, #0a0e1a 0%, #0f1729 100%)",
      }}
    >
      <AriaCinematicIntro surface="os" />

      {/* Ambient layers */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "radial-gradient(rgba(0,212,255,0.35) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 start-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#00D4FF]/10 blur-[120px] motion-safe:animate-pulse"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 start-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#3AE8FF]/10 blur-[120px] motion-safe:animate-pulse"
      />

      {/* Top strip */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-4 pt-3 sm:px-6">
        <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60 backdrop-blur">
          <Command className="h-3.5 w-3.5 text-[#3AE8FF]" strokeWidth={2} />
          NEXIOS · OS
        </span>
        <LiveDateTime ar={ar} />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-16 pt-20 sm:gap-8 sm:px-6 sm:pt-24 lg:pt-28">
        {/* Hero */}
        <header className="text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00D4FF]/40 bg-[#00D4FF]/10 shadow-[0_0_40px_rgba(0,212,255,0.45)] motion-safe:animate-pulse">
            <Sparkles className="h-7 w-7 text-[#3AE8FF]" strokeWidth={1.75} />
          </div>
          <h1
            className="text-balance font-semibold tracking-tight"
            style={{ fontSize: "clamp(1.5rem, 4.5vw, 2.25rem)" }}
          >
            {t.title}
          </h1>
          <p className="mt-2 text-sm text-white/65 sm:text-base">{t.subtitle}</p>
          <p className="mx-auto mt-3 max-w-2xl text-[11px] uppercase tracking-[0.24em] text-[#3AE8FF]/80 sm:text-xs">
            {t.vision}
          </p>
        </header>

        {/* Command Deck */}
        <OsCommandDeck ar={ar} />

        {/* Live pulse */}
        <OsLivePulse ar={ar} />

        {/* Executive KPIs */}
        <section aria-labelledby="os-kpi-heading" className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <h2
              id="os-kpi-heading"
              className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50 sm:text-xs"
            >
              {t.executive}
            </h2>
            <span
              aria-hidden
              className="hidden h-px flex-1 bg-gradient-to-r from-[#3AE8FF]/40 via-white/10 to-transparent sm:ms-4 sm:block"
            />
          </div>
          <OsExecutiveStrip ar={ar} />
        </section>

        {/* Decision queue */}
        <OsDecisionQueue ar={ar} />

        {/* Modules */}
        <section aria-labelledby="os-modules-heading" className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <h2
              id="os-modules-heading"
              className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50 sm:text-xs"
            >
              {t.modules}
            </h2>
            <span
              aria-hidden
              className="hidden h-px flex-1 bg-gradient-to-r from-[#3AE8FF]/40 via-white/10 to-transparent sm:ms-4 sm:block"
            />
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {STAGES.map((s) => (
              <li key={s.key} className={s.featured ? "sm:col-span-2 lg:col-span-1" : undefined}>
                <RuntimeTile
                  icon={s.icon}
                  labelPrimary={ar ? s.ar : s.en}
                  labelSecondary={ar ? s.en : s.ar}
                  status={t.ready}
                  to={s.to}
                  featured={s.featured}
                />
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.28em] text-white/30 sm:text-[11px]">
          {t.footer}
        </p>
      </main>
    </div>
  );
}
