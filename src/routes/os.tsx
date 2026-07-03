/**
 * /os — Enterprise Operating System hub, natively integrated into nexios.com.
 * Dark-locked, mobile-first, bilingual (EN default, AR toggle), Vision 2030 aligned.
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
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

import { RuntimeTile } from "@/components/os/RuntimeTile";

export const Route = createFileRoute("/os")({
  head: () => ({
    meta: [
      { title: "Enterprise Operating System — NEXIOS AI OS" },
      {
        name: "description",
        content:
          "NEXIOS AI OS — the enterprise operating system for industrial security, Hajj operations, and executive intelligence, aligned with Saudi Vision 2030.",
      },
      { property: "og:title", content: "Enterprise Operating System — NEXIOS AI OS" },
      {
        property: "og:description",
        content:
          "Unified runtime: Digital Twin, Operations, Executive KPIs, Hajj 1447, ARIA Runtime, Realtime, Agents.",
      },
      { property: "og:url", content: "https://neexios.com/os" },
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

// Card grid order per SEC delivery spec (3×3). Arabic labels carry full
// tashkeel (diacritics) so ARIA/TTS pronounces them in formal Modern
// Standard Arabic.
const STAGES: readonly Stage[] = [
  { key: "twin",     ar: "التَّوْأَمُ الرَّقْمِيّ",       en: "Digital Twin",   icon: Radar,       to: "/operations" },
  { key: "org",      ar: "بَيَانَاتُ المُؤَسَّسَة",       en: "Organization",   icon: Building2,   to: "/command-center" },
  { key: "auth",     ar: "المُصَادَقَة",                    en: "Authentication", icon: ShieldCheck, to: "/command-center" },
  { key: "kpi",      ar: "مُؤَشِّرَاتُ الأَدَاءِ التَّنْفِيذِيَّة", en: "Executive KPIs", icon: BarChart3, to: "/executive-reports" },
  { key: "hajj",     ar: "مَنْظُومَةُ الحَجِّ ١٤٤٧",       en: "Hajj 1447",      icon: Moon,        to: "/hajj", featured: true },
  { key: "ops",      ar: "العَمَلِيَّات",                    en: "Operations",     icon: Activity,    to: "/operations" },
  { key: "aria",     ar: "آرِيَا — المُحَرِّكُ التَّنْفِيذِيّ", en: "ARIA Runtime", icon: Sparkles, to: "/command-center" },
  { key: "realtime", ar: "البَثُّ اللَّحْظِيّ",             en: "Realtime",       icon: Radio,       to: "/operations" },
  { key: "agents",   ar: "الوُكَلَاءُ الأَذْكِيَاء",         en: "AI Agents",       icon: Bot,         to: "/exec" },
] as const;

function OsHub() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  // Lock dark mode while on /os — restore previous class on unmount.
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
    ready: ar ? "جَاهِز" : "Ready",
    footer: ar ? "مِنَصَّةُ تَشْغِيلِ المُؤَسَّسَة · النُّسْخَةُ ١٫٠" : "Enterprise Runtime · v1.0",
  };

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      data-surface="os"
      className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-[#0a0e1a] text-white"
      style={{ background: "radial-gradient(1200px 600px at 50% -10%, rgba(0,212,255,0.10), transparent 60%), linear-gradient(180deg, #0a0e1a 0%, #0f1729 100%)" }}
    >
      {/* Dot-grid ambient overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,212,255,0.35) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute -top-40 start-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#00D4FF]/10 blur-[120px] motion-safe:animate-pulse" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 start-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#3AE8FF]/10 blur-[120px] motion-safe:animate-pulse" />

      {/* Sticky top strip */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-4 pt-3 sm:px-6">
        <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60 backdrop-blur">
          NEXIOS · OS
        </span>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-16 pt-20 sm:px-6 sm:pt-24">
        <div className="mb-8 text-center sm:mb-10">
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

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.28em] text-white/30 sm:mt-10 sm:text-[11px]">
          {t.footer}
        </p>
      </div>
    </div>
  );
}
