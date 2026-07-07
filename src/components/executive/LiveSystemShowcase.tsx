import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Maximize2, Minimize2, Radio, Expand, Moon, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import hajjDashboardPoster from "@/assets/hajj-dashboard-poster.png.asset.json";


// Live embed URL — same source configured for /hajj-prime, kept in an env
// var so it can be re-pointed without a code change. Dark-theme params are
// appended so the platform boots in permanent night mode inside the frame.
const RAW_EMBED_URL =
  (import.meta.env.VITE_HAJJ_EMBED_URL as string | undefined) ??
  "https://hajj.neexios.com/?theme=dark&forceDark=1#dark";
function withDarkParams(url: string): string {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.href : "https://neexios.com");
    u.searchParams.set("theme", "dark");
    u.searchParams.set("forceDark", "1");
    if (!u.hash) u.hash = "dark";
    return u.toString();
  } catch {
    return url;
  }
}
const LIVE_URL = withDarkParams(RAW_EMBED_URL);
const INTERNAL_URL = "/hajj-prime";


/**
 * LiveSystemShowcase — compact, right-aligned (RTL) Hajj night-mode window.
 *
 * Engineering directives:
 *  • Permanent dark mode (forced via URL params + `color-scheme: dark` + dark backdrop).
 *  • Right-anchored on wide screens (sits to the right side of the hero, beside the Hajj icon column).
 *  • Compact footprint (max-w ~ 520px) yet visually complete: chrome, telemetry, glow.
 *  • No layout shift on small screens — gracefully recenters.
 */
