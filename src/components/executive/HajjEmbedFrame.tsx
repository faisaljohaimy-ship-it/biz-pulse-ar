/**
 * HajjEmbedFrame — the Nusuk cinematic SHOWCASE CARD.
 *
 * Architectural decision (owner directive): the Nusuk platform's hosting
 * blocks iframing (X-Frame-Options / CSP frame-ancestors) — outside our
 * control and never worked around. The old in-page embed + connecting
 * timeout flow is retired ENTIRELY. This component now renders instantly:
 * a window-chrome frame (the three dots stay) whose cover is a LIVE-look
 * command-dashboard preview of the Hajj operations center (brand + LIVE
 * strip, six KPI tiles with corner brackets, systems status line — the
 * same demo dataset as HajjCommandDashboard), followed by a footer with
 * the "independent platform" badge and a prominent external-open action.
 * The WHOLE card is one link: a real <a target="_blank" rel="noopener
 * noreferrer"> inside the user's direct gesture (iOS-safe — no
 * window.open in async code). No loading state, no failure state.
 */
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { HAJJ_PLATFORM, HAJJ_INTERNAL_ROUTE } from "@/config/platforms";

interface Props {
  /** Kept for call-site compatibility; the card is always tappable. */
  readonly interactive?: boolean;
  readonly ar?: boolean;
  readonly className?: string;
}

/* Same demo figures as HajjCommandDashboard so the preview and the full
   dashboard below it never contradict each other. */
const COVER_KPIS = [
  {
    ar: "معدّل الامتثال",
    en: "Compliance",
    v: "97%",
    dAr: "إنجاز المهام",
    dEn: "Task completion",
    up: true,
    c: "#7DD3FC",
    Ic: CheckCircle2,
  },
  {
    ar: "المحطات التشغيلية",
    en: "Stations",
    v: "3/4",
    dAr: "حالة الشبكة",
    dEn: "Network status",
    up: true,
    c: "#9B8BFF",
    Ic: Building2,
  },
  {
    ar: "الموظفون في الميدان",
    en: "Field staff",
    v: "256",
    dAr: "متصل الآن",
    dEn: "Online now",
    up: true,
    c: "#34B6FF",
    Ic: Users,
  },
  {
    ar: "المهام المنجزة",
    en: "Tasks done",
    v: "28",
    dAr: "خلال اليوم",
    dEn: "Today",
    up: true,
    c: "#1EE9B6",
    Ic: ShieldCheck,
  },
  {
    ar: "التنبيهات النشطة",
    en: "Active alerts",
    v: "05",
    dAr: "تتطلّب اهتمامًا",
    dEn: "Need attention",
    up: false,
    c: "#FF9F1C",
    Ic: ShieldAlert,
  },
  {
    ar: "الحوادث المفتوحة",
    en: "Open incidents",
    v: "03",
    dAr: "آخر 24 ساعة",
    dEn: "Last 24h",
    up: false,
    c: "#FF4D6D",
    Ic: AlertTriangle,
  },
] as const;

/** Cover — a live-look command-dashboard preview (decorative; the badge,
    tagline and CTA below carry the accessible text). */
