import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Compass, Loader2, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * NexusRevealHero — cinematic executive hero for NEXIOS.
 * Deep midnight cyan luxury identity. Bilingual (AR/EN) with RTL/LTR aware
 * arrow direction and copy. Same props signature as before so
 * `ExecutiveHeroStage` (KPI rails + particle aura) keeps working.
 *
 * Design principles: calm, minimal, glass, soft blue glow, executive-grade.
 * Inspired by Apple Vision Pro / Linear / Stripe — no noisy motion, no amber
 * sunrise, no distracting particles inside the copy zone.
 */
export function NexusRevealHero({
  onEnterOps,
}: {
  onEnterOps?: () => void;
}) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [launching, setLaunching] = useState(false);

  const handleLaunch = () => {
    if (launching) return;
    setLaunching(true);
    // Mark this click as a fresh user gesture so the AriaDock on the next
    // route can legally start TTS playback and request mic access without
    // being blocked by the browser's autoplay policy.
    try { sessionStorage.setItem("nexus.audio-gesture", "1"); } catch { /* noop */ }
    window.setTimeout(() => { onEnterOps?.(); }, 700);
  };

  const scrollToAria = () => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("aria-quick-ask");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const Arrow = ar ? ArrowLeft : ArrowRight;

  const t = {
    scene:      ar ? "المشهد التنفيذي" : "Executive Reveal",
    line1:      ar ? "الذكاء يقود." : "Intelligence, in command.",
    line2:      ar ? "نكسيوس ينفّذ." : "NEXIOS executes.",
    lede:       ar
      ? "منظومة تشغيل ذكية للمؤسسات · ARIA في القلب · إدارة الأمن الصناعي · المنطقة الغربية."
      : "Enterprise AI operating system · ARIA at the core · Industrial Security · Western Region.",
    ctaPrimary: ar ? "ابدأ التشغيل" : "Start Operation",
    ctaSecondary: ar ? "غرفة القيادة التنفيذية" : "Executive Bridge",
    ctaAria:    ar ? "اسأل ARIA" : "Ask ARIA",
    boot:       ar ? "تهيئة بيئة التشغيل…" : "Booting operating environment…",
    booting:    ar ? "جارٍ تشغيل النظام…" : "Launching platform…",
    trust: ar
      ? ["المؤسسات", "الحكومات", "الأمن الصناعي", "Fortune 500"]
      : ["Enterprises", "Governments", "Industrial Security", "Fortune 500"],
    status: ar ? "المنظومة متصلة · GPT-5 · ثنائية اللغة" : "System online · GPT-5 · Bilingual",
  };

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      data-scene="nexus-reveal"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#02060F] text-white"
    >
      {/* Deep-space cyan backdrop — layered mesh + vignette. Fully decorative. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 8%, rgba(0,212,255,0.22) 0%, rgba(0,212,255,0.06) 30%, transparent 55%)," +
              "radial-gradient(ellipse 70% 55% at 50% 100%, rgba(58,232,255,0.18) 0%, rgba(6,26,46,0.55) 40%, transparent 70%)," +
              "linear-gradient(180deg, #02060F 0%, #061A2E 55%, #02060F 100%)",
          }}
        />
        {/* Subtle grid — luxury enterprise polish */}
        <div
          className="absolute inset-0 opacity-[0.18] motion-reduce:opacity-[0.10]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,212,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.10) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 45%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 45%, transparent 78%)",
          }}
        />
        {/* Cinematic light sweep */}
        <div
          className="absolute -inset-x-40 top-1/3 h-[60vh] opacity-40 mix-blend-screen motion-reduce:hidden"
          style={{
            background:
              "linear-gradient(105deg, transparent 30%, rgba(58,232,255,0.22) 50%, transparent 70%)",
            animation: "nxh-sweep 12s ease-in-out infinite",
            filter: "blur(40px)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.6)_100%)]" />
      </div>

      {/* Foreground content */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-5 text-center">
        {/* Status pill */}
        <div
          className="inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/25 bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-[#3AE8FF]/85 backdrop-blur-md"
          style={{ animation: "nxh-fade 900ms ease-out both" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-[#3AE8FF] motion-safe:animate-ping opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#3AE8FF]" />
          </span>
          {t.status}
        </div>

        {/* ============================================================
            ARIA — Executive Presence (Centerpiece)
            The emotional anchor of the hero. Purely visual — the real
            conversational ARIA lives in GlobalAriaCopilot + the
            #aria-quick-ask badge below. Do NOT wire audio/mic here.
        ============================================================ */}
        <div
          aria-hidden
          className="relative mt-10 flex flex-col items-center"
          style={{ animation: "nxh-fade 1400ms ease-out 120ms both" }}
        >
          {/* Volumetric halo + rim glow */}
          <div className="relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72">
            <div className="absolute h-56 w-56 rounded-full bg-[#00D4FF]/10 blur-[80px] motion-safe:animate-[nxh-breath_5s_ease-in-out_infinite] sm:h-72 sm:w-72" />
            <div className="absolute h-40 w-72 rotate-12 rounded-full bg-[#3AE8FF]/[0.06] blur-[46px] motion-reduce:hidden sm:h-48 sm:w-96" />

            {/* Breathing outer rings */}
            <div className="absolute inset-4 rounded-full border border-[#3AE8FF]/25 motion-safe:animate-[nxh-ring_4.5s_ease-in-out_infinite]" />
            <div className="absolute inset-0 rounded-full border border-white/10" />
            <div className="absolute inset-8 rounded-full border border-[#3AE8FF]/15 motion-safe:animate-[nxh-ring_4.5s_ease-in-out_1.5s_infinite]" />

            {/* Glass executive core */}
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-white/[0.18] via-[#3AE8FF]/[0.08] to-transparent shadow-[0_0_60px_rgba(0,212,255,0.35),inset_0_0_40px_rgba(58,232,255,0.20)] backdrop-blur-xl sm:h-52 sm:w-52">
              {/* Inner luminous chamber */}
              <div className="relative flex h-28 w-28 items-end justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_35%,rgba(58,232,255,0.35)_0%,rgba(6,26,46,0.85)_65%,#02060F_100%)] shadow-[inset_0_0_25px_rgba(255,255,255,0.14)] sm:h-36 sm:w-36">
                {/* Streaming particle lines (behind silhouette) */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-around px-3 motion-reduce:hidden">
                  {[
                    { d: 2.1, delay: 0.2, h: "h-6",  o: "bg-[#3AE8FF]/40" },
                    { d: 1.8, delay: 0.7, h: "h-9",  o: "bg-[#3AE8FF]/60" },
                    { d: 2.5, delay: 0.4, h: "h-5",  o: "bg-[#3AE8FF]/30" },
                    { d: 2.2, delay: 1.1, h: "h-10", o: "bg-[#3AE8FF]/55" },
                    { d: 1.9, delay: 0.1, h: "h-7",  o: "bg-[#3AE8FF]/40" },
                  ].map((p, i) => (
                    <span
                      key={i}
                      className={`block w-px ${p.h} ${p.o} rounded-full`}
                      style={{
                        animation: `nxh-stream ${p.d}s linear ${p.delay}s infinite`,
                      }}
                    />
                  ))}
                </div>

                {/* Executive silhouette */}
                <svg
                  className="relative z-10 mb-2 h-14 w-14 translate-y-1 text-[#DFF6FF]/70 drop-shadow-[0_0_14px_rgba(58,232,255,0.55)] sm:h-16 sm:w-16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 4a4 4 0 100 8 4 4 0 000-8zM4 18c0-2.2 3.6-4 8-4s8 1.8 8 4v2H4v-2z" />
                </svg>

                {/* Vertical pulse (voice-line vibe) */}
                <div className="absolute inset-0 z-20 flex items-center justify-center motion-reduce:hidden">
                  <div className="h-12 w-px bg-[#3AE8FF]/70 blur-[1px] motion-safe:animate-[nxh-pulse_1.6s_ease-in-out_infinite]" />
                </div>
              </div>

              {/* Highlight speck */}
              <div className="absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_#fff]" />
            </div>
          </div>

          {/* ARIA nameplate */}
          <div className="mt-6 flex flex-col items-center">
            <h2 className="text-3xl font-extralight uppercase tracking-[0.35em] text-white sm:text-4xl">
              {ar ? "آريا" : "ARIA"}
            </h2>
            <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-[#3AE8FF]/75 sm:tracking-[0.5em]">
              {ar ? "الذكاء التنفيذي" : "Executive Intelligence"}
            </p>
          </div>
        </div>

        {/* Subordinate NEXIOS wordmark — ARIA leads, NEXIOS supports */}
        <div
          className="mt-10 bg-gradient-to-b from-white via-[#DFF6FF] to-[#3AE8FF] bg-clip-text text-[10vw] font-semibold leading-[0.92] tracking-[-0.045em] text-transparent sm:text-7xl lg:text-8xl"
          style={{
            animation: "nxh-lockup 1200ms cubic-bezier(.22,.61,.36,1) 400ms both",
            fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            textShadow: "0 0 60px rgba(0,212,255,0.25)",
          }}
        >
          NEXIOS
        </div>
        <div
          className="mt-2 text-[11px] uppercase tracking-[0.5em] text-white/60 sm:text-xs sm:tracking-[0.6em]"
          style={{ animation: "nxh-fade 900ms ease-out 900ms both" }}
        >
          AI · OS
        </div>
        <div
          className="mx-auto mt-5 h-px w-32 bg-gradient-to-r from-transparent via-[#3AE8FF]/70 to-transparent sm:w-40"
          style={{ animation: "nxh-line 900ms ease-out 700ms both" }}
        />


        {/* Headline */}
        <h1
          className="mt-8 text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          style={{ animation: "nxh-fade 900ms ease-out 400ms both" }}
        >
          <span className="block text-white/95">{t.line1}</span>
          <span className="mt-1 block bg-gradient-to-br from-[#DFF6FF] to-[#00D4FF] bg-clip-text text-transparent">
            {t.line2}
          </span>
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base"
          style={{ animation: "nxh-fade 900ms ease-out 600ms both" }}
        >
          {t.lede}
        </p>

        {/* CTAs */}
        <div
          className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
          style={{ animation: "nxh-fade 900ms ease-out 800ms both" }}
        >
          <button
            type="button"
            onClick={handleLaunch}
            disabled={launching}
            aria-busy={launching}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#00D4FF] to-[#3AE8FF] px-7 py-3.5 text-sm font-semibold text-[#02060F] shadow-[0_10px_50px_-12px_rgba(0,212,255,0.85)] transition-transform duration-300 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3AE8FF] disabled:cursor-wait disabled:opacity-95"
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent transition-transform duration-700 ${launching ? "translate-x-full" : "group-hover:translate-x-full"}`}
            />
            {launching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.booting}</span>
              </>
            ) : (
              <>
                <span>{t.ctaPrimary}</span>
                <Arrow className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              </>
            )}
          </button>

          <Link
            to="/exec"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-[#3AE8FF]/50 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3AE8FF]"
          >
            <Compass className="h-4 w-4 text-[#3AE8FF]" />
            <span>{t.ctaSecondary}</span>
          </Link>

          <button
            type="button"
            onClick={scrollToAria}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#3AE8FF]/35 bg-[#3AE8FF]/[0.06] px-6 py-3.5 text-sm font-semibold text-[#DFF6FF] transition hover:bg-[#3AE8FF]/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3AE8FF]"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{t.ctaAria}</span>
          </button>
        </div>

        {/* Trust bar */}
        <div
          className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[9px] uppercase tracking-[0.28em] text-white/40 sm:mt-12 sm:gap-x-6 sm:text-[10px] sm:tracking-[0.35em]"
          style={{ animation: "nxh-fade 900ms ease-out 1000ms both" }}
        >
          {t.trust.map((label, i, arr) => (
            <span key={label} className="inline-flex items-center gap-3">
              <span>{label}</span>
              {i < arr.length - 1 ? <span aria-hidden className="text-[#3AE8FF]/40">·</span> : null}
            </span>
          ))}
        </div>
      </div>

      {/* LAUNCH OVERLAY */}
      <div
        aria-hidden={!launching}
        className={`pointer-events-none fixed inset-0 z-[80] flex items-center justify-center transition-opacity duration-500 ${launching ? "opacity-100" : "opacity-0"}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.35)_0%,rgba(2,6,15,0.9)_55%,#02060F_85%)]" />
        <div className="absolute inset-0 backdrop-blur-md" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full border border-[#3AE8FF]/40" style={{ animation: "nxh-launch-ring 1.2s ease-out infinite" }} />
            <div className="absolute inset-2 rounded-full border border-[#3AE8FF]/30" style={{ animation: "nxh-launch-ring 1.2s ease-out 0.25s infinite" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#3AE8FF]" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold tracking-[0.4em] text-[#DFF6FF]">NEXIOS · BOOT</div>
            <div className="mt-1 text-xs text-white/70">{t.boot}</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes nxh-lockup {
          0%   { opacity: 0; letter-spacing: 0.35em; filter: blur(14px); transform: translateY(8px); }
          60%  { opacity: 1; letter-spacing: -0.02em; filter: blur(0); }
          100% { opacity: 1; letter-spacing: -0.045em; filter: blur(0); transform: translateY(0); }
        }
        @keyframes nxh-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes nxh-line { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }
        @keyframes nxh-sweep {
          0%,100% { transform: translateX(-10%); }
          50%     { transform: translateX(10%); }
        }
        @keyframes nxh-launch-ring {
          0%   { opacity: 0.9; transform: scale(0.6); }
          100% { opacity: 0;   transform: scale(1.8); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-scene="nexus-reveal"] * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
    </section>
  );
}

export default NexusRevealHero;
