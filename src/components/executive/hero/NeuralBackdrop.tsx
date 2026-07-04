/**
 * NeuralBackdrop — GPU-accelerated animated neural gradient + particle field
 * for the ARIA premium hero. Canvas 2D with requestAnimationFrame; pauses on
 * `prefers-reduced-motion` and when the tab is hidden. No external deps.
 *
 * Palette: Deep Midnight → Electric Blue → Vision Cyan, with sparse
 * Digital Emerald accents. Motion budget: single RAF loop, ~60fps target,
 * particles capped by viewport area for mobile perf.
 */
import { useEffect, useRef } from "react";

type P = {
  x: number; y: number; vx: number; vy: number;
  r: number; hue: number; life: number;
};

export function NeuralBackdrop({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: P[] = [];
    let t = 0;
    let running = true;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Density: ~1 particle per 9000 px², capped to keep mobile fast.
      const target = Math.min(90, Math.max(24, Math.floor((width * height) / 9000)));
      if (particles.length !== target) {
        particles = new Array(target).fill(0).map(() => spawn());
      }
    };

    const spawn = (): P => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: 0.6 + Math.random() * 1.6,
      hue: Math.random() < 0.08 ? 158 : 190 + Math.random() * 20, // sparse emerald, mostly cyan
      life: Math.random() * 1,
    });

    const drawAurora = () => {
      // Slowly drifting radial gradients ~ aurora, over deep midnight.
      const g1 = ctx.createRadialGradient(
        width * (0.32 + Math.sin(t * 0.00018) * 0.06),
        height * (0.28 + Math.cos(t * 0.00021) * 0.05),
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.75,
      );
      g1.addColorStop(0, "rgba(58,232,255,0.22)");
      g1.addColorStop(0.35, "rgba(0,120,220,0.10)");
      g1.addColorStop(1, "rgba(4,7,15,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);

      const g2 = ctx.createRadialGradient(
        width * (0.72 + Math.cos(t * 0.00013) * 0.05),
        height * (0.78 + Math.sin(t * 0.00017) * 0.04),
        0,
        width * 0.72,
        height * 0.78,
        Math.max(width, height) * 0.7,
      );
      g2.addColorStop(0, "rgba(16,185,129,0.10)");
      g2.addColorStop(0.5, "rgba(58,232,255,0.05)");
      g2.addColorStop(1, "rgba(4,7,15,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, width, height);
    };

    const step = () => {
      if (!running) return;
      t += 16;
      // Trail: soft fade to midnight for motion blur.
      ctx.fillStyle = "rgba(4,7,15,0.28)";
      ctx.fillRect(0, 0, width, height);
      drawAurora();

      // Update particles + draw neural links
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 0.004;
        if (p.x < -8) p.x = width + 8;
        else if (p.x > width + 8) p.x = -8;
        if (p.y < -8) p.y = height + 8;
        else if (p.y > height + 8) p.y = -8;
      }
      // Links (O(n²) but capped at ~90 particles).
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          const R = 120;
          if (d2 < R * R) {
            const alpha = (1 - Math.sqrt(d2) / R) * 0.28;
            ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 90%, 65%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      // Particles
      for (const p of particles) {
        const glow = 0.5 + 0.5 * Math.sin(p.life * 6.28);
        ctx.fillStyle = `hsla(${p.hue}, 95%, 70%, ${0.45 + glow * 0.35})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + glow * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(step);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const onVis = () => {
      running = document.visibilityState === "visible" && !reduce;
      if (running && rafRef.current == null) rafRef.current = requestAnimationFrame(step);
    };
    document.addEventListener("visibilitychange", onVis);

    if (reduce) {
      // Paint one still frame — no motion.
      drawAurora();
      for (const p of particles) {
        ctx.fillStyle = `hsla(${p.hue}, 95%, 70%, 0.6)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      running = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className ?? "absolute inset-0 h-full w-full"}
      style={{ display: "block" }}
    />
  );
}

export default NeuralBackdrop;
