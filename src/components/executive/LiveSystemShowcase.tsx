import { useState } from "react";
import { Maximize2, Minimize2, ExternalLink, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { HajjEmbedFrame } from "@/components/executive/HajjEmbedFrame";
import {
  HAJJ_INTERNAL_ROUTE,
  HAJJ_PLATFORM_LABEL_AR,
  HAJJ_PLATFORM_LABEL_EN,
  hajjEmbedUrl,
} from "@/lib/hajj-embed";

/**
 * LiveSystemShowcase — framed live embed of the external Hajj platform.
 *
 * The dashboard inside the frame is the actual platform (embedded via
 * <HajjEmbedFrame>, URL from VITE_HAJJ_EMBED_URL only). No raw URL is
 * ever rendered as text anywhere — every label is the product name.
 */
export function LiveSystemShowcase() {
  const [expanded, setExpanded] = useState(true);
  const { locale } = useI18n();
  const ar = locale === "ar";
  const url = hajjEmbedUrl();
  const label = ar ? HAJJ_PLATFORM_LABEL_AR : HAJJ_PLATFORM_LABEL_EN;

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      className="relative z-10 mx-auto mt-8 w-full max-w-7xl px-4 sm:mt-12 sm:px-6"
      aria-label={ar ? "معاينة نظام الحج المباشرة" : "Hajj system live preview"}
    >
      <div className="flex w-full justify-center">
        {/* Ambient halo */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[280px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.28),transparent_65%)] blur-3xl sm:h-[320px] sm:w-[520px]" />

        <div
          className={`group relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-b from-[#02101e] via-[#04111f] to-[#02101e] shadow-[0_0_50px_-10px_hsl(var(--primary)/0.55),inset_0_0_40px_hsl(var(--primary)/0.08)] backdrop-blur-xl transition-all duration-500 ${
            expanded ? "w-full max-w-6xl" : "w-full max-w-[520px]"
          }`}
          style={{ colorScheme: "dark" }}
        >
          {/* Conic animated border */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-50 [background:conic-gradient(from_0deg,transparent_0deg,hsl(var(--primary)/0.45)_60deg,transparent_120deg,transparent_240deg,hsl(var(--primary)/0.45)_300deg,transparent_360deg)] [animation:spin_22s_linear_infinite] [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude] p-[1px]" />

          {/* Minimal browser chrome — traffic dots + product pill + controls. */}
          <div
            dir="ltr"
            className="relative flex items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-3 py-2"
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[0_0_6px_rgba(255,95,87,0.7)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[0_0_6px_rgba(254,188,46,0.7)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.7)]" />
            </div>

            {/* Address pill — the product name, NEVER a raw URL. */}
            <div className="flex flex-1 items-center justify-center">
              <div className="flex max-w-[70%] items-center gap-1.5 truncate rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] text-white/60">
                <span dir="rtl" className="truncate">
                  {HAJJ_PLATFORM_LABEL_AR}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="rounded-md border border-white/10 bg-white/5 p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label={expanded ? (ar ? "تصغير" : "Minimize") : ar ? "تكبير" : "Maximize"}
              >
                {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </button>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-primary/20"
                  aria-label={ar ? `فتح ${label} في نافذة جديدة` : `Open ${label} in a new tab`}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : (
                <Link
                  to={HAJJ_INTERNAL_ROUTE}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-primary/20"
                  aria-label={label}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              )}
            </div>
          </div>

          {/* Live embed stage — identical desktop dashboard on every device. */}
          <HajjEmbedFrame ar={ar} interactive />

          {/* Bottom action row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/50 px-3 py-2.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">
              {ar ? "منصة مستقلة · نُسك الحج" : "Standalone · Nusuk Hajj"}
            </span>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/15 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_6px_24px_hsl(var(--primary)/0.25)] transition hover:border-primary hover:bg-primary/25"
              >
                <MapPin className="h-3.5 w-3.5" />
                {ar ? `فتح ${HAJJ_PLATFORM_LABEL_AR}` : `Open ${HAJJ_PLATFORM_LABEL_EN}`}
                <ExternalLink className="h-3 w-3 opacity-80" />
              </a>
            ) : (
              <Link
                to={HAJJ_INTERNAL_ROUTE}
                className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/15 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_6px_24px_hsl(var(--primary)/0.25)] transition hover:border-primary hover:bg-primary/25"
              >
                <MapPin className="h-3.5 w-3.5" />
                {ar ? `فتح ${HAJJ_PLATFORM_LABEL_AR}` : `Open ${HAJJ_PLATFORM_LABEL_EN}`}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
