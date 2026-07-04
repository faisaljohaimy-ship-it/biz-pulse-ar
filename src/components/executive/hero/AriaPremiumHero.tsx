/**
 * AriaPremiumHero — the 2030-grade ARIA hero.
 *
 * Layout: two-column on desktop (headline + CTAs LEFT, ARIA holographic
 * environment RIGHT), single column on mobile with ARIA anchored above the
 * headline. The global AriaGlobalBackdrop provides the living figure —
 * this component supplies the neural stage, glass panels, particles, and
 * executive typography around her.
 *
 * Everything is production-ready: RTL native, prefers-reduced-motion
 * respected, tap targets ≥44px, semantic tokens for color, GPU-friendly
 * transforms only.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, LayoutGrid, Play, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { DemoModeLauncher } from "@/components/executive/DemoModeLauncher";
import { NeuralBackdrop } from "./NeuralBackdrop";
import { Vision2030Seal } from "./Vision2030Seal";

type Props = {
  onOpenCinema: () => void;
  onOpenDepartments: () => void;
  onReplayGreeting: () => void;
};

export function AriaPremiumHero({ onOpenCinema, onOpenDepartments, onReplayGreeting }: Props) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const Arrow = ar ? ArrowLeft : ArrowRight;

  // Magnetic-hover state for the primary CTA — subtle, cursor-only.
  const primaryRef = useRef<HTMLAnchorElement | null>(null);
  const [mag, setMag] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const onPrimaryMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = primaryRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    setMag({ x: Math.max(-6, Math.min(6, dx * 0.08)), y: Math.max(-4, Math.min(4, dy * 0.08)) });
  };
  const onPrimaryLeave = () => setMag({ x: 0, y: 0 });

  // Right-column parallax for the ARIA holographic frame.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const onStageMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -ny * 4, ry: nx * 5 });
  };
  const onStageLeave = () => setTilt({ rx: 0, ry: 0 });

  // Animated statistics — counts up once when hero enters view.
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReveal(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? "الواجهة التنفيذية لآريا" : "ARIA executive hero"}
      className="relative isolate overflow-hidden"
    >
      {/* Neural animated stage — sits above the global backdrop, below content. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <NeuralBackdrop className="absolute inset-0 h-full w-full opacity-90" />
        {/* Aurora glow bands */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 55% at 50% 0%, rgba(0,212,255,0.16), transparent 70%), radial-gradient(50% 50% at 80% 20%, rgba(16,185,129,0.08), transparent 70%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#04070F] via-[#04070F]/60 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-5 py-10 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:py-24">
        {/* ═══ LEFT — Executive copy ═══ */}
        <div
          className={
            "flex flex-col " +
            (reveal ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3") +
            " transition-all duration-700 ease-out motion-reduce:transition-none"
          }
        >
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/40 bg-[#061A2E]/70 px-3 py-1 shadow-[0_0_18px_rgba(58,232,255,0.28)] backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3AE8FF] opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3AE8FF]" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#DDF7FF]">
                {ar ? "آريا نشطة" : "ARIA · Live"}
              </span>
            </span>
            <Vision2030Seal />
          </div>

          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#3AE8FF]/85">
            NEXIOS AI OS
          </p>

          <h1
            className={
              "text-balance font-bold tracking-tight text-white " +
              (ar
                ? "text-[clamp(2.1rem,6.4vw,4.4rem)] leading-[1.08]"
                : "text-[clamp(2rem,6vw,4.2rem)] leading-[1.05]")
            }
          >
            {ar ? (
              <>
                <span className="block">ARIA</span>
                <span className="mt-2 block bg-gradient-to-l from-[#3AE8FF] via-[#7DF0FF] to-white bg-clip-text text-transparent">
                  الذكاء التنفيذي الجديد
                </span>
                <span className="mt-2 block text-[0.6em] font-medium text-white/70">
                  لإدارة وتشغيل المؤسسات
                </span>
              </>
            ) : (
              <>
                <span className="block">ARIA</span>
                <span className="mt-2 block bg-gradient-to-r from-[#3AE8FF] via-[#7DF0FF] to-white bg-clip-text text-transparent">
                  The Executive Intelligence
                </span>
                <span className="mt-2 block text-[0.6em] font-medium text-white/70">
                  for the next generation of enterprises
                </span>
              </>
            )}
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            {ar
              ? "نظام تشغيل ذكي واحد يوحّد الأمن الصناعي، وكلاء الذكاء، والتوأم الرقمي — بصوت تنفيذي واحد وذاكرة حية."
              : "One intelligent operating system that unifies industrial security, AI agents, and the live digital twin — with a single executive voice and living memory."}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to="/os"
              ref={primaryRef}
              onMouseMove={onPrimaryMove}
              onMouseLeave={onPrimaryLeave}
              style={{ transform: `translate3d(${mag.x}px, ${mag.y}px, 0)` }}
              className="group relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#3AE8FF] via-[#5CEEFF] to-[#3AE8FF] px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[#061A2E] shadow-[0_10px_40px_-10px_rgba(58,232,255,0.75)] transition-transform duration-200 ease-out will-change-transform hover:shadow-[0_18px_60px_-12px_rgba(58,232,255,0.95)] active:scale-[0.98] motion-reduce:transform-none"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
              <span>{ar ? "بدء العملية" : "Start Operation"}</span>
              <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Link>

            <button
              type="button"
              onClick={onOpenCinema}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#3AE8FF]/40 bg-white/[0.04] px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[#DDF7FF] backdrop-blur-md transition hover:border-[#3AE8FF]/80 hover:bg-[#3AE8FF]/10"
            >
              <Play className="h-4 w-4" />
              {ar ? "جسر القيادة التنفيذي" : "Executive Bridge"}
            </button>

            <button
              type="button"
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent("aria:open")); } catch { /* noop */ }
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md transition hover:border-[#3AE8FF]/60 hover:bg-[#3AE8FF]/10"
            >
              <Sparkles className="h-4 w-4 text-[#3AE8FF]" />
              {ar ? "ابدأ محادثة آريا" : "Talk to ARIA"}
            </button>
          </div>

          {/* Utility row */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenDepartments}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85 transition hover:border-[#3AE8FF]/60 hover:bg-[#3AE8FF]/10"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>{ar ? "نوافذ الإدارات" : "Departments"}</span>
            </button>
            <DemoModeLauncher />
            <button
              type="button"
              onClick={onReplayGreeting}
              aria-label={ar ? "استمع للتعريف" : "Play greeting"}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3AE8FF] transition hover:bg-[#3AE8FF]/20"
            >
              <span aria-hidden>🔊</span>
              <span>{ar ? "استمع للتعريف" : "Play greeting"}</span>
            </button>
          </div>

          {/* Trust + animated stats */}
          <dl
            aria-label={ar ? "قراءات النظام" : "System readouts"}
            className="mt-10 grid grid-cols-3 gap-4 border-t border-[#3AE8FF]/15 pt-6"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {[
              { k: ar ? "وكلاء تنفيذيون" : "Agents",     v: "14+" },
              { k: ar ? "معدل المزامنة"   : "Sync Rate", v: "99.9%" },
              { k: ar ? "زمن الاستجابة"   : "Latency",   v: "<400ms" },
            ].map((s, i) => (
              <div key={s.k} className={i === 1 ? "border-x border-[#3AE8FF]/12 px-3" : "px-1"}>
                <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">{s.k}</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-[#DDF7FF] sm:text-xl">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ═══ RIGHT — ARIA holographic stage ═══
             The global backdrop supplies the figure. This column is a
             framed glass window that catches her presence with rings,
             particles, reflections, and subtle mouse parallax. */}
        <div
          ref={stageRef}
          onMouseMove={onStageMove}
          onMouseLeave={onStageLeave}
          className="relative mx-auto aspect-[4/5] w-full max-w-[520px] select-none"
          style={{ perspective: "1200px" }}
          aria-hidden
        >
          <div
            className="relative h-full w-full rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-[0_40px_120px_-40px_rgba(0,212,255,0.55),inset_0_0_60px_rgba(58,232,255,0.08)] backdrop-blur-2xl transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
          >
            {/* Neural ring 1 */}
            <div
              className="absolute left-1/2 top-1/2 h-[86%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3AE8FF]/30"
              style={{ boxShadow: "0 0 60px rgba(58,232,255,0.25), inset 0 0 40px rgba(58,232,255,0.12)" }}
            />
            {/* Neural ring 2 — slow rotation */}
            <div
              className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#3AE8FF]/25 motion-reduce:hidden"
              style={{ animation: "aria-ring-spin 40s linear infinite" }}
            />
            {/* Executive lighting sweep */}
            <div
              className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-70 mix-blend-screen motion-reduce:opacity-40"
              style={{
                background:
                  "conic-gradient(from 210deg at 50% 40%, rgba(58,232,255,0.0) 0deg, rgba(58,232,255,0.35) 60deg, rgba(16,185,129,0.15) 120deg, rgba(58,232,255,0.0) 220deg)",
                filter: "blur(24px)",
                animation: "aria-lightsweep 22s linear infinite",
              }}
            />
            {/* Glass reflection highlight */}
            <div
              className="pointer-events-none absolute inset-x-6 top-6 h-24 rounded-full opacity-40"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.35), transparent)" }}
            />
            {/* Base plate glow */}
            <div
              className="pointer-events-none absolute inset-x-8 bottom-6 h-16 rounded-full opacity-70"
              style={{ background: "radial-gradient(50% 100% at 50% 100%, rgba(58,232,255,0.35), transparent 70%)", filter: "blur(6px)" }}
            />
            {/* Corner brackets — HUD styling */}
            {(["tl", "tr", "bl", "br"] as const).map((c) => (
              <span
                key={c}
                aria-hidden
                className={
                  "absolute h-6 w-6 border-[#3AE8FF]/70 " +
                  (c === "tl" ? "left-3 top-3 border-l border-t rounded-tl-lg " : "") +
                  (c === "tr" ? "right-3 top-3 border-r border-t rounded-tr-lg " : "") +
                  (c === "bl" ? "left-3 bottom-3 border-l border-b rounded-bl-lg " : "") +
                  (c === "br" ? "right-3 bottom-3 border-r border-b rounded-br-lg " : "")
                }
              />
            ))}
          </div>

          {/* Orbiting particles */}
          <div className="pointer-events-none absolute inset-0 motion-reduce:hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 block h-1.5 w-1.5 rounded-full bg-[#3AE8FF]"
                style={{
                  boxShadow: "0 0 12px rgba(58,232,255,0.9)",
                  transform: `translate(-50%,-50%) rotate(${i * 72}deg) translateY(-42%)`,
                  animation: `aria-orbit ${18 + i * 3}s linear infinite`,
                  transformOrigin: "0 0",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aria-ring-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes aria-lightsweep { to { transform: rotate(360deg); } }
        @keyframes aria-orbit {
          from { transform: translate(-50%, -50%) rotate(0deg) translateY(-42%); }
          to   { transform: translate(-50%, -50%) rotate(360deg) translateY(-42%); }
        }
      `}</style>
    </section>
  );
}

export default AriaPremiumHero;
