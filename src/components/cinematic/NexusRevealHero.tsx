import { Link } from "@tanstack/react-router";
import { ArrowLeft, Compass, Loader2 } from "lucide-react";
import { useState } from "react";

/**
 * NexusRevealHero — the cinematic "Reveal" scene from the landing page,
 * repurposed as the FIRST screen of the operational dashboard.
 * Self-contained: SVG horizon, sun corona, converging light streams,
 * concentric rings, golden NEXUS lockup, RTL Arabic typography.
 */
export function NexusRevealHero({
  onEnterOps,
}: {
  onEnterOps?: () => void;
}) {
  const [launching, setLaunching] = useState(false);
  const handleLaunch = () => {
    if (launching) return;
    setLaunching(true);
    // Mark this click as a fresh user gesture so the AriaDock on the next
    // route can legally start TTS playback and request mic access without
    // being blocked by the browser's autoplay policy.
    try { sessionStorage.setItem("nexus.audio-gesture", "1"); } catch { /* noop */ }
    window.setTimeout(() => {
      onEnterOps?.();
    }, 900);
  };
  const streams = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    return { a, delay: (i % 6) * 0.18 };
  });

  return (
    <section
      dir="rtl"
      data-scene="nexus-reveal"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-black"
    >
      {/* SUNRISE HORIZON */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(245,180,84,0.55)_0%,rgba(184,84,32,0.25)_18%,rgba(20,30,80,0.45)_38%,#02030a_70%)]" />
        <div className="absolute inset-x-[-20%] bottom-[18%] h-[26%] bg-gradient-to-t from-amber-400/35 via-rose-300/20 to-transparent blur-2xl" />
        <div
          className="absolute left-1/2 bottom-[6%] h-[420px] w-[420px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,243,196,0.95) 0%, rgba(245,180,84,0.55) 30%, rgba(245,140,60,0.18) 55%, transparent 75%)",
            animation: "nxh-core 5s ease-in-out infinite",
            filter: "blur(6px)",
          }}
        />
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-full w-full">
          <defs>
            <radialGradient id="nxhEarthRim" cx="50%" cy="100%" r="80%">
              <stop offset="0%" stopColor="rgba(245,180,84,0.9)" />
              <stop offset="22%" stopColor="rgba(180,90,40,0.5)" />
              <stop offset="55%" stopColor="rgba(8,12,30,0.95)" />
              <stop offset="100%" stopColor="#02030a" />
            </radialGradient>
            <radialGradient id="nxhAtmoGlow" cx="50%" cy="100%" r="70%">
              <stop offset="0%" stopColor="rgba(120,180,255,0.35)" />
              <stop offset="40%" stopColor="rgba(60,90,200,0.12)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <ellipse cx="800" cy="1080" rx="1400" ry="380" fill="url(#nxhAtmoGlow)" />
          <ellipse cx="800" cy="1180" rx="1300" ry="340" fill="url(#nxhEarthRim)" />
          <ellipse cx="800" cy="840" rx="1300" ry="3" fill="rgba(255,220,160,0.85)" />
          <ellipse cx="800" cy="840" rx="1300" ry="10" fill="rgba(245,180,84,0.35)" filter="blur(6px)" />
        </svg>

        {/* sun rays */}
        {[-30, -15, 0, 15, 30].map((rot, i) => (
          <div
            key={`ray-${i}`}
            className="absolute left-1/2 bottom-[10%] h-[80vh] w-[140px] origin-bottom -translate-x-1/2 opacity-60"
            style={{
              transform: `translateX(-50%) rotate(${rot}deg)`,
              background:
                "linear-gradient(to top, rgba(255,220,160,0.35), rgba(245,180,84,0.08) 40%, transparent 75%)",
              filter: "blur(18px)",
              animation: `nxh-beam ${6 + i}s ease-in-out ${i * 0.5}s infinite alternate`,
            }}
          />
        ))}

        {/* starfield dots */}
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={`star-${i}`}
            className="absolute h-[2px] w-[2px] rounded-full bg-white/70"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${(i * 31) % 60}%`,
              opacity: 0.35 + ((i * 7) % 50) / 100,
              animation: `nxh-fade ${3 + (i % 4)}s ease-in-out ${i * 0.1}s infinite alternate`,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

      {/* Converging light streams + concentric rings + core flare */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {streams.map((s, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-[2px] w-[60vmax] origin-left rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgba(245,180,84,0) 0%, rgba(245,180,84,0.9) 70%, rgba(255,255,255,1) 100%)",
              transform: `translate(-100%, -50%) rotate(${(s.a * 180) / Math.PI}deg)`,
              animation: `nxh-stream 4.6s cubic-bezier(.22,.61,.36,1) ${s.delay}s infinite`,
              opacity: 0,
            }}
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <span
            key={`r${i}`}
            className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/40"
            style={{ animation: `nxh-ring 5.6s ease-out ${i * 0.9}s infinite` }}
          />
        ))}
        <span
          className="absolute left-1/2 top-1/2 h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,243,196,0.95) 0%, rgba(245,180,84,0.55) 35%, rgba(245,180,84,0) 70%)",
            animation: "nxh-core 3.4s ease-in-out infinite",
            filter: "blur(2px)",
          }}
        />
      </div>

      {/* Foreground content */}
      <div className="relative z-10 mx-auto max-w-4xl px-5 text-center">
        <p className="text-[10px] uppercase tracking-[0.5em] text-amber-300/80 sm:text-xs">
          المشهد ١٠ · الكشف
        </p>

        <div className="mt-8 sm:mt-10">
          <div
            className="bg-gradient-to-br from-white via-amber-100 to-amber-400 bg-clip-text text-[15vw] font-bold leading-[0.92] tracking-[-0.04em] text-transparent sm:text-9xl"
            style={{
              animation: "nxh-lockup 3.2s cubic-bezier(.22,.61,.36,1) both",
              textShadow: "0 0 60px rgba(245,180,84,0.35)",
              fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            }}
          >
            NEXIOS
          </div>
          <div
            className="mt-2 text-[11px] uppercase tracking-[0.4em] text-white/65 sm:text-sm sm:tracking-[0.7em]"
            style={{ animation: "nxh-fade 2s ease-out 1.4s both" }}
          >
            AI&nbsp;·&nbsp;OS
          </div>
          <div
            className="mx-auto mt-5 h-px w-32 bg-gradient-to-r from-transparent via-amber-300/80 to-transparent sm:mt-6 sm:w-40"
            style={{ animation: "nxh-line 1.8s ease-out 1.2s both" }}
          />
        </div>

        <h2 className="mt-8 text-2xl font-bold leading-[1.1] tracking-tight sm:mt-10 sm:text-5xl lg:text-6xl">
          <span className="block text-white/90">المستقبل ذكي.</span>
          <span className="mt-1 block bg-gradient-to-br from-amber-200 to-amber-500 bg-clip-text text-transparent">
            المستقبل نكسس.
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:mt-6 sm:text-lg">
          شبكة ذكاء عالمية · نظام تشغيل واحد · إدارة الأمن الصناعي · المنطقة الغربية
        </p>

        <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={handleLaunch}
            disabled={launching}
            aria-busy={launching}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3.5 text-sm font-semibold text-black shadow-[0_10px_60px_-10px_rgba(245,180,84,0.9)] transition hover:scale-[1.03] disabled:cursor-wait disabled:opacity-95 sm:px-7"
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ${launching ? "translate-x-full" : "group-hover:translate-x-full"}`}
            />
            {launching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جارٍ تشغيل النظام…</span>
              </>
            ) : (
              <>
                ابدأ التشغيل
                <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
              </>
            )}
          </button>
          <Link
            to="/exec"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10 sm:px-7"
          >
            <Compass className="h-4 w-4" />
            غرفة القيادة التنفيذية
          </Link>
        </div>

        {/* LAUNCH OVERLAY — radial flash + boot text */}
        <div
          aria-hidden={!launching}
          className={`pointer-events-none fixed inset-0 z-[80] flex items-center justify-center transition-opacity duration-700 ${launching ? "opacity-100" : "opacity-0"}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,180,84,0.35)_0%,rgba(2,3,10,0.85)_55%,#02030a_85%)]" />
          <div className="absolute inset-0 backdrop-blur-md" />
          <div className="relative flex flex-col items-center gap-4">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border border-amber-300/40" style={{ animation: "nxh-launch-ring 1.2s ease-out infinite" }} />
              <div className="absolute inset-2 rounded-full border border-amber-300/30" style={{ animation: "nxh-launch-ring 1.2s ease-out 0.25s infinite" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold tracking-[0.4em] text-amber-200">NEXUS · BOOT</div>
              <div className="mt-1 text-xs text-white/70">تهيئة بيئة التشغيل…</div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[9px] uppercase tracking-[0.25em] text-white/40 sm:mt-12 sm:gap-x-6 sm:text-[10px] sm:tracking-[0.35em]">
          <span>المؤسسات</span>
          <span aria-hidden>·</span>
          <span>الحكومات</span>
          <span aria-hidden>·</span>
          <span>الأمن الصناعي</span>
          <span aria-hidden>·</span>
          <span>Fortune 500</span>
        </div>
      </div>

      <style>{`
        @keyframes nxh-stream {
          0%   { opacity: 0; transform: translate(-100%,-50%) rotate(var(--r,0deg)) scaleX(0.2); }
          40%  { opacity: 1; }
          75%  { opacity: 0.9; transform: translate(-100%,-50%) rotate(var(--r,0deg)) scaleX(1); }
          100% { opacity: 0; transform: translate(-100%,-50%) rotate(var(--r,0deg)) scaleX(1); }
        }
        @keyframes nxh-ring {
          0%   { opacity: 0.85; transform: translate(-50%,-50%) scale(0.2); }
          80%  { opacity: 0;    transform: translate(-50%,-50%) scale(3.6); }
          100% { opacity: 0;    transform: translate(-50%,-50%) scale(3.6); }
        }
        @keyframes nxh-core {
          0%,100% { opacity: 0.55; transform: translate(-50%,-50%) scale(0.85); }
          50%     { opacity: 1;    transform: translate(-50%,-50%) scale(1.15); }
        }
        @keyframes nxh-lockup {
          0%   { opacity: 0; letter-spacing: 0.6em; filter: blur(18px); transform: translateY(10px); }
          60%  { opacity: 1; letter-spacing: -0.02em; filter: blur(0);  }
          100% { opacity: 1; letter-spacing: -0.04em; filter: blur(0); transform: translateY(0); }
        }
        @keyframes nxh-fade { from { opacity: 0.2; } to { opacity: 1; } }
        @keyframes nxh-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes nxh-beam {
          0%   { opacity: 0.35; transform: translateX(-50%) rotate(var(--rot,0deg)) scaleY(0.95); }
          100% { opacity: 0.75; transform: translateX(-50%) rotate(var(--rot,0deg)) scaleY(1.05); }
        }
        @keyframes nxh-launch-ring {
          0%   { opacity: 0.9; transform: scale(0.6); }
          100% { opacity: 0;   transform: scale(1.8); }
        }
      `}</style>
    </section>
  );
}

export default NexusRevealHero;