export function LiveSystemShowcase() {
  const [expanded, setExpanded] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const failTimerRef = useRef<number | null>(null);
  const { locale } = useI18n();
  const ar = locale === "ar";

  useEffect(() => {
    // If the iframe hasn't reported `load` within 8s, surface the dark
    // fallback card instead of leaving viewers staring at a white/empty box.
    failTimerRef.current = window.setTimeout(() => {
      setFailed((prev) => (loaded ? prev : true));
    }, 8000);
    return () => {
      if (failTimerRef.current !== null) window.clearTimeout(failTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      className="relative z-10 mx-auto mt-8 w-full max-w-7xl px-4 sm:mt-12 sm:px-6"
      aria-label={ar ? "نافذة نظام الحج المباشرة" : "Live Hajj system window"}
    >

      {/* Right-anchored on ALL devices (RTL start = visual right). No breakpoint switches this. */}
      <div className="flex w-full justify-center">
        {/* Ambient halo behind the window — visible on all breakpoints */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[280px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.28),transparent_65%)] blur-3xl sm:h-[320px] sm:w-[520px]" />

        <div
          className={`group relative overflow-hidden rounded-2xl border border-[#3AE8FF]/35 bg-gradient-to-b from-[#02101e] via-[#04111f] to-[#02101e] shadow-[0_0_50px_-10px_rgba(0,212,255,0.55),inset_0_0_40px_rgba(0,212,255,0.08)] backdrop-blur-xl transition-all duration-500 ${
            expanded ? "w-full max-w-6xl" : "w-full max-w-[520px]"
          }`}
          style={{ colorScheme: "dark" }}
        >
          {/* Conic animated border */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-50 [background:conic-gradient(from_0deg,transparent_0deg,rgba(0,212,255,0.45)_60deg,transparent_120deg,transparent_240deg,rgba(58,232,255,0.45)_300deg,transparent_360deg)] [animation:spin_22s_linear_infinite] [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude] p-[1px]" />

          {/* Title bar — macOS chrome */}
          <div dir="ltr" className="relative flex items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[0_0_6px_rgba(255,95,87,0.7)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[0_0_6px_rgba(254,188,46,0.7)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.7)]" />
            </div>

            <div className="flex flex-1 items-center justify-center">
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] text-white/70">
                <Moon className="h-3 w-3 shrink-0 text-[#3AE8FF] drop-shadow-[0_0_6px_rgba(58,232,255,0.9)]" aria-hidden />
                <span className="text-center">{ar ? "منصة نُسك الحج" : "Hajj Nexus Platform"}</span>
                <Radio className="h-2.5 w-2.5 shrink-0 animate-pulse text-emerald-400" aria-hidden />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="rounded-md border border-white/10 bg-white/5 p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label={expanded ? (ar ? "تصغير" : "Minimize") : (ar ? "تكبير" : "Maximize")}
              >
                {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </button>
              <Link
                to={INTERNAL_URL}
                className="inline-flex items-center gap-1 rounded-md border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-[#3AE8FF]/20"
                aria-label={ar ? "فتح كامل" : "Open full screen"}
              >
                <Expand className="h-2.5 w-2.5" />
              </Link>

            </div>
          </div>

          {/* Live iframe stage — external Hajj Nexus platform, dark-forced.
              Container background matches the app so no white flash ever
              appears; loading/failure overlays are dark-themed. */}
          <div
            className="relative aspect-[16/10] w-full overflow-hidden"
            style={{ backgroundColor: "#04111f", colorScheme: "dark" }}
          >
            {/* Poster fallback — dimmed, sits behind the live iframe */}
            <img
              src={hajjDashboardPoster.url}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="absolute inset-0 z-0 h-full w-full object-cover object-top opacity-40"
              style={{ filter: "saturate(1.05) contrast(1.02)" }}
            />

            {/* Live dashboard — fully visible at native scale, interactive so viewers
                can scroll and inspect every detail from outside the icon frame. */}
            <iframe
              src={LIVE_URL}
              title={ar ? "منصة نُسك الحج — بث مباشر" : "Hajj Nexus Platform — Live"}
              loading="eager"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={() => { setLoaded(true); setFailed(false); }}
              onError={() => setFailed(true)}
              style={{ colorScheme: "dark", backgroundColor: "#04111f" }}

              className="absolute inset-0 z-[5] h-full w-full border-0"
            />


            {/* Subtle cinematic overlays — kept thin so the live feed stays readable */}
            <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(2,16,30,0.05)_0%,transparent_35%,transparent_80%,rgba(2,16,30,0.35)_100%)]" />
            <div className="pointer-events-none absolute inset-0 z-10 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.02)_0px,rgba(255,255,255,0.02)_1px,transparent_1px,transparent_3px)] mix-blend-overlay" />

            {/* Live badge — overlaid on the icon so the "outside" viewer
                immediately reads it as a real, ticking system */}
            <div
              dir="ltr"
              className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.4)] backdrop-blur"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
              LIVE
            </div>

            {/* Dark loading overlay — visible until the frame reports load. */}
            {!loaded && !failed && (
              <div
                role="status"
                aria-live="polite"
                className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3"
                style={{ background: "linear-gradient(180deg,#04111f 0%,#061A2E 55%,#04111f 100%)" }}
              >
                <div
                  aria-hidden
                  className="h-10 w-10 rounded-full border-[3px] border-emerald-400/20"
                  style={{
                    borderTopColor: "#34D399",
                    borderRightColor: "#10B981",
                    animation: "hajj-showcase-spin 900ms linear infinite",
                    boxShadow: "0 0 28px rgba(16,185,129,0.35)",
                  }}
                />
                <div dir="rtl" className="text-[12px] font-semibold text-emerald-100/90">
                  {ar ? "جارٍ فتح منصة نُسك الحج…" : "Opening Hajj Nexus Platform…"}
                </div>
                <style>{`@keyframes hajj-showcase-spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {/* Dark failure card — replaces the (invisible) white iframe when
                loading fails or exceeds the 8s budget. Never white. */}
            {failed && (
              <div
                role="alert"
                className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 p-6 text-center"
                style={{ background: "linear-gradient(180deg,#04111f 0%,#061A2E 55%,#04111f 100%)" }}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-emerald-300">
                  {ar ? "منصة نُسك الحج" : "Hajj Nexus Platform"}
                </div>
                <div className="text-sm text-white/85">
                  {ar ? "جارٍ الاتصال بالبث الحيّ…" : "Connecting to the live feed…"}
                </div>
                <Link
                  to={INTERNAL_URL}
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {ar ? "فتح المنصة" : "Open the platform"}
                </Link>
              </div>
            )}
          </div>



          {/* Footer telemetry strip */}
          <div dir="ltr" className="relative flex items-center justify-between gap-2 border-t border-white/10 bg-black/40 px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-white/55">
            <div className="flex items-center gap-1.5">
              <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
              <span>LIVE · {ar ? "بث مباشر" : "Streaming"}</span>
            </div>

            <div className="hidden sm:block">TLS 1.3</div>
          </div>
        </div>
      </div>
    </section>
  );
}
