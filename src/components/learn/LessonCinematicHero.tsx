/**
 * LessonCinematicHero — animated motion-graphics hero used when a lesson has
 * no dedicated cinematic video file. Layered gradient orbs, a slow-drifting
 * grid, and a live "signal" bar convey a broadcast/HUD aesthetic.
 */
import { useEffect, useState } from "react";
import { GraduationCap, Radio } from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
  order: number;
  lang: "ar" | "en";
}

export function LessonCinematicHero({ title, subtitle, order, lang }: Props) {
  const ar = lang === "ar";
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 100), 90);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="relative aspect-video overflow-hidden rounded-3xl border border-cyan-400/25 bg-[#03101D] shadow-[0_20px_80px_-30px_rgba(0,212,255,0.35)]"
    >
      {/* Grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.08) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          transform: `translate3d(${(tick % 44) * 0.4}px, ${(tick % 44) * 0.2}px, 0)`,
          transition: "transform 0.2s linear",
        }}
      />
      {/* Orbs */}
      <div aria-hidden className="absolute -left-24 top-1/3 h-[420px] w-[420px] rounded-full bg-cyan-500/25 blur-[120px] animate-[pulse_6s_ease-in-out_infinite]" />
      <div aria-hidden className="absolute -right-16 bottom-0 h-[360px] w-[360px] rounded-full bg-blue-500/20 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />

      {/* HUD frame */}
      <div aria-hidden className="pointer-events-none absolute inset-4 rounded-2xl border border-cyan-400/20" />
      <div aria-hidden className="pointer-events-none absolute inset-4 rounded-2xl border-2 border-transparent [background:linear-gradient(120deg,transparent_20%,rgba(0,212,255,0.15)_40%,transparent_60%)_border-box]" style={{ maskImage: "linear-gradient(#000 0 0)" }} />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-between p-8">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-cyan-200 backdrop-blur">
            <Radio className="h-3 w-3 animate-pulse" />
            NEXIOS · {ar ? "بث تنفيذي مباشر" : "Executive Live"}
          </div>
          <div className="text-right font-mono text-[10px] tracking-widest text-cyan-200/70">
            LESSON · {String(order).padStart(2, "0")}
          </div>
        </div>

        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-md bg-cyan-400/15 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
            <GraduationCap className="h-3 w-3" />
            {ar ? "جسر المعرفة" : "Knowledge Bridge"}
          </div>
          <h2 className="text-3xl font-light leading-tight text-white sm:text-4xl md:text-5xl">
            {title}
          </h2>
          <p className="max-w-xl text-sm text-white/70 sm:text-base">{subtitle}</p>
        </div>

        {/* Signal bars */}
        <div className="flex items-end gap-1" dir="ltr">
          {Array.from({ length: 32 }).map((_, i) => {
            const h = 8 + ((Math.sin((tick + i * 4) / 4) + 1) / 2) * 24;
            return (
              <span
                key={i}
                className="rounded-sm bg-gradient-to-t from-cyan-500/60 to-cyan-300"
                style={{ height: `${h}px`, width: 3, opacity: 0.5 + (i % 5) * 0.1 }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
