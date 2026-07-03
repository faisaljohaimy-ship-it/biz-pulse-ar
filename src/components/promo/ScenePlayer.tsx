import { useEffect, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";

export interface Scene {
  id: string;
  start: number;
  end: number;
  render: (progress: number) => ReactNode;
}

interface ScenePlayerProps {
  scenes: Scene[];
  duration: number;
  onEnded?: () => void;
  paused?: boolean;
  onTimeUpdate?: (t: number) => void;
}

export function ScenePlayer({ scenes, duration, onEnded, paused, onTimeUpdate }: ScenePlayerProps) {
  const [t, setT] = useState(0);
  const raf = useRef<number | undefined>(undefined);
  const t0 = useRef<number | null>(null);
  const pausedAt = useRef<number>(0);
  const endedRef = useRef(false);

  useEffect(() => {
    if (paused) {
      if (raf.current) cancelAnimationFrame(raf.current);
      pausedAt.current = t;
      t0.current = null;
      return;
    }
    const tick = (now: number) => {
      if (t0.current === null) t0.current = now - pausedAt.current * 1000;
      const el = (now - t0.current) / 1000;
      const clamped = el > duration ? duration : el;
      setT(clamped);
      onTimeUpdate?.(clamped);
      if (el < duration) {
        raf.current = requestAnimationFrame(tick);
      } else if (!endedRef.current) {
        endedRef.current = true;
        onEnded?.();
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [duration, paused, onEnded, onTimeUpdate, t]);

  const reset = useCallback(() => {
    pausedAt.current = 0;
    t0.current = null;
    endedRef.current = false;
    setT(0);
  }, []);

  return (
    <TimelineContainer time={t} duration={duration} onReset={reset}>
      {scenes.map((s) => {
        if (t < s.start || t > s.end + 0.5) return null;
        const p = Math.min(1, Math.max(0, (t - s.start) / (s.end - s.start)));
        return (
          <div key={s.id} className="absolute inset-0">
            {s.render(p)}
          </div>
        );
      })}
    </TimelineContainer>
  );
}

function TimelineContainer({
  children,
  time,
  duration,
  onReset,
}: {
  children: ReactNode;
  time: number;
  duration: number;
  onReset: () => void;
}) {
  return (
    <div dir="rtl" className="fixed inset-0 overflow-hidden bg-[#04070F]">
      {children}
      {/* film grain + vignette */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.08]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 0 240px 40px rgba(0,0,0,0.85)" }}
      />
      {/* progress bar */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] bg-white/5">
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${(time / duration) * 100}%`, transition: "width 80ms linear" }}
        />
      </div>
      {time >= duration && (
        <button
          type="button"
          onClick={onReset}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-emerald-400/50 bg-black/60 px-5 py-2 text-sm text-emerald-300 backdrop-blur transition hover:bg-emerald-500/20"
        >
          ⟲ إعادة
        </button>
      )}
    </div>
  );
}