function NusukCommandCover({ ar }: { readonly ar: boolean }) {
  return (
    <div
      aria-hidden
      dir={ar ? "rtl" : "ltr"}
      className="absolute inset-0 flex flex-col overflow-hidden bg-gradient-to-b from-[#04243c] to-[#04111f] p-2.5 sm:p-4"
    >
      {/* blueprint grid + top glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,182,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(52,182,255,.06) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-70"
        style={{
          background: "radial-gradient(50% 100% at 50% 0%, rgba(125,211,252,.30), transparent 70%)",
        }}
      />

      {/* brand + LIVE strip */}
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#3AE8FF]/12 ring-1 ring-[#3AE8FF]/40 sm:h-8 sm:w-8">
            <Radio className="h-3.5 w-3.5 text-[#3AE8FF] sm:h-4 sm:w-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[11px] font-bold text-white sm:text-xs">
              {ar ? HAJJ_PLATFORM.name_ar : HAJJ_PLATFORM.name_en}
            </div>
            <div className="truncate text-[7px] tracking-[0.28em] text-[#7DD3FC]/80 sm:text-[8px]">
              HAJJ OPERATIONS COMMAND
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[9px] font-bold tracking-[0.14em] text-white/85 sm:text-[10px]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          {ar ? "مباشر · حج 1447هـ" : "LIVE · HAJJ 1447"}
        </div>
      </div>

      {/* KPI tiles — all six visible on every device (3×2 → 6×1),
          vertically centered so wide screens never stretch the tiles */}
      <div className="relative flex min-h-0 flex-1 items-center py-2 sm:py-3">
        <div className="grid w-full grid-cols-3 gap-1.5 sm:gap-2 lg:grid-cols-6">
          {COVER_KPIS.map((k) => (
            <div
              key={k.en}
              className="relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-lg border bg-[#061A2E]/60 p-1.5 backdrop-blur-sm sm:rounded-xl sm:p-2 lg:gap-1.5 lg:p-3"
              style={{ borderColor: `color-mix(in oklab, ${k.c} 30%, transparent)` }}
            >
              {/* corner brackets */}
              <span className="pointer-events-none absolute inset-0">
                <span
                  className="absolute end-0 top-0 h-2 w-2 border-e border-t"
                  style={{ borderColor: `color-mix(in oklab, ${k.c} 60%, transparent)` }}
                />
                <span
                  className="absolute bottom-0 start-0 h-2 w-2 border-b border-s"
                  style={{ borderColor: `color-mix(in oklab, ${k.c} 60%, transparent)` }}
                />
              </span>
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[8px] text-white/70 sm:text-[9px]">
                  {ar ? k.ar : k.en}
                </span>
                <k.Ic className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" style={{ color: k.c }} />
              </div>
              <div className="text-sm font-bold tabular-nums text-white sm:text-lg lg:text-2xl">
                {k.v}
              </div>
              <div
                className="truncate text-[7px] sm:text-[8px]"
                style={{ color: k.up ? "#1EE9B6" : "#FF9F1C" }}
              >
                {k.up ? "↑" : "↓"} {ar ? k.dAr : k.dEn}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* systems status strip */}
      <div className="relative mt-1.5 flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 text-[7px] tracking-[0.16em] text-white/55 sm:mt-2 sm:text-[8px]">
        <span className="inline-flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-[#1EE9B6]" /> ALL SYSTEMS NOMINAL
        </span>
        <span className="hidden sm:inline">UPTIME 99.97%</span>
        <span>NETWORK · SECURE TUNNEL</span>
      </div>
    </div>
  );
}

export function HajjEmbedFrame({ ar = true, className = "" }: Props) {
  const url = HAJJ_PLATFORM.url;
  const name = ar ? HAJJ_PLATFORM.name_ar : HAJJ_PLATFORM.name_en;
  const tagline = ar ? HAJJ_PLATFORM.tagline_ar : HAJJ_PLATFORM.tagline_en;

  const body = (
    <>
      {/* window chrome — the three dots stay */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/45 px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </div>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-0.5 text-[11px] text-white/70">
          {name}
        </span>
        <ExternalLink className="h-3.5 w-3.5 text-[#3AE8FF]/70" aria-hidden />
      </div>

      {/* cover stage — the live command-dashboard preview */}
      <div className="relative aspect-[16/9] max-h-[360px] min-h-[240px] w-full overflow-hidden">
        <NusukCommandCover ar={ar} />
      </div>

      {/* footer — badge + tagline + external-open action (no dead zones:
          this whole footer is inside the same single link) */}
      <div
        dir={ar ? "rtl" : "ltr"}
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/10 bg-[#04111f]/95 px-4 py-3"
      >
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-950/60 px-3 py-1 text-[10px] font-semibold tracking-wide text-emerald-200">
            <MapPin className="h-3 w-3" aria-hidden />
            {ar ? "منصة مستقلة · تفتح خارجيًا" : "Independent platform · opens externally"}
          </span>
          <p className="mt-1.5 max-w-md text-[11px] leading-relaxed text-white/70 sm:text-xs">
            {tagline}
          </p>
        </div>
        <span className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-5 py-2 text-sm font-semibold text-white transition group-hover:bg-[#3AE8FF]/20">
          <ExternalLink className="h-4 w-4" aria-hidden />
          {ar ? "فتح المنصة" : "Open platform"}
        </span>
      </div>
    </>
  );

  const frameClass = `group relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-[#3AE8FF]/25 bg-[#04111f] transition hover:border-[#3AE8FF]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 active:scale-[0.99] ${className}`;

  // The whole card is ONE link — no dead zones. External when configured,
  // internal showcase route otherwise (env unset).
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name}
      title={ar ? "يُفتح في نافذة جديدة" : "Opens in a new tab"}
      className={frameClass}
    >
      {body}
    </a>
  ) : (
    <Link to={HAJJ_INTERNAL_ROUTE} aria-label={name} className={frameClass}>
      {body}
    </Link>
  );
}
