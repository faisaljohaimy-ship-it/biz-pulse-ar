import { useEffect, useRef } from "react";

/**
 * Animated 2D "data chaos converging" canvas. Fragmented system tokens drift
 * chaotically then get pulled into the central gold core, leaving trailing
 * light streaks. Pure canvas — zero 3D bundle cost, respects reduced motion.
 */
export function ChaosCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;
    type P = {
      x: number; y: number; vx: number; vy: number;
      r: number; a: number; c: string; px: number; py: number;
      drawn: boolean;
    };
    let parts: P[] = [];

    const palette = ["#f5b454", "#5cbdff", "#a78bfa", "#ffffff"];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      cx = w / 2;
      cy = h / 2;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(80, Math.floor((w * h) / 9000));
      parts = Array.from({ length: n }, () => spawn());
    };

    const spawn = (): P => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(w, h) * (0.45 + Math.random() * 0.3);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      return {
        x, y, px: x, py: y,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: 0.6 + Math.random() * 1.4,
        a: 0.4 + Math.random() * 0.5,
        c: palette[Math.floor(Math.random() * palette.length)],
        drawn: false,
      };
    };

    const tick = () => {
      // motion-blur fade
      ctx.fillStyle = "rgba(4, 6, 13, 0.18)";
      ctx.fillRect(0, 0, w, h);

      // gold core glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
      g.addColorStop(0, "rgba(245,180,84,0.5)");
      g.addColorStop(1, "rgba(245,180,84,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - 120, cy - 120, 240, 240);

      for (const p of parts) {
        p.px = p.x;
        p.py = p.y;
        // pull toward center
        const dx = cx - p.x;
        const dy = cy - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = 0.045;
        p.vx += (dx / d) * pull;
        p.vy += (dy / d) * pull;
        // chaotic jitter
        p.vx += (Math.random() - 0.5) * 0.25;
        p.vy += (Math.random() - 0.5) * 0.25;
        // friction
        p.vx *= 0.93;
        p.vy *= 0.93;
        p.x += p.vx;
        p.y += p.vy;

        // streak
        ctx.strokeStyle = p.c;
        ctx.globalAlpha = p.a * 0.9;
        ctx.lineWidth = p.r;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        if (d < 40) {
          // consumed → respawn far out
          Object.assign(p, spawn());
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };

    resize();
    if (!reduce) raf = requestAnimationFrame(tick);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
