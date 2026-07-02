/**
 * AmbientAuraLayer
 *
 * A quiet, GPU-friendly ambient layer that carries the executive
 * cinematic aesthetic (soft light beam + drifting cyan motes) into any
 * page as a decorative background. Fully non-interactive, respects
 * prefers-reduced-motion, and pauses when the tab is hidden.
 *
 * Usage:
 *   <div className="relative">
 *     <AmbientAuraLayer />
 *     ...content...
 *   </div>
 */
import { useEffect, useRef } from "react";

type Props = {
  /** motes count on desktop; halved on mobile */
  density?: number;
  /** 0..1 — overall opacity multiplier */
  intensity?: number;
  className?: string;
};

export function AmbientAuraLayer({ density = 42, intensity = 1, className }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let w = 0, h = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const mobile = window.innerWidth < 640;
    const count = Math.max(8, Math.round((mobile ? density * 0.5 : density)));

    type Mote = { x: number; y: number; vy: number; r: number; a: number; phase: number };
    const motes: Mote[] = Array.from({ length: count }, () => ({
      x: Math.random() * (w || 1),
      y: Math.random() * (h || 1),
      vy: 0.05 + Math.random() * 0.18,
      r: 0.6 + Math.random() * 1.6,
      a: 0.2 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
    }));

    let last = performance.now();
    let paused = document.hidden;
    const onVis = () => {
      paused = document.hidden;
      if (!paused && rafRef.current == null) {
        last = performance.now();
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    const loop = (t: number) => {
      if (paused) { rafRef.current = null; return; }
      const dt = Math.min(48, t - last); last = t;
      ctx.clearRect(0, 0, w, h);

      // vertical light shaft, very subtle
      const grad = ctx.createLinearGradient(w / 2, 0, w / 2, h);
      grad.addColorStop(0, `rgba(58,232,255,${(0.05 * intensity).toFixed(3)})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < motes.length; i++) {
        const p = motes[i];
        p.y += p.vy * (reduced ? 0 : dt * 0.06);
        p.phase += dt * 0.001;
        if (p.y - p.r > h) {
          p.y = -p.r;
          p.x = Math.random() * w;
        }
        const a = (p.a + 0.15 * Math.sin(p.phase)) * intensity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(170,238,255,${Math.max(0, a).toFixed(3)})`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [density, intensity]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={[
        "pointer-events-none absolute inset-0 h-full w-full",
        className ?? "",
      ].join(" ")}
    />
  );
}
